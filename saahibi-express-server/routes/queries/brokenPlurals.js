import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function isNotSoundPluralTextBw(textBw) {
  const bw = String(textBw || '');
  return !(
    /uwna$/.test(bw) ||
    /iyna$/.test(bw) ||
    /a`tN$/.test(bw) ||
    /a`t[Ki]$/.test(bw)
  );
}

function buildBrokenPluralsExamples(records) {
  const wordsWithMultipleSegments = new Set();
  for (const record of records) {
    if (Number(record.SegmentNo) > 1) {
      wordsWithMultipleSegments.add(
        `${record.SurahId}-${record.AyahNo}-${record.WordNo}`
      );
    }
  }

  const lemmaForms = new Map();

  for (const record of records) {
    const wordKeyStr = `${record.SurahId}-${record.AyahNo}-${record.WordNo}`;

    if (
      record.PartOfSpeech === 'N' &&
      Number(record.Person) === 0 &&
      Number(record.SegmentNo) === 1 &&
      record.NominalCase &&
      record.Lemma &&
      !wordsWithMultipleSegments.has(wordKeyStr)
    ) {
      const lemma = record.LemmaBw;
      const isNumber = Number(record.Number);
      const case_ = record.NominalCase;

      if (!lemmaForms.has(lemma)) {
        lemmaForms.set(lemma, {
          singular: new Map(),
          plural: new Map(),
        });
      }

      const wordData = {
        surahId: Number(record.SurahId),
        ayahNo: Number(record.AyahNo),
        wordNo: Number(record.WordNo),
        text: record.Text,
        nominalCase: record.NominalCase,
        textBw: record.TextBw,
      };

      if (isNumber === 0 || isNumber === 1) {
        const singularForms = lemmaForms.get(lemma).singular;
        if (!singularForms.has(case_)) {
          singularForms.set(case_, []);
        }
        singularForms.get(case_).push(wordData);
      } else if (isNumber === 3 && isNotSoundPluralTextBw(record.TextBw)) {
        const pluralForms = lemmaForms.get(lemma).plural;
        if (!pluralForms.has(case_)) {
          pluralForms.set(case_, []);
        }
        pluralForms.get(case_).push(wordData);
      }
    }
  }

  const brokenPluralExamples = [];

  for (const [lemma, forms] of lemmaForms.entries()) {
    if (forms.plural.size >= 1 && forms.singular.size >= 1) {
      const caseOrder = ['NOM', 'ACC', 'GEN'];
      const pluralExamples = [];

      for (const case_ of caseOrder) {
        if (forms.plural.has(case_)) {
          const example = forms.plural.get(case_)[0];
          pluralExamples.push({
            case: case_,
            surahId: example.surahId,
            ayahNo: example.ayahNo,
            wordNo: example.wordNo,
            text: example.text,
            textBw: example.textBw,
          });
        }
      }

      const singularCase = Array.from(forms.singular.keys())[0];
      const singularExample = forms.singular.get(singularCase)[0];

      if (pluralExamples.length > 0) {
        brokenPluralExamples.push({
          lemma,
          lemmaArabic: singularExample.text,
          singular: {
            surahId: singularExample.surahId,
            ayahNo: singularExample.ayahNo,
            wordNo: singularExample.wordNo,
            text: singularExample.text,
            textBw: singularExample.textBw,
            case: singularExample.nominalCase,
          },
          pluralForms: pluralExamples,
        });
      }
    }
  }

  brokenPluralExamples.sort((a, b) => a.lemma.localeCompare(b.lemma));

  return brokenPluralExamples.flatMap((example) => [
    {
      surahId: example.singular.surahId,
      ayahNo: example.singular.ayahNo,
      words: [{ wordNo: example.singular.wordNo }],
      case: example.singular.case,
      text: example.singular.text,
      lemma: example.lemma,
      lemmaArabic: example.lemmaArabic,
      form: 'singular',
      allPluralForms: example.pluralForms.map((p) => `${p.text} (${p.case})`),
    },
    ...example.pluralForms.map((plural) => ({
      surahId: plural.surahId,
      ayahNo: plural.ayahNo,
      words: [{ wordNo: plural.wordNo }],
      case: plural.case,
      text: plural.text,
      lemma: example.lemma,
      lemmaArabic: example.lemmaArabic,
      form: 'plural',
      singularForm: example.singular.text,
    })),
  ]);
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

    const examples = buildBrokenPluralsExamples(records);
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
