import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered } from '../../lib/morphologyScope.js';

const router = Router();
/**
 * Mirror of single-word-ism for verbs:
 *   - full Quran surahs (1–114)
 *   - a word is a single segment (segment count === 1)
 *   - that one segment is a verb (PartOfSpeech === 'V')
 *   - text is deduplicated (first occurrence wins)
 */
function findSingleSegmentFilExamples(records) {
  const wordSegmentMap = new Map();
  const wordPosMap = new Map();
  const wordTextMap = new Map();

  for (const record of records) {
    const wordKey = `${record.SurahId}-${record.AyahNo}-${record.WordNo}`;

    wordSegmentMap.set(wordKey, (wordSegmentMap.get(wordKey) || 0) + 1);

    if (!wordPosMap.has(wordKey)) {
      wordPosMap.set(wordKey, new Set());
    }
    if (record.PartOfSpeech) {
      wordPosMap.get(wordKey).add(record.PartOfSpeech);
    }

    wordTextMap.set(wordKey, record.Text);
  }

  const seenWords = new Set();
  const matchingWords = [];

  for (const record of records) {
    const wordKey = `${record.SurahId}-${record.AyahNo}-${record.WordNo}`;
    const text = wordTextMap.get(wordKey);

    const segmentCount = wordSegmentMap.get(wordKey);
    const posSet = wordPosMap.get(wordKey);

    if (
      segmentCount === 1 &&
      posSet &&
      posSet.size === 1 &&
      record.PartOfSpeech === 'V' &&
      text &&
      !seenWords.has(text)
    ) {
      seenWords.add(text);
      matchingWords.push({
        surahId: Number(record.SurahId),
        ayahNo: Number(record.AyahNo),
        wordNo: Number(record.WordNo),
        text,
      });
    }
  }

  const examples = matchingWords
    .map(({ surahId, ayahNo, wordNo, text }) => ({
      surahId,
      ayahNo,
      text,
      words: [{ wordNo }],
    }))
    .sort((a, b) => {
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
    const records = await fetchMorphologyOrdered({
      SurahId: DEFAULT_SURAH_FILTER,
    });

    const examples = findSingleSegmentFilExamples(records);
    const limited = examples.slice(0, limit);

    const wordRefs = limited.map((ex) => ({
      surahId: ex.surahId,
      ayahNo: ex.ayahNo,
      wordNo: ex.words?.[0]?.wordNo,
    }));
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of limited) {
      const wordNo = ex.words?.[0]?.wordNo;
      ex.translations =
        translationMap.get(wordKey(ex.surahId, ex.ayahNo, wordNo)) || null;
    }

    res.json({
      count: limited.length,
      totalMatches: examples.length,
      scannedSegments: records.length,
      limit,
      examples: limited,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
