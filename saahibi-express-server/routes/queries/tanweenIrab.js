import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import {
  DEFAULT_SURAH_FILTER,
  QURAN_SURAH_MAX,
  QURAN_SURAH_MIN,
} from '../../lib/morphologyScope.js';
import { Morphology } from '../../models/Morphology.js';

const router = Router();

function buildTanweenIrabExamples(records) {
  const wordCases = new Map();
  const wordExamples = new Map();
  const seenTexts = new Map();

  for (const record of records) {
    if (
      Number(record.SegmentNo) === 1 &&
      record.NominalCase &&
      record.NominalState === 'INDEF' &&
      record.PartOfSpeech === 'N' &&
      Number(record.Number) === 1
    ) {
      const lemma = record.LemmaBw;
      const text = record.Text;
      const nominalCase = record.NominalCase;

      if (!wordCases.has(lemma)) {
        wordCases.set(lemma, new Set());
        wordExamples.set(lemma, []);
        seenTexts.set(lemma, new Set());
      }

      if (!seenTexts.get(lemma).has(text)) {
        wordCases.get(lemma).add(nominalCase);
        wordExamples.get(lemma).push({
          surahId: Number(record.SurahId),
          ayahNo: Number(record.AyahNo),
          wordNo: Number(record.WordNo),
          text,
          nominalCase,
          lemma: record.LemmaBw,
          lemmaArabic: record.Lemma,
        });
        seenTexts.get(lemma).add(text);
      }
    }
  }

  const completeWords = Array.from(wordCases.entries())
    .filter(([, cases]) => cases.has('NOM') && cases.has('ACC') && cases.has('GEN'))
    .map(([lemma]) => lemma)
    .sort();

  const examples = completeWords.flatMap((lemma) => {
    const wordInstances = wordExamples.get(lemma);
    return ['NOM', 'ACC', 'GEN'].map((caseType) => {
      const instance = wordInstances.find((w) => w.nominalCase === caseType);
      return {
        surahId: instance.surahId,
        ayahNo: instance.ayahNo,
        words: [{ wordNo: instance.wordNo }],
        case: caseType,
        text: instance.text,
        lemma: instance.lemma,
        lemmaArabic: instance.lemmaArabic,
        occurrenceMatch: 'exact',
      };
    });
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
        res.status(400).json({
          error: `Surah filter must be between ${QURAN_SURAH_MIN} and ${QURAN_SURAH_MAX}`,
        });
        return;
      }
      filter.SurahId = s;
    }
    const rawLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.floor(rawLimit)
        : Number.POSITIVE_INFINITY;
    const records = await Morphology.find({
      ...filter,
      SegmentNo: 1,
      NominalCase: { $exists: true, $ne: '' },
      NominalState: 'INDEF',
      PartOfSpeech: 'N',
      Number: 1,
    }).lean();

    records.sort((a, b) => {
      if (a.SurahId !== b.SurahId) return a.SurahId - b.SurahId;
      if (a.AyahNo !== b.AyahNo) return a.AyahNo - b.AyahNo;
      if (a.WordNo !== b.WordNo) return a.WordNo - b.WordNo;
      return a.SegmentNo - b.SegmentNo;
    });

    const examples = buildTanweenIrabExamples(records);
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
