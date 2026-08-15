import { Translation } from '../models/Translation.js';

/**
 * Word-by-word translations, held in memory.
 *
 * A rule route needs a translation for every word it returns, which for an
 * unbounded lesson is a couple of thousand words. Asking Mongo for those with
 * one `$or` clause per word was the single slowest step in a request; the
 * whole collection is only ~8MB, so it is loaded once instead.
 */

let store = null;
let loading = null;

/** Convenience: build the map key the same way `fetchTranslationsForWords` does. */
export function wordKey(surahId, ayahNo, wordNo) {
  return `${surahId}-${ayahNo}-${wordNo}`;
}

async function loadStore() {
  const startedAt = Date.now();

  await Translation.init();

  const docs = await Translation.find(
    {},
    { _id: 0, surah: 1, ayah: 1, word: 1, translations: 1 }
  ).lean();

  const byWord = new Map();
  for (const doc of docs) {
    byWord.set(wordKey(doc.surah, doc.ayah, doc.word), doc.translations || null);
  }

  console.log(
    `[translations] loaded ${byWord.size} words in ${Date.now() - startedAt}ms`
  );

  return byWord;
}

export function ensureTranslationStore() {
  if (store) return Promise.resolve(store);
  if (!loading) {
    loading = loadStore()
      .then((loaded) => {
        store = loaded;
        loading = null;
        return store;
      })
      .catch((err) => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

export function isTranslationStoreReady() {
  return store != null;
}

/**
 * Translations for a list of word references, as a Map keyed by
 * `${surahId}-${ayahNo}-${wordNo}` → translations object (e.g.
 * `{ en: "In (the) name" }`). Missing words are simply absent from the map;
 * callers can fall back to `null` as needed.
 */
export async function fetchTranslationsForWords(wordRefs) {
  if (!wordRefs || wordRefs.length === 0) return new Map();

  const byWord = await ensureTranslationStore();

  const map = new Map();
  for (const { surahId, ayahNo, wordNo } of wordRefs) {
    if (surahId == null || ayahNo == null || wordNo == null) continue;
    const key = wordKey(surahId, ayahNo, wordNo);
    if (map.has(key)) continue;
    const translations = byWord.get(key);
    if (translations !== undefined) map.set(key, translations);
  }
  return map;
}
