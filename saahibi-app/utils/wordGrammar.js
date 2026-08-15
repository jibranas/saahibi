import { getApiBaseUrl } from './api';

const cache = new Map();
const BATCH_LIMIT = 40;

function refKey(ref) {
  return `${ref.surahId}:${ref.ayahNo}:${ref.wordNo}`;
}

/**
 * Batch-fetch word-level grammar (`/api/word-grammar`) for the given refs
 * (`{ surahId, ayahNo, wordNo }`). Returns a Map keyed by "surah:ayah:word".
 * Results (including misses) are cached for the session; network errors
 * resolve to an empty map for the uncached refs.
 */
export async function fetchWordGrammar(refs) {
  const valid = (refs ?? []).filter(
    (r) => r && r.surahId != null && r.ayahNo != null && r.wordNo != null
  );

  const result = new Map();
  const missing = [];
  for (const ref of valid) {
    const key = refKey(ref);
    if (cache.has(key)) {
      result.set(key, cache.get(key));
    } else {
      missing.push(ref);
    }
  }

  const base = getApiBaseUrl();
  for (let i = 0; i < missing.length; i += BATCH_LIMIT) {
    const batch = missing.slice(i, i + BATCH_LIMIT);
    const refsParam = batch.map(refKey).join(',');
    try {
      const res = await fetch(
        `${base}/api/word-grammar?refs=${encodeURIComponent(refsParam)}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const word of data.words ?? []) {
        const key = refKey(word);
        const value = word.found ? word : null;
        cache.set(key, value);
        result.set(key, value);
      }
    } catch {
      // network error — leave these refs unresolved (retried next time)
    }
  }

  return result;
}

export function wordGrammarKey(ref) {
  return refKey(ref);
}
