import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
const TA_MARBUTA_RE = /ة[ٌٍَُِْٗںً]?$/;

function buildFeminineNounExamples(records) {
  const seenLemmas = new Set();
  const examples = [];

  for (const record of records) {
    if (
      record.PartOfSpeech === 'N' &&
      Number(record.Person) === 0 &&
      Number(record.Gender) === 2 &&
      Number(record.SegmentNo) === 1 &&
      TA_MARBUTA_RE.test(String(record.Text || '')) &&
      !seenLemmas.has(record.Lemma)
    ) {
      const otherSegments = records.filter(
        (r) =>
          r.SurahId === record.SurahId &&
          r.AyahNo === record.AyahNo &&
          r.WordNo === record.WordNo &&
          Number(r.SegmentNo) !== 1
      );

      if (!otherSegments.some((seg) => seg.PartOfSpeech === 'N')) {
        seenLemmas.add(record.Lemma);
        examples.push({
          surahId: Number(record.SurahId),
          ayahNo: Number(record.AyahNo),
          words: [{ wordNo: Number(record.WordNo) }],
          text: record.Text,
          lemma: record.LemmaBw,
          lemmaArabic: record.Lemma,
        });
      }
    }
  }

  examples.sort((a, b) => {
    if (a.surahId !== b.surahId) return a.surahId - b.surahId;
    return a.ayahNo - b.ayahNo;
  });

  return examples;
}

router.get('/', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const filter = { SurahId: DEFAULT_SURAH_FILTER };
    if (req.query.surah != null && req.query.surah !== '') {
      const s = Number(req.query.surah);
      if (!Number.isFinite(s)) {
        res.status(400).json({ error: 'Invalid surah filter' });
        return;
      }
      if (s < QURAN_SURAH_MIN || s > QURAN_SURAH_MAX) {
        res.status(400).json({ error: 'Surah filter must be between 1 and 114' });
        return;
      }
      filter.SurahId = s;
    }
    const rawLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.floor(rawLimit)
        : Number.POSITIVE_INFINITY;
    const records = await fetchMorphologyOrdered(filter);

    const examples = buildFeminineNounExamples(records);
    const limited = examples.slice(0, limit);

    const wordRefs = limited.map((ex) => ({
      surahId: ex.surahId,
      ayahNo: ex.ayahNo,
      wordNo: ex.words?.[0]?.wordNo,
    }));
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of limited) {
      const wn = ex.words?.[0]?.wordNo;
      ex.translations =
        translationMap.get(wordKey(ex.surahId, ex.ayahNo, wn)) || null;
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
