import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import {
  ensureParticleIndex,
  glossForParticle,
  PARTICLE_GLOSS_EN,
} from '../../lib/particles.js';
import { allSegments } from '../../lib/morphologyStore.js';

const router = Router();

/**
 * The 11 table particles (whole word, or a leading prefix on a host word):
 *   - looked up on the bare-particle index by particleDedupeKey
 *   - emitted in table order with the lesson English gloss
 *   - occurrenceCount from those tallies (no pronoun suffixes, no segments
 *     buried inside another word such as ذَٰلِكَ)
 */
function examplesFromParticleIndex(index) {
  const examples = [];

  for (const key of PARTICLE_GLOSS_EN.keys()) {
    const entry = index.get(key);
    if (!entry) continue;

    const { first, text, count } = entry;
    examples.push({
      surahId: first.surahId,
      ayahNo: first.ayahNo,
      text,
      particleKey: key,
      occurrenceCount: count,
      phraseRef: `particle:${key}`,
      words: [
        {
          wordNo: first.wordNo,
          grammar: { partOfSpeech: 'P' },
        },
      ],
      translations: glossForParticle(key),
    });
  }

  return examples;
}

router.get('/', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    const rawLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.floor(rawLimit)
        : Number.POSITIVE_INFINITY;

    const index = await ensureParticleIndex();
    const examples = examplesFromParticleIndex(index);
    const limited = examples.slice(0, limit);

    res.json({
      count: limited.length,
      totalMatches: examples.length,
      scannedSegments: allSegments().length,
      limit,
      examples: limited,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
