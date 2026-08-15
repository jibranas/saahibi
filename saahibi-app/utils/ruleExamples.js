import { getApiBaseUrl } from './api';
import { clearPhraseOccurrencesCache } from './phraseOccurrences';

/**
 * Session cache for lesson payloads (`/api/queries/...`).
 *
 * A lesson's examples don't change while the app is open, but the user moves
 * between the intro and the examples screen and on to the next lesson, which
 * would otherwise refetch and re-parse the same few hundred KB each time.
 * Kept small because a parsed lesson is a few megabytes of objects.
 *
 * Bump CACHE_VERSION when the server response shape / matching semantics
 * change so Fast Refresh sessions don't keep serving stale cards.
 */

const CACHE_VERSION = 3;
const MAX_ENTRIES = 4;

/** @type {Map<string, any>} */
const cache = new Map();
/** @type {Map<string, Promise<any>>} */
const inflight = new Map();

function cacheKey(endpoint) {
  return `${CACHE_VERSION}:${endpoint}`;
}

function remember(endpoint, data) {
  const key = cacheKey(endpoint);
  cache.delete(key);
  cache.set(key, data);
  while (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

/** Cached payload if we already have it, otherwise `null`. */
export function peekRuleExamples(endpoint) {
  if (!endpoint) return null;
  const key = cacheKey(endpoint);
  if (!cache.has(key)) return null;
  const data = cache.get(key);
  // Refresh recency so an entry in active use isn't the next one evicted.
  remember(endpoint, data);
  return data;
}

/**
 * Fetch a lesson payload, sharing one request between concurrent callers and
 * reusing the result for the rest of the session.
 */
export function fetchRuleExamples(endpoint) {
  const cached = peekRuleExamples(endpoint);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(endpoint);
  if (pending) return pending;

  const request = fetch(`${getApiBaseUrl()}${endpoint}`, { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      remember(endpoint, data);
      return data;
    })
    .finally(() => {
      inflight.delete(endpoint);
    });

  inflight.set(endpoint, request);
  return request;
}

/**
 * Warm the cache in the background. Used while the user is reading a lesson
 * intro, so the examples screen has its data by the time they tap through.
 */
export function prefetchRuleExamples(endpoint) {
  if (!endpoint || peekRuleExamples(endpoint) || inflight.has(endpoint)) return;
  fetchRuleExamples(endpoint).catch(() => {
    // Best effort — the screen will retry and surface any real error.
  });
}

/** Drop everything; the admin panel can change what a lesson contains. */
export function clearRuleExamplesCache() {
  cache.clear();
  inflight.clear();
  clearPhraseOccurrencesCache();
}
