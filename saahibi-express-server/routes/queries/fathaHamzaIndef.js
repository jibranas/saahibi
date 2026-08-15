import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
const FATHA_HAMZA_BW_RE = /aA\^'?[uaiF&N\[\]]$/;

function buildFathaHamzaIndefExamples(records) {
  const wordCases = new Map();
  const wordExamples = new Map();
  const seenTexts = new Map();

  for (const record of records) {
    if (
      record.PartOfSpeech === 'N' &&
      Number(record.Person) === 0 &&
      Number(record.Gender) === 2 &&
      Number(record.SegmentNo) === 1 &&
      record.NominalCase &&
      record.NominalState === 'INDEF' &&
      FATHA_HAMZA_BW_RE.test(String(record.TextBw || ''))
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

  const wordsWithMultipleCases = Array.from(wordCases.entries())
    .filter(([, cases]) => cases.size >= 1)
    .sort((a, b) => {
      const aCases = wordCases.get(a[0]).size;
      const bCases = wordCases.get(b[0]).size;
      if (aCases !== bCases) return bCases - aCases;
      return a[0].localeCompare(b[0]);
    })
    .map(([lemma]) => lemma);

  const examples = wordsWithMultipleCases.flatMap((lemma) => {
    const wordInstances = wordExamples.get(lemma);
    const availableCases = Array.from(wordCases.get(lemma));
    return availableCases.map((caseType) => {
      const instance = wordInstances.find((w) => w.nominalCase === caseType);
      return {
        surahId: instance.surahId,
        ayahNo: instance.ayahNo,
        words: [{ wordNo: instance.wordNo }],
        case: caseType,
        text: instance.text,
        lemma: instance.lemma,
        lemmaArabic: instance.lemmaArabic,
      };
    });
  });

  if (examples.length === 0) {
    const allWords = Array.from(wordExamples.keys()).sort();
    return allWords.flatMap((lemma) => {
      const wordInstances = wordExamples.get(lemma);
      return wordInstances.map((instance) => ({
        surahId: instance.surahId,
        ayahNo: instance.ayahNo,
        words: [{ wordNo: instance.wordNo }],
        case: instance.nominalCase,
        text: instance.text,
        lemma: instance.lemma,
        lemmaArabic: instance.lemmaArabic,
      }));
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

    const examples = buildFathaHamzaIndefExamples(records);
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
