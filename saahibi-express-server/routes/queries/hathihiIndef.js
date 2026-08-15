import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function sameWordMorph(a, b) {
  return (
    String(a.SurahId) === String(b.SurahId) &&
    String(a.AyahId) === String(b.AyahId) &&
    String(a.WordId) === String(b.WordId)
  );
}

function findHathihiIndefExamples(records) {
  const hathihiPatterns = [];
  const examples = [];

  for (let i = 0; i < records.length - 2; i++) {
    const haRecord = records[i];
    const thihiRecord = records[i + 1];
    const nextRecord = records[i + 2];

    if (
      haRecord.Text === 'هَٰ' &&
      haRecord.TextBw &&
      String(haRecord.TextBw).includes('ha`') &&
      thihiRecord.Text &&
      String(thihiRecord.Text).includes('ذِهِ') &&
      thihiRecord.TextBw &&
      String(thihiRecord.TextBw).includes('*ihi') &&
      sameWordMorph(haRecord, thihiRecord)
    ) {
      const numStr = String(nextRecord?.Number ?? '');
      if (
        nextRecord &&
        nextRecord.PartOfSpeech === 'N' &&
        nextRecord.NominalState &&
        String(nextRecord.NominalState).includes('INDEF') &&
        nextRecord.NominalCase &&
        String(nextRecord.NominalCase).includes('NOM') &&
        numStr !== '3' &&
        nextRecord.Text &&
        String(nextRecord.Text).trim() !== ''
      ) {
        hathihiPatterns.push({
          hathihi: {
            surahId: haRecord.SurahId,
            ayahNo: haRecord.AyahNo,
            wordNo: haRecord.WordNo,
            haText: haRecord.Text,
            haTextBw: haRecord.TextBw,
            thihiText: thihiRecord.Text,
            thihiTextBw: thihiRecord.TextBw,
            combinedText: `${haRecord.Text}${thihiRecord.Text}`,
            combinedTextBw: `${haRecord.TextBw}${thihiRecord.TextBw}`,
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

  hathihiPatterns.forEach((pattern, index) => {
    examples.push({
      surahId: parseInt(String(pattern.hathihi.surahId), 10),
      ayahNo: parseInt(String(pattern.hathihi.ayahNo), 10),
      words: [
        { wordNo: parseInt(String(pattern.hathihi.wordNo), 10) },
        { wordNo: parseInt(String(pattern.indefinite.wordNo), 10) },
      ],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>Hathihi + Indefinite Noun Pattern ${index + 1}</h3>
            <div class="bg-rose-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-rose-900 text-lg mb-3">Sentence Structure: هَٰذِهِ + Indefinite Noun</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">Demonstrative Pronoun</h5>
                  <div class="text-2xl arabic mb-2">${pattern.hathihi.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.hathihi.combinedTextBw}</div>
                  <p class="text-green-700">Meaning: "This" (feminine singular)</p>
                  <p class="text-xs text-gray-600 mt-1">Near demonstrative pronoun (feminine)</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">Indefinite Noun</h5>
                  <div class="text-2xl arabic mb-2">${pattern.indefinite.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.indefinite.textBw}</div>
                  <p class="text-amber-700">Meaning: "${pattern.indefinite.lemma}" (indefinite, nominative)</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.indefinite.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.indefinite.nominalCase || 'N/A'} (رفع)</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Complete Sentence:</h5>
                <div class="text-xl arabic mb-2">${pattern.hathihi.combinedText} ${pattern.indefinite.text}</div>
                <p class="text-purple-800">Translation: "This is a ${pattern.indefinite.lemma}" or "This ${pattern.indefinite.lemma}" (feminine)</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar Notes:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li><strong>هَٰذِهِ</strong> is a near demonstrative pronoun (اسم إشارة) for feminine nouns</li>
                    <li><strong>${pattern.indefinite.text}</strong> is an indefinite noun (نكرة) in nominative case (رفع)</li>
                    <li>Demonstratives must match the <strong>gender</strong> of the noun they point to</li>
                    <li>This forms a <strong>demonstrative phrase</strong></li>
                    <li>Used for <strong>identification and specification</strong> of feminine objects</li>
                    <li>The <strong>nominative case</strong> indicates the noun is the subject or predicate</li>
                  </ul>
                </div>
              </div>
            </div>
          `,
        },
      ],
    });
  });

  return { examples, hathihiPatterns };
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

    const { examples, hathihiPatterns } = findHathihiIndefExamples(records);
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
        totalHathihiPatterns: hathihiPatterns.length,
        samplePatterns: hathihiPatterns.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
