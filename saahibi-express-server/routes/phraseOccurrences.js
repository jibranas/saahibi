import { Router } from 'express';

import { isDbConnected } from '../db.js';
import {
  ayahTranslationKey,
  fetchAyahTranslations,
} from '../lib/ayahTranslations.js';
import {
  ensureParticleIndex,
  findParticleOccurrences,
} from '../lib/particles.js';
import {
  describePhrase,
  ensureCorpus,
  findOccurrences,
  getAyahWords,
} from '../lib/quranCorpus.js';

const router = Router();

const MAX_REFS = 10;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const PARTICLE_REF_PREFIX = 'particle:';
const EXACT_REF_PREFIX = 'exact:';

/**
 * Parse `2:255:1,2:255:2`, `exact:2:255:1`, or `exact:2:255:1@GEN` into
 * ordered word references plus an optional match mode and nominal-case filter.
 */
function parseRefs(raw) {
  if (!raw) return null;
  let source = String(raw).trim();
  let mode = 'normalized';
  if (source.startsWith(EXACT_REF_PREFIX)) {
    mode = 'exact';
    source = source.slice(EXACT_REF_PREFIX.length);
  }

  let nominalCase = null;
  const caseAt = source.lastIndexOf('@');
  if (caseAt !== -1) {
    const maybeCase = source.slice(caseAt + 1).trim().toUpperCase();
    if (/^(NOM|ACC|GEN)$/.test(maybeCase)) {
      nominalCase = maybeCase;
      source = source.slice(0, caseAt);
    }
  }

  const parts = source
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_REFS) return null;

  const refs = [];
  for (const part of parts) {
    const bits = part.split(':').map(Number);
    if (bits.length !== 3 || bits.some((n) => !Number.isInteger(n) || n <= 0)) {
      return null;
    }
    refs.push({ surahId: bits[0], ayahNo: bits[1], wordNo: bits[2] });
  }

  // All words must come from the same ayah — a phrase can't span verses.
  const { surahId, ayahNo } = refs[0];
  if (refs.some((r) => r.surahId !== surahId || r.ayahNo !== ayahNo)) return null;

  return { refs, mode, nominalCase };
}

/** `particle:<key>` from phraseRef, or a bare particleKey query value. */
function parseParticleKey(raw) {
  if (raw == null) return null;
  let key = String(raw).trim();
  if (!key) return null;
  if (key.startsWith(PARTICLE_REF_PREFIX)) {
    key = key.slice(PARTICLE_REF_PREFIX.length);
  }
  return key || null;
}

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

function buildOccurrenceRows(pageRefs) {
  return pageRefs.map(({ surahId, ayahNo, wordNo }) => ({
    surahId,
    ayahNo,
    startWordNo: wordNo,
    endWordNo: wordNo,
    words: getAyahWords(surahId, ayahNo).map((w) => ({
      wordNo: w.wordNo,
      text: w.text,
      matched: w.wordNo === wordNo,
    })),
  }));
}

/**
 * GET /api/phrase-occurrences?refs=2:255:1,2:255:2&offset=0&limit=25
 * GET /api/phrase-occurrences?refs=exact:2:255:1&offset=0&limit=25
 * GET /api/phrase-occurrences?particleKey=بِ&offset=0&limit=25
 * GET /api/phrase-occurrences?refs=particle:بِ&offset=0&limit=25
 *
 * Default word phrases match on letters only. `exact:` keeps tanween / short
 * vowels. Particle keys match morphology segments (including attached
 * prefixes) and highlight the host word in each ayah.
 */
router.get('/', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const offset = clampInt(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const limit = clampInt(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);

    const particleKey =
      parseParticleKey(req.query.particleKey) ||
      parseParticleKey(
        typeof req.query.refs === 'string' &&
          req.query.refs.startsWith(PARTICLE_REF_PREFIX)
          ? req.query.refs
          : null
      );

    if (particleKey) {
      await Promise.all([ensureCorpus(), ensureParticleIndex()]);

      const { total, refs: pageRefs, entry } = findParticleOccurrences(
        particleKey,
        { offset, limit }
      );
      if (!entry) {
        res.status(404).json({ error: 'Particle not found' });
        return;
      }

      const translations = await fetchAyahTranslations(pageRefs);
      const occurrences = buildOccurrenceRows(pageRefs).map((row) => ({
        ...row,
        translation:
          translations.get(ayahTranslationKey(row.surahId, row.ayahNo)) ?? null,
      }));

      res.json({
        phrase: entry.text,
        normalized: particleKey,
        particleKey,
        wordCount: 1,
        total,
        offset,
        limit,
        occurrences,
      });
      return;
    }

    const parsed = parseRefs(req.query.refs);
    if (!parsed) {
      res.status(400).json({
        error:
          `refs is required: comma-separated surah:ayah:word triples from one ayah (max ${MAX_REFS}), ` +
          'optionally prefixed with exact:, or particleKey / refs=particle:<key>',
      });
      return;
    }

    const { refs, mode, nominalCase } = parsed;
    await ensureCorpus();

    const phrase = describePhrase(refs);
    if (!phrase) {
      res.status(404).json({ error: 'Phrase not found in the corpus' });
      return;
    }

    const { total, refs: pageRefs } = findOccurrences(phrase, {
      offset,
      limit,
      mode,
      nominalCase,
    });

    const translations = await fetchAyahTranslations(pageRefs);

    const occurrences = pageRefs.map(({ surahId, ayahNo, wordNo }) => {
      const matchedWordNos = new Set(phrase.offsets.map((d) => wordNo + d));
      return {
        surahId,
        ayahNo,
        startWordNo: wordNo,
        endWordNo: wordNo + phrase.offsets[phrase.offsets.length - 1],
        words: getAyahWords(surahId, ayahNo).map((w) => ({
          wordNo: w.wordNo,
          text: w.text,
          matched: matchedWordNos.has(w.wordNo),
        })),
        translation: translations.get(ayahTranslationKey(surahId, ayahNo)) ?? null,
      };
    });

    res.json({
      phrase: phrase.exact,
      normalized: phrase.normalized,
      matchMode: mode,
      wordCount: phrase.wordCount,
      total,
      offset,
      limit,
      occurrences,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
