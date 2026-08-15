import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
const TA_TANWEEN_RE = /ة[ٌٍَُِْٗںً]?$/;

function buildFeminineIrabExamples(records) {
  const wordCases = new Map();
  const wordExamples = new Map();
  const seenTexts = new Map();

  for (const record of records) {
    if (
      record.PartOfSpeech === 'N' &&
      Number(record.Person) === 0 &&
      Number(record.Gender) === 2 &&
      Number(record.SegmentNo) === 1 &&
      record.NominalState === 'INDEF' &&
      TA_TANWEEN_RE.test(String(record.Text || '')) &&
      record.NominalCase
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

  return completeWords.flatMap((lemma) => {
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

    const examples = buildFeminineIrabExamples(records);
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
