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

function findDhanikaNomExamples(records) {
  const dhanikaPatterns = [];
  const examples = [];
  let dhaniCount = 0;
  let kaCount = 0;
  let completeCount = 0;

  for (let i = 0; i < records.length - 3; i++) {
    const dhaniRecord = records[i];
    const kaRecord = records[i + 1];
    const nextRecord = records[i + 2];

    if (dhaniRecord.Text === 'ذَٰنِ') {
      dhaniCount++;
    }

    if (dhaniRecord.Text === 'ذَٰنِ' && kaRecord && kaRecord.Text === 'كَ') {
      kaCount++;
    }

    if (
      dhaniRecord.Text === 'ذَٰنِ' &&
      dhaniRecord.TextBw &&
      String(dhaniRecord.TextBw).includes('*a`ni') &&
      kaRecord &&
      kaRecord.Text === 'كَ' &&
      kaRecord.TextBw === 'ka' &&
      sameWordMorph(dhaniRecord, kaRecord)
    ) {
      completeCount++;

      if (
        nextRecord &&
        nextRecord.PartOfSpeech === 'N' &&
        nextRecord.NominalCase &&
        String(nextRecord.NominalCase).includes('NOM') &&
        nextRecord.Text &&
        String(nextRecord.Text).trim() !== ''
      ) {
        dhanikaPatterns.push({
          dhanika: {
            surahId: dhaniRecord.SurahId,
            ayahNo: dhaniRecord.AyahNo,
            wordNo: dhaniRecord.WordNo,
            dhaniText: dhaniRecord.Text,
            dhaniTextBw: dhaniRecord.TextBw,
            kaText: kaRecord.Text,
            kaTextBw: kaRecord.TextBw,
            combinedText: `${dhaniRecord.Text}${kaRecord.Text}`,
            combinedTextBw: `${dhaniRecord.TextBw}${kaRecord.TextBw}`,
          },
          nominativeNoun: {
            surahId: nextRecord.SurahId,
            ayahNo: nextRecord.AyahNo,
            wordNo: nextRecord.WordNo,
            text: nextRecord.Text,
            textBw: nextRecord.TextBw,
            lemma: nextRecord.Lemma,
            root: nextRecord.Root,
            nominalCase: nextRecord.NominalCase,
            nominalState: nextRecord.NominalState,
            nominalDerivation: nextRecord.NominalDerivation,
            number: nextRecord.Number,
            gender: nextRecord.Gender,
          },
        });
      }
    }
  }

  dhanikaPatterns.forEach((pattern, index) => {
    const n = pattern.nominativeNoun;
    const nd = String(n.nominalDerivation || '');
    const nounKind = nd.includes('ACT_PCPL')
      ? '(active participle)'
      : nd.includes('PASS_PCPL')
        ? '(passive participle)'
        : '(noun)';
    const numStr = String(n.number ?? '');
    const numLabel =
      numStr === '1'
        ? 'Singular'
        : numStr === '2'
          ? 'Dual'
          : numStr === '3'
            ? 'Plural'
            : n.number || 'N/A';
    const genStr = String(n.gender ?? '');
    const genLabel =
      genStr === '1'
        ? 'Masculine'
        : genStr === '2'
          ? 'Feminine'
          : n.gender || 'N/A';

    examples.push({
      surahId: parseInt(String(pattern.dhanika.surahId), 10),
      ayahNo: parseInt(String(pattern.dhanika.ayahNo), 10),
      words: [
        { wordNo: parseInt(String(pattern.dhanika.wordNo), 10) },
        { wordNo: parseInt(String(pattern.nominativeNoun.wordNo), 10) },
      ],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>Dhanika + Nominative Noun Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">Sentence Structure: ذَٰنِكَ + Nominative Noun</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">Far Dual Demonstrative</h5>
                  <div class="text-2xl arabic mb-2">${pattern.dhanika.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.dhanika.combinedTextBw}</div>
                  <p class="text-green-700">Meaning: "Those two" (masculine dual, far)</p>
                  <p class="text-xs text-gray-600 mt-1">Far demonstrative pronoun (dual)</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">Nominative Noun</h5>
                  <div class="text-2xl arabic mb-2">${pattern.nominativeNoun.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.nominativeNoun.textBw}</div>
                  <p class="text-amber-700">Meaning: "${pattern.nominativeNoun.lemma}" ${nounKind}</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.nominativeNoun.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.nominativeNoun.nominalCase || 'N/A'} (رفع - Nominative)</p>
                  <p class="text-xs text-gray-600">State: ${pattern.nominativeNoun.nominalState || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Number: ${numLabel}</p>
                  <p class="text-xs text-gray-600">Gender: ${genLabel}</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Complete Sentence:</h5>
                <div class="text-xl arabic mb-2">${pattern.dhanika.combinedText} ${pattern.nominativeNoun.text}</div>
                <p class="text-purple-800">Translation: "Those two are ${pattern.nominativeNoun.lemma}" or "Those two ${pattern.nominativeNoun.lemma}"</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar Notes:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li><strong>ذَٰنِكَ</strong> is a far dual demonstrative pronoun (اسم إشارة للمثنى البعيد)</li>
                    <li><strong>${pattern.nominativeNoun.text}</strong> is in nominative case (رفع) as the predicate</li>
                    <li><strong>Dual reference:</strong> demonstrative points to exactly two distant entities</li>
                    <li><strong>Far reference:</strong> indicates distance (physical, temporal, or abstract)</li>
                    <li>This forms a <strong>far dual demonstrative phrase</strong></li>
                    <li>Used for <strong>identification of two specific distant entities</strong></li>
                    <li>No copula verb needed in Arabic nominal sentences</li>
                    <li><strong>Dual agreement:</strong> both demonstrative and noun refer to exactly two items</li>
                  </ul>
                </div>
              </div>
            </div>
          `,
        },
      ],
    });
  });

  return {
    examples,
    dhanikaPatterns,
    dhaniCount,
    kaCount,
    completeCount,
  };
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

    const {
      examples,
      dhanikaPatterns,
      dhaniCount,
      kaCount,
      completeCount,
    } = findDhanikaNomExamples(records);
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
        totalDhanikaPatterns: dhanikaPatterns.length,
        samplePatterns: dhanikaPatterns.slice(0, 5),
        dhaniCount,
        kaCount,
        completeCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
