import { AyahTranslation } from '../models/AyahTranslation.js';
import { isDbConnected } from '../db.js';

/**
 * Verse-level English translations, read from the `ayahTranslations` cache and
 * filled from quranenc.com on a miss.
 *
 * The word-by-word glosses in the `translations` collection read like a list
 * ("In (the) name — of Allah — the Most Gracious"), which is fine beneath a
 * short phrase but poor beneath a whole verse.
 */

export const DEFAULT_EDITION = 'english_saheeh';

const UPSTREAM_URL = 'https://quranenc.com/api/v1/translation/aya';
const FETCH_CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 8000;

function cacheKey(surahId, ayahNo) {
  return `${surahId}-${ayahNo}`;
}

/** quranenc prefixes the verse number, e.g. "255. Allah! There is none...". */
function stripVerseNumber(translation) {
  return String(translation ?? '')
    .replace(/^\s*\d+\.\s*/, '')
    .trim();
}

async function fetchFromUpstream(surahId, ayahNo, edition) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${UPSTREAM_URL}/${edition}/${surahId}/${ayahNo}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const translation = stripVerseNumber(data?.result?.translation);
    return translation || null;
  } catch (err) {
    console.warn(
      `[ayah-translation] ${surahId}:${ayahNo} fetch failed: ${err?.message ?? err}`
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Run `worker` over `items` with at most `limit` in flight at a time. */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(runners);
  return results;
}

/**
 * Translations for a batch of ayahs, keyed by `${surahId}-${ayahNo}`.
 *
 * Cache hits cost one query for the whole batch. Misses are fetched upstream
 * in parallel (bounded) and written back; an ayah that can't be resolved is
 * simply absent from the map rather than failing the request.
 */
export async function fetchAyahTranslations(ayahRefs, edition = DEFAULT_EDITION) {
  const map = new Map();
  if (!Array.isArray(ayahRefs) || ayahRefs.length === 0) return map;

  const wanted = new Map();
  for (const { surahId, ayahNo } of ayahRefs) {
    const s = Number(surahId);
    const a = Number(ayahNo);
    if (!Number.isInteger(s) || !Number.isInteger(a)) continue;
    wanted.set(cacheKey(s, a), { surahId: s, ayahNo: a });
  }
  if (wanted.size === 0) return map;

  const refs = [...wanted.values()];

  if (isDbConnected()) {
    const cached = await AyahTranslation.find({
      edition,
      $or: refs.map((r) => ({ surahId: r.surahId, ayahNo: r.ayahNo })),
    }).lean();
    for (const doc of cached) {
      if (doc.translation) {
        map.set(cacheKey(doc.surahId, doc.ayahNo), doc.translation);
      }
    }
  }

  const missing = refs.filter((r) => !map.has(cacheKey(r.surahId, r.ayahNo)));
  if (missing.length === 0) return map;

  const fetched = await mapWithConcurrency(
    missing,
    FETCH_CONCURRENCY,
    async (ref) => ({
      ...ref,
      translation: await fetchFromUpstream(ref.surahId, ref.ayahNo, edition),
    })
  );

  const writes = [];
  for (const { surahId, ayahNo, translation } of fetched) {
    if (!translation) continue;
    map.set(cacheKey(surahId, ayahNo), translation);
    writes.push({
      updateOne: {
        filter: { surahId, ayahNo, edition },
        update: { $set: { translation, fetchedAt: new Date() } },
        upsert: true,
      },
    });
  }

  if (writes.length > 0 && isDbConnected()) {
    try {
      await AyahTranslation.bulkWrite(writes, { ordered: false });
    } catch (err) {
      // A failed cache write shouldn't fail the request — we already have the
      // translations in hand for this response.
      console.warn(`[ayah-translation] cache write failed: ${err?.message ?? err}`);
    }
  }

  return map;
}

export { cacheKey as ayahTranslationKey };
