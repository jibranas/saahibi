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

function findDhalikaIndefExamples(records) {
  const dhalikaPatterns = [];
  const examples = [];
  let dhaCount = 0;
  let liCount = 0;
  let kaCount = 0;

  for (let i = 0; i < records.length - 4; i++) {
    const dhaRecord = records[i];
    const liRecord = records[i + 1];
    const kaRecord = records[i + 2];
    const nextRecord = records[i + 3];

    if (dhaRecord.Text === 'ذَٰ') {
      dhaCount++;
    }

    if (dhaRecord.Text === 'ذَٰ' && liRecord && liRecord.Text === 'لِ') {
      liCount++;
    }

    if (
      dhaRecord.Text === 'ذَٰ' &&
      liRecord &&
      liRecord.Text === 'لِ' &&
      kaRecord &&
      kaRecord.Text === 'كَ'
    ) {
      kaCount++;
    }

    if (
      dhaRecord.Text === 'ذَٰ' &&
      dhaRecord.TextBw &&
      String(dhaRecord.TextBw).includes('*a`') &&
      liRecord &&
      liRecord.Text === 'لِ' &&
      liRecord.TextBw === 'li' &&
      kaRecord &&
      kaRecord.Text === 'كَ' &&
      kaRecord.TextBw === 'ka' &&
      sameWordMorph(dhaRecord, liRecord) &&
      String(liRecord.WordId) === String(kaRecord.WordId)
    ) {
      if (
        nextRecord &&
        nextRecord.PartOfSpeech === 'N' &&
        nextRecord.NominalState &&
        String(nextRecord.NominalState).includes('INDEF') &&
        nextRecord.NominalCase &&
        String(nextRecord.NominalCase).includes('NOM') &&
        nextRecord.Text &&
        String(nextRecord.Text).trim() !== ''
      ) {
        dhalikaPatterns.push({
          dhalika: {
            surahId: dhaRecord.SurahId,
            ayahNo: dhaRecord.AyahNo,
            wordNo: dhaRecord.WordNo,
            dhaText: dhaRecord.Text,
            dhaTextBw: dhaRecord.TextBw,
            liText: liRecord.Text,
            liTextBw: liRecord.TextBw,
            kaText: kaRecord.Text,
            kaTextBw: kaRecord.TextBw,
            combinedText: `${dhaRecord.Text}${liRecord.Text}${kaRecord.Text}`,
            combinedTextBw: `${dhaRecord.TextBw}${liRecord.TextBw}${kaRecord.TextBw}`,
          },
          indefiniteNoun: {
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

  dhalikaPatterns.forEach((pattern, index) => {
    const n = pattern.indefiniteNoun;
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
    const indefMarker =
      n.nominalState && String(n.nominalState).includes('INDEF')
        ? 'INDEF marker'
        : 'tanween or lack of ال';

    examples.push({
      surahId: parseInt(String(pattern.dhalika.surahId), 10),
      ayahNo: parseInt(String(pattern.dhalika.ayahNo), 10),
      words: [
        { wordNo: parseInt(String(pattern.dhalika.wordNo), 10) },
        { wordNo: parseInt(String(pattern.indefiniteNoun.wordNo), 10) },
      ],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>Dhalika + Indefinite Noun Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">Sentence Structure: ذَٰلِكَ + Indefinite Noun</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">Far Demonstrative</h5>
                  <div class="text-2xl arabic mb-2">${pattern.dhalika.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.dhalika.combinedTextBw}</div>
                  <p class="text-green-700">Meaning: "That" (masculine singular)</p>
                  <p class="text-xs text-gray-600 mt-1">Far demonstrative pronoun</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">Indefinite Noun</h5>
                  <div class="text-2xl arabic mb-2">${pattern.indefiniteNoun.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.indefiniteNoun.textBw}</div>
                  <p class="text-amber-700">Meaning: "${pattern.indefiniteNoun.lemma}" ${nounKind}</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.indefiniteNoun.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.indefiniteNoun.nominalCase || 'N/A'} (رفع - Nominative)</p>
                  <p class="text-xs text-gray-600">State: ${pattern.indefiniteNoun.nominalState || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Number: ${numLabel}</p>
                  <p class="text-xs text-gray-600">Gender: ${genLabel}</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Complete Sentence:</h5>
                <div class="text-xl arabic mb-2">${pattern.dhalika.combinedText} ${pattern.indefiniteNoun.text}</div>
                <p class="text-purple-800">Translation: "That is ${pattern.indefiniteNoun.lemma}" or "That ${pattern.indefiniteNoun.lemma}"</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar Notes:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li><strong>ذَٰلِكَ</strong> is a far demonstrative pronoun (اسم إشارة للبعيد)</li>
                    <li><strong>${pattern.indefiniteNoun.text}</strong> is indefinite (نكرة) as indicated by ${indefMarker}</li>
                    <li><strong>Nominative case (رفع):</strong> the noun is in the subject/predicate position</li>
                    <li><strong>Far reference:</strong> demonstrative points to something distant or abstract</li>
                    <li>This forms a <strong>far demonstrative phrase</strong></li>
                    <li>Used for <strong>identification of distant entities</strong> or abstract concepts</li>
                    <li>No copula verb needed in Arabic nominal sentences</li>
                  </ul>
                </div>
              </div>
            </div>
          `,
        },
      ],
    });
  });

  return { examples, dhalikaPatterns, dhaCount, liCount, kaCount };
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

    const { examples, dhalikaPatterns, dhaCount, liCount, kaCount } =
      findDhalikaIndefExamples(records);
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
        totalDhalikaPatterns: dhalikaPatterns.length,
        samplePatterns: dhalikaPatterns.slice(0, 5),
        dhaCount,
        liCount,
        kaCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
