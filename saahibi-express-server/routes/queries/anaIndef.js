import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function findAnaIndefExamples(records) {
  const anaPatterns = [];
  const examples = [];

  for (let i = 0; i < records.length - 1; i++) {
    const currentRecord = records[i];
    const nextRecord = records[i + 1];
    const tbw = String(currentRecord.TextBw || '');

    if (
      currentRecord.Text &&
      String(currentRecord.Text).includes('أَنَا') &&
      currentRecord.TextBw &&
      (tbw === '>anaA' || tbw === '>anaA"')
    ) {
      if (
        nextRecord &&
        nextRecord.PartOfSpeech === 'N' &&
        nextRecord.NominalState &&
        String(nextRecord.NominalState).includes('INDEF') &&
        nextRecord.Text &&
        String(nextRecord.Text).trim() !== ''
      ) {
        anaPatterns.push({
          ana: {
            surahId: currentRecord.SurahId,
            ayahNo: currentRecord.AyahNo,
            wordNo: currentRecord.WordNo,
            text: currentRecord.Text,
            textBw: currentRecord.TextBw,
          },
          indefinite: {
            surahId: nextRecord.SurahId,
            ayahNo: nextRecord.AyahNo,
            wordNo: nextRecord.WordNo,
            text: nextRecord.Text,
            textBw: nextRecord.TextBw,
            lemma: nextRecord.Lemma,
            root: nextRecord.Root,
            nominalCase: nextRecord.NominalCase,
            nominalState: nextRecord.NominalState,
          },
        });
      }
    }
  }

  anaPatterns.forEach((pattern, index) => {
    examples.push({
      surahId: parseInt(String(pattern.ana.surahId), 10),
      ayahNo: parseInt(String(pattern.ana.ayahNo), 10),
      words: [
        { wordNo: parseInt(String(pattern.ana.wordNo), 10) },
        { wordNo: parseInt(String(pattern.indefinite.wordNo), 10) },
      ],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>Ana + Indefinite Noun Pattern ${index + 1}</h3>
            <div class="bg-indigo-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-indigo-900 text-lg mb-3">Sentence Structure: أَنَا + Indefinite Noun</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">Subject Pronoun</h5>
                  <div class="text-2xl arabic mb-2">${pattern.ana.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.ana.textBw}</div>
                  <p class="text-green-700">Meaning: "I am" (1st person singular)</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">Predicate (Indefinite Noun)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.indefinite.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.indefinite.textBw}</div>
                  <p class="text-amber-700">Meaning: "${pattern.indefinite.lemma}" (indefinite)</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.indefinite.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.indefinite.nominalCase || 'N/A'}</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Complete Sentence:</h5>
                <div class="text-xl arabic mb-2">${pattern.ana.text} ${pattern.indefinite.text}</div>
                <p class="text-purple-800">Translation: "I am a/an ${pattern.indefinite.lemma}"</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar Notes:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li><strong>أَنَا</strong> is a subject pronoun (1st person singular)</li>
                    <li><strong>${pattern.indefinite.text}</strong> is an indefinite noun (نكرة)</li>
                    <li>This forms a nominal sentence (جملة اسمية)</li>
                    <li>Used for <strong>self-identification</strong></li>
                    <li>No copula verb "is" needed in Arabic</li>
                  </ul>
                </div>
              </div>
            </div>
          `,
        },
      ],
    });
  });

  return { examples, anaPatterns };
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

    const { examples, anaPatterns } = findAnaIndefExamples(records);
    const limited = examples.slice(0, limit);

    const wordRefs = [];
    for (const ex of limited) {
      for (const w of ex.words) {
        wordRefs.push({
          surahId: ex.surahId,
          ayahNo: ex.ayahNo,
          wordNo: w.wordNo,
        });
      }
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of limited) {
      ex.translations = ex.words.map(
        (w) =>
          translationMap.get(wordKey(ex.surahId, ex.ayahNo, w.wordNo)) || null
      );
    }

    res.json({
      count: limited.length,
      totalMatches: examples.length,
      scannedSegments: records.length,
      limit,
      examples: limited,
      debug: {
        totalAnaPatterns: anaPatterns.length,
        samplePatterns: anaPatterns.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
