import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function stripHarakat(text) {
  return String(text || '').replace(/[ًٌٍَُِّْ]/g, '');
}

function morphologyWordKey(record) {
  return `${record.SurahId}-${record.AyahNo}-${record.WordNo}`;
}

function buildMarifaNakiraExamples(records) {
  const wordsWithMultipleSegments = new Set();
  for (const record of records) {
    if (Number(record.SegmentNo) > 2) {
      wordsWithMultipleSegments.add(morphologyWordKey(record));
    }
  }

  const textGroups = new Map();

  for (const record of records) {
    const wk = morphologyWordKey(record);

    if (
      record.PartOfSpeech === 'N' &&
      Number(record.SegmentNo) === 1 &&
      record.NominalCase === 'NOM' &&
      record.NominalState &&
      String(record.NominalState).includes('INDEF') &&
      record.Text &&
      String(record.Text).trim() !== '' &&
      !wordsWithMultipleSegments.has(wk)
    ) {
      const strippedText = stripHarakat(record.Text);
      if (!textGroups.has(strippedText)) {
        textGroups.set(strippedText, { nakira: [], marifa: [] });
      }

      textGroups.get(strippedText).nakira.push({
        surahId: Number(record.SurahId),
        ayahNo: Number(record.AyahNo),
        wordNo: Number(record.WordNo),
        text: record.Text,
        textBw: record.TextBw,
        lemma: record.Lemma,
        root: record.Root,
        strippedText,
      });
    }
  }

  const definitePairs = new Map();

  for (const record of records) {
    const wk = morphologyWordKey(record);

    if (
      record.PartOfSpeech === 'P' &&
      Number(record.SegmentNo) === 1 &&
      record.PrefixType === 'DET' &&
      (record.TextBw === '{l' || record.TextBw === '{lo')
    ) {
      if (!definitePairs.has(wk)) {
        definitePairs.set(wk, { det: null, noun: null });
      }
      definitePairs.get(wk).det = record;
    } else if (
      record.PartOfSpeech === 'N' &&
      Number(record.SegmentNo) === 2 &&
      record.NominalCase === 'NOM' &&
      record.Text &&
      String(record.Text).trim() !== ''
    ) {
      if (!definitePairs.has(wk)) {
        definitePairs.set(wk, { det: null, noun: null });
      }
      definitePairs.get(wk).noun = record;
    }
  }

  definitePairs.forEach((pair) => {
    if (pair.det && pair.noun) {
      const strippedText = stripHarakat(pair.noun.Text);
      if (!textGroups.has(strippedText)) {
        textGroups.set(strippedText, { nakira: [], marifa: [] });
      }

      textGroups.get(strippedText).marifa.push({
        det: {
          surahId: pair.det.SurahId,
          ayahNo: pair.det.AyahNo,
          wordNo: pair.det.WordNo,
          text: pair.det.Text,
          textBw: pair.det.TextBw,
        },
        noun: {
          surahId: pair.noun.SurahId,
          ayahNo: pair.noun.AyahNo,
          wordNo: pair.noun.WordNo,
          text: pair.noun.Text,
          textBw: pair.noun.TextBw,
          lemma: pair.noun.Lemma,
          root: pair.noun.Root,
          strippedText,
        },
      });
    }
  });

  const sortedTextGroups = Array.from(textGroups.entries())
    .filter(([, group]) => group.nakira.length > 0 && group.marifa.length > 0)
    .sort((a, b) => {
      const lemmaA = a[1].nakira[0].lemma || a[0];
      const lemmaB = b[1].nakira[0].lemma || b[0];
      return lemmaA.localeCompare(lemmaB, 'ar');
    });

  const examples = [];

  for (const [, group] of sortedTextGroups) {
    const nakiraExample = group.nakira[0];
    const marifaExample = group.marifa[0];

    examples.push({
      surahId: Number(nakiraExample.surahId),
      ayahNo: Number(nakiraExample.ayahNo),
      words: [{ wordNo: Number(nakiraExample.wordNo) }],
      beforeInterlude: [
        {
          type: 'text',
          content: `
              <h3>Ma'rifa and Nakira Pair: ${nakiraExample.lemma}</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div class="bg-amber-50 p-4 rounded-lg">
                  <h4 class="font-bold text-amber-900 text-lg mb-2">Nakira (Indefinite)</h4>
                  <div class="text-2xl arabic mb-2">${nakiraExample.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${nakiraExample.textBw}</div>
                  <p class="text-amber-800">Meaning: "a ${nakiraExample.lemma}" or "some ${nakiraExample.lemma}"</p>
                  <ul class="list-disc pl-4 mt-2 text-sm">
                    <li>No definite article (ال)</li>
                    <li>Often has tanween (nunation)</li>
                    <li>Refers to any member of the class</li>
                  </ul>
                </div>
                <div class="bg-blue-50 p-4 rounded-lg">
                  <h4 class="font-bold text-blue-900 text-lg mb-2">Ma'rifa (Definite)</h4>
                  <div class="text-2xl arabic mb-2">${marifaExample.det.text + marifaExample.noun.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${marifaExample.det.textBw + marifaExample.noun.textBw}</div>
                  <p class="text-blue-800">Meaning: "the ${nakiraExample.lemma}"</p>
                  <ul class="list-disc pl-4 mt-2 text-sm">
                    <li>Has definite article: ${marifaExample.det.text} + ${marifaExample.noun.text}</li>
                    <li>No tanween (nunation)</li>
                    <li>Refers to a specific entity</li>
                  </ul>
                </div>
              </div>
              <div class="bg-green-50 p-4 rounded-lg my-3">
                <p class="font-bold text-green-900">Key Difference:</p>
                <p>The same root word <strong>${nakiraExample.lemma}</strong> appears in two forms:</p>
                <ul class="list-disc pl-6 mt-2">
                  <li><strong>Indefinite:</strong> ${nakiraExample.text} - refers to any ${nakiraExample.lemma}</li>
                  <li><strong>Definite:</strong> ${marifaExample.det.text + marifaExample.noun.text} - refers to a specific ${nakiraExample.lemma}</li>
                </ul>
              </div>
            `,
        },
      ],
      afterInterlude: [
        {
          type: 'text',
          content: `
              <div class="bg-gray-50 p-4 rounded-lg">
                <p class="font-bold text-gray-800">Next Example:</p>
                <p>The next verse will show the definite form (ma'rifa) of the same word to demonstrate how it appears in context.</p>
              </div>
            `,
        },
      ],
    });

    examples.push({
      surahId: Number(marifaExample.noun.surahId),
      ayahNo: Number(marifaExample.noun.ayahNo),
      words: [{ wordNo: Number(marifaExample.noun.wordNo) }],
      beforeInterlude: [
        {
          type: 'text',
          content: `
              <h3>Ma'rifa in Context: ${marifaExample.det.text + marifaExample.noun.text}</h3>
              <p>Here we see the definite form <strong>${marifaExample.det.text + marifaExample.noun.text}</strong> as it appears in the Quran.</p>
              <div class="bg-blue-50 p-4 rounded-lg my-3">
                <p class="font-bold text-blue-900">Notice:</p>
                <ul class="list-disc pl-6 mt-2">
                  <li>The word is split into two segments: <strong>${marifaExample.det.text}</strong> (determiner) + <strong>${marifaExample.noun.text}</strong> (noun)</li>
                  <li>Both segments are highlighted to show the complete definite construction</li>
                  <li>This is the same root as the indefinite <strong>${nakiraExample.text}</strong> we just saw</li>
                </ul>
              </div>
            `,
        },
      ],
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

    const examples = buildMarifaNakiraExamples(records);
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
