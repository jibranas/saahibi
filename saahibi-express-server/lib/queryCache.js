/**
 * Serialized `/api/queries/*` responses, keyed by request URL.
 *
 * A rule's output is a pure function of the corpus (static), the request's
 * surah/limit params, and the visibility denylist — so once a lesson has been
 * computed there is no reason to scan 130k segments and re-serialize ~600KB of
 * JSON for the next reader. Admin toggles clear the whole cache.
 *
 * Entries are evicted least-recently-used once the total payload exceeds
 * `MAX_BYTES`; the ~85 rules come to roughly 50MB if every one is visited.
 */

const MAX_BYTES = 64 * 1024 * 1024;

/** @type {Map<string, { body: string, bytes: number }>} */
const entries = new Map();
let totalBytes = 0;

export function getCachedQuery(key) {
  const hit = entries.get(key);
  if (!hit) return null;
  // Refresh recency: Map preserves insertion order, so re-inserting moves the
  // entry to the end and makes the first key the least recently used.
  entries.delete(key);
  entries.set(key, hit);
  return hit.body;
}

export function setCachedQuery(key, body) {
  const bytes = Buffer.byteLength(body);
  if (bytes > MAX_BYTES) return;

  const existing = entries.get(key);
  if (existing) {
    totalBytes -= existing.bytes;
    entries.delete(key);
  }

  entries.set(key, { body, bytes });
  totalBytes += bytes;

  while (totalBytes > MAX_BYTES) {
    const oldest = entries.keys().next();
    if (oldest.done) break;
    const evicted = entries.get(oldest.value);
    entries.delete(oldest.value);
    totalBytes -= evicted.bytes;
  }
}

export function invalidateQueryCache() {
  entries.clear();
  totalBytes = 0;
}

export function queryCacheStats() {
  return { entries: entries.size, bytes: totalBytes };
}
