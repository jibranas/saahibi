import { getApiBaseUrl } from './api';

const cache = new Map();

function cacheKey({ surahId, ayahNo, wordNo, root }) {
  const compact = String(root ?? '').trim();
  if (compact) return `root:${compact}`;
  if (surahId != null && ayahNo != null && wordNo != null) {
    return `word:${surahId}-${ayahNo}-${wordNo}`;
  }
  return null;
}

/**
 * Fetch root header (letters, transliteration, meanings) for a word or compact root.
 * Returns null when not found or on network error.
 */
export async function fetchRootMeaning({ surahId, ayahNo, wordNo, root }) {
  const key = cacheKey({ surahId, ayahNo, wordNo, root });
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  const base = getApiBaseUrl();
  const compact = String(root ?? '').trim();
  const url =
    compact && compact.length > 0
      ? `${base}/api/root-meaning/by-root?root=${encodeURIComponent(compact)}`
      : `${base}/api/root-meaning/by-word?surah=${surahId}&ayah=${ayahNo}&word=${wordNo}`;

  try {
    const res = await fetch(url);
    if (res.status === 404) {
      cache.set(key, null);
      return null;
    }
    if (!res.ok) return null;

    const data = await res.json();
    cache.set(key, data);
    return data;
  } catch {
    return null;
  }
}
