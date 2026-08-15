import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import {
  ensureParticleIndex,
  glossForParticle,
} from '../../lib/particles.js';
import { allSegments } from '../../lib/morphologyStore.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';

const router = Router();

/**
 * Particles (standalone and attached prefixes), excluding muqattaʿāt and DET:
 *   - PartOfSpeech === 'P'
 *   - deduped by particleDedupeKey (keeps short vowels; collapses sukun/shadda/marks)
 *   - occurrenceCount from segment tallies
 */
function examplesFromParticleIndex(index) {
  const examples = [];

  for (const entry of index.values()) {
    const { first, text, key, count, attached, lemma } = entry;
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
      attached,
      lemma,
    });
  }

  examples.sort((a, b) => {
    if (a.surahId !== b.surahId) return a.surahId - b.surahId;
    if (a.ayahNo !== b.ayahNo) return a.ayahNo - b.ayahNo;
    return a.words[0].wordNo - b.words[0].wordNo;
  });

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

    const standaloneRefs = limited
      .filter((ex) => !ex.attached)
      .map((ex) => ({
        surahId: ex.surahId,
        ayahNo: ex.ayahNo,
        wordNo: ex.words?.[0]?.wordNo,
      }));
    const translationMap = await fetchTranslationsForWords(standaloneRefs);

    for (const ex of limited) {
      const gloss = glossForParticle(ex.particleKey, ex.lemma);
      if (ex.attached) {
        ex.translations = gloss;
      } else {
        const wordNo = ex.words?.[0]?.wordNo;
        ex.translations =
          translationMap.get(wordKey(ex.surahId, ex.ayahNo, wordNo)) ||
          gloss ||
          null;
      }
      delete ex.attached;
      delete ex.lemma;
    }

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
