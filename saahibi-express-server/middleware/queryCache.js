import { getCachedQuery, setCachedQuery } from '../lib/queryCache.js';

/**
 * Serves `/api/queries/*` from the response cache, and records misses.
 *
 * Mounted *before* the visibility and occurrence middlewares so that its
 * `res.json` wrapper is the innermost one: by the time it runs, the body has
 * already been decorated with occurrence counts and stripped of hidden cards,
 * which is exactly what should be stored.
 *
 * `ETag` lets a client that already holds a lesson revalidate with a 304
 * instead of pulling the payload again.
 */

const CACHE_CONTROL = 'private, max-age=300, stale-while-revalidate=86400';

function send(res, body) {
  res.set('Cache-Control', CACHE_CONTROL);
  res.type('application/json').send(body);
}

export function queryCache(req, res, next) {
  if (req.method !== 'GET') return next();

  // `originalUrl` carries surah/limit/includeHidden, so variants never collide.
  const key = req.originalUrl;

  const hit = getCachedQuery(key);
  if (hit != null) {
    res.set('X-Saahibi-Cache', 'hit');
    send(res, hit);
    return;
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const cacheable =
      res.statusCode === 200 &&
      body &&
      typeof body === 'object' &&
      (Array.isArray(body.examples) || Array.isArray(body.patterns));

    if (!cacheable) return originalJson(body);

    const serialized = JSON.stringify(body);
    setCachedQuery(key, serialized);
    res.set('X-Saahibi-Cache', 'miss');
    send(res, serialized);
    return res;
  };

  next();
}

export default queryCache;
