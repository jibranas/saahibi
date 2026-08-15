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

/** Words without ال — either as a prefix segment or as the previous word (ٱلْ). */
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

function isOpenState(state) {
  return state === 'INDEF' || state === '' || state == null;
}

/** Derive dual marfu (ـَانِ) from an oblique (ـَيْنِ) surface form. */
function obliqueToNomArabic(text) {
  if (!text) return null;
  const replaced = String(text).replace(/يْنِ\u0616?$/u, 'انِ');
  if (replaced !== text) return replaced;
  const alt = String(text).replace(/يْنِ$/u, 'َانِ');
  return alt !== text ? alt : null;
}

function attestedExample(instance) {
  return {
    surahId: instance.surahId,
    ayahNo: instance.ayahNo,
    words: [{ wordNo: instance.wordNo }],
    case: instance.nominalCase,
    text: instance.text,
    lemma: instance.lemma,
    lemmaArabic: instance.lemmaArabic,
    gender: instance.gender ?? null,
    occurrenceMatch: 'exact',
  };
}

function syntheticExample({ caseType, text, lemma, lemmaArabic, gender }) {
  return {
    surahId: null,
    ayahNo: null,
    words: [{ text }],
    case: caseType,
    text,
    lemma,
    lemmaArabic,
    gender: gender ?? null,
    occurrenceMatch: 'no-quran',
    noQuranExample: true,
  };
}

function buildDualNounsIntroExamples(records) {
  const definiteWords = collectDefiniteWordKeys(records);
  const wordCases = new Map();
  const wordExamples = new Map();
  const seenTexts = new Map();

  for (const record of records) {
    const key = wordKeyStr(record);
    const bw = String(record.TextBw || '');
    const nominalCase = record.NominalCase;
    const isNomForm = /Ani$/.test(bw);
    const isObliqueForm = /ayoni$/.test(bw);

    if (
      record.PartOfSpeech === 'N' &&
      Number(record.Person) === 0 &&
      Number(record.SegmentNo) === 1 &&
      Number(record.Number) === 2 &&
      record.NominalCase &&
      isOpenState(record.NominalState) &&
      record.LemmaBw &&
      !definiteWords.has(key) &&
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
          gender:
            record.Gender != null && record.Gender !== ''
              ? Number(record.Gender)
              : null,
        });
        seenTexts.get(lemma).add(`${nominalCase}:${text}`);
      }
    }
  }

  const rankedLemmas = Array.from(wordCases.entries())
    .filter(([, cases]) => cases.size >= 1)
    .sort((a, b) => {
      const sizeDiff = b[1].size - a[1].size;
      if (sizeDiff !== 0) return sizeDiff;
      return a[0].localeCompare(b[0]);
    })
    .map(([lemma]) => lemma);

  return rankedLemmas.flatMap((lemma) => {
    const wordInstances = wordExamples.get(lemma);
    const byCase = {
      NOM: wordInstances.find((w) => w.nominalCase === 'NOM') || null,
      ACC: wordInstances.find((w) => w.nominalCase === 'ACC') || null,
      GEN: wordInstances.find((w) => w.nominalCase === 'GEN') || null,
    };
    const sibling =
      byCase.NOM || byCase.ACC || byCase.GEN || wordInstances[0] || null;
    const obliqueText = byCase.ACC?.text || byCase.GEN?.text || null;
    const lemmaArabic = sibling?.lemmaArabic || lemma;
    const gender = sibling?.gender ?? null;

    const slots = [];

    for (const caseType of ['NOM', 'ACC', 'GEN']) {
      if (byCase[caseType]) {
        slots.push(attestedExample(byCase[caseType]));
        continue;
      }

      if (caseType === 'NOM') {
        const derived = obliqueToNomArabic(obliqueText);
        if (derived) {
          slots.push(
            syntheticExample({
              caseType: 'NOM',
              text: derived,
              lemma,
              lemmaArabic,
              gender,
            })
          );
        }
        continue;
      }

      // Missing ACC or GEN: reuse the sibling oblique surface, never its ayah.
      if (obliqueText) {
        slots.push(
          syntheticExample({
            caseType,
            text: obliqueText,
            lemma,
            lemmaArabic,
            gender,
          })
        );
      }
    }

    return slots;
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

    const examples = buildDualNounsIntroExamples(records);
    const limited = examples.slice(0, limit);

    const wordRefs = limited
      .filter((ex) => !ex.noQuranExample && ex.surahId != null && ex.ayahNo != null)
      .map((ex) => ({
        surahId: ex.surahId,
        ayahNo: ex.ayahNo,
        wordNo: ex.words?.[0]?.wordNo,
      }));
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of limited) {
      if (ex.noQuranExample) {
        ex.translations = null;
        continue;
      }
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
