import { Router } from 'express';

import { getCurriculumPayload } from '../lib/curriculumPayload.js';

const router = Router();

/**
 * The lesson manifest the app renders its chapter and lesson lists from.
 * Served with an ETag so a client holding the current version pays for
 * headers only rather than ~128KB of JSON on every launch.
 */
router.get('/', (req, res) => {
  const payload = getCurriculumPayload();
  const etag = `"${payload.version}"`;

  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'no-cache');

  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  res.json(payload);
});

export default router;
