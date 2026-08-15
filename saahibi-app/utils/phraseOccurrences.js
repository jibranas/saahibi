import { getApiBaseUrl } from './api';

const PAGE_SIZE = 25;
const PARTICLE_REF_PREFIX = 'particle:';
const EXACT_REF_PREFIX = 'exact:';

const cache = new Map();

function pageKey(phraseRef, offset) {
  return `${phraseRef}@${offset}`;
}

/**
 * Fetch one page of the ayahs containing a phrase or particle.
 *
 * `phraseRef` is either:
 *  - `surah:ayah:word,...` for letters-only whole-word phrases
 *  - `exact:surah:ayah:word,...` for vowelled / case-preserving matches
 *  - `particle:<key>` for morphology particle segments (including prefixes)
 *
 * Returns `{ total, offset, limit, occurrences }`, or `null` on failure so
 * the caller can show an error without crashing the card.
 */
export async function fetchPhraseOccurrences(
  phraseRef,
  { offset = 0, limit = PAGE_SIZE } = {}
) {
  const ref = String(phraseRef ?? '').trim();
  if (!ref) return null;

  const key = pageKey(ref, offset);
  if (cache.has(key)) return cache.get(key);

  let url;
  if (ref.startsWith(PARTICLE_REF_PREFIX)) {
    const particleKey = ref.slice(PARTICLE_REF_PREFIX.length);
    url =
      `${getApiBaseUrl()}/api/phrase-occurrences` +
      `?particleKey=${encodeURIComponent(particleKey)}&offset=${offset}&limit=${limit}`;
  } else {
    // Pass `exact:…` through as-is; the API strips the prefix and sets mode.
    url =
      `${getApiBaseUrl()}/api/phrase-occurrences` +
      `?refs=${encodeURIComponent(ref)}&offset=${offset}&limit=${limit}`;
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

export function clearPhraseOccurrencesCache() {
  cache.clear();
}

export { PAGE_SIZE, EXACT_REF_PREFIX };
