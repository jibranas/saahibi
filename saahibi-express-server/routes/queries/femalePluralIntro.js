import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import {
  DEFAULT_SURAH_FILTER,
  fetchMorphologyOrdered,
  QURAN_SURAH_MAX,
  QURAN_SURAH_MIN,
} from '../../lib/morphologyScope.js';

const router = Router();

function wordKeyStr(record) {
  return `${record.SurahId}-${record.AyahNo}-${record.WordNo}`;
}

function collectDefiniteWordKeys(records) {
  const definite = new Set();
  const alArticleWords = new Set();

  for (const record of records) {
    const key = wordKeyStr(record);
    const prefix = String(record.PrefixType || '');
    if (prefix.includes('DET')) {
      definite.add(key);
      if (
        record.LemmaBw === 'Al' ||
        record.TextBw === '{lo' ||
        record.TextBw === 'Al'
      ) {
        alArticleWords.add(key);
      }
    }
  }

  for (const key of alArticleWords) {
    const [s, a, w] = key.split('-').map(Number);
    definite.add(`${s}-${a}-${w + 1}`);
  }

  return definite;
}

function isSoundFemalePluralBw(textBw) {
  const bw = String(textBw || '');
  return /a`tN$/.test(bw) || /a`t[Ki]$/.test(bw);
}

function buildFemalePluralIntroExamples(records) {
  const definiteWords = collectDefiniteWordKeys(records);
  const wordCases = new Map();
  const wordExamples = new Map();
  const seenTexts = new Map();

  for (const record of records) {
    const key = wordKeyStr(record);
    const bw = String(record.TextBw || '');
    const nominalCase = record.NominalCase;
    const isNomForm = /a`tN$/.test(bw);
    const isObliqueForm = /a`t[Ki]$/.test(bw);

    if (
      record.PartOfSpeech === 'N' &&
      Number(record.Person) === 0 &&
      Number(record.Gender) === 2 &&
      Number(record.SegmentNo) === 1 &&
      Number(record.Number) === 3 &&
      record.NominalCase &&
      record.NominalState === 'INDEF' &&
      record.LemmaBw &&
      !definiteWords.has(key) &&
      isSoundFemalePluralBw(bw) &&
      ((nominalCase === 'NOM' && isNomForm) ||
        ((nominalCase === 'ACC' || nominalCase === 'GEN') && isObliqueForm))
    ) {
      const lemma = record.LemmaBw;
      const text = record.Text;

      if (!wordCases.has(lemma)) {
        wordCases.set(lemma, new Set());
        wordExamples.set(lemma, []);
        seenTexts.set(lemma, new Set());
      }

      if (!seenTexts.get(lemma).has(`${nominalCase}:${text}`)) {
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
        seenTexts.get(lemma).add(`${nominalCase}:${text}`);
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

    const examples = buildFemalePluralIntroExamples(records);
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
