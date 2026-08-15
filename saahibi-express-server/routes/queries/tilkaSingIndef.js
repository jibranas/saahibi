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

function findTilkaSingIndefExamples(records) {
  const tilkaPatterns = [];
  const examples = [];
  let tiCount = 0;
  let loCount = 0;
  let kaCount = 0;
  let completeCount = 0;

  for (let i = 0; i < records.length - 4; i++) {
    const tiRecord = records[i];
    const loRecord = records[i + 1];
    const kaRecord = records[i + 2];
    const nextRecord = records[i + 3];

    if (tiRecord.Text === 'تِ' && tiRecord.TextBw === 'ti') {
      tiCount++;
    }

    if (
      tiRecord.Text === 'تِ' &&
      tiRecord.TextBw === 'ti' &&
      loRecord &&
      loRecord.Text === 'لْ' &&
      loRecord.TextBw === 'lo'
    ) {
      loCount++;
    }

    if (
      tiRecord.Text === 'تِ' &&
      tiRecord.TextBw === 'ti' &&
      loRecord &&
      loRecord.Text === 'لْ' &&
      loRecord.TextBw === 'lo' &&
      kaRecord &&
      kaRecord.Text === 'كَ' &&
      kaRecord.TextBw === 'ka'
    ) {
      kaCount++;
    }

    if (
      tiRecord.Text === 'تِ' &&
      tiRecord.TextBw === 'ti' &&
      loRecord &&
      loRecord.Text === 'لْ' &&
      loRecord.TextBw === 'lo' &&
      kaRecord &&
      kaRecord.Text === 'كَ' &&
      kaRecord.TextBw === 'ka' &&
      sameWordMorph(tiRecord, loRecord) &&
      String(loRecord.WordId) === String(kaRecord.WordId)
    ) {
      completeCount++;

      const numStr = String(nextRecord?.Number ?? '');
      if (
        nextRecord &&
        nextRecord.PartOfSpeech === 'N' &&
        nextRecord.NominalState &&
        String(nextRecord.NominalState).includes('INDEF') &&
        nextRecord.NominalCase &&
        String(nextRecord.NominalCase).includes('NOM') &&
        numStr === '1' &&
        nextRecord.Text &&
        String(nextRecord.Text).trim() !== ''
      ) {
        tilkaPatterns.push({
          tilka: {
            surahId: tiRecord.SurahId,
            ayahNo: tiRecord.AyahNo,
            wordNo: tiRecord.WordNo,
            tiText: tiRecord.Text,
            tiTextBw: tiRecord.TextBw,
            loText: loRecord.Text,
            loTextBw: loRecord.TextBw,
            kaText: kaRecord.Text,
            kaTextBw: kaRecord.TextBw,
            combinedText: `${tiRecord.Text}${loRecord.Text}${kaRecord.Text}`,
            combinedTextBw: `${tiRecord.TextBw}${loRecord.TextBw}${kaRecord.TextBw}`,
          },
          singularNoun: {
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

  tilkaPatterns.forEach((pattern, index) => {
    const sn = pattern.singularNoun;
    const nd = String(sn.nominalDerivation || '');
    const nounKind = nd.includes('ACT_PCPL')
      ? '(active participle)'
      : nd.includes('PASS_PCPL')
        ? '(passive participle)'
        : '(noun)';
    const genStr = String(sn.gender ?? '');
    const genLabel =
      genStr === '1'
        ? 'Masculine'
        : genStr === '2'
          ? 'Feminine'
          : sn.gender || 'N/A';

    examples.push({
      surahId: parseInt(String(pattern.tilka.surahId), 10),
      ayahNo: parseInt(String(pattern.tilka.ayahNo), 10),
      words: [
        { wordNo: parseInt(String(pattern.tilka.wordNo), 10) },
        { wordNo: parseInt(String(pattern.singularNoun.wordNo), 10) },
      ],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>Tilka + Singular Indefinite Noun Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">Sentence Structure: تِلْكَ + Singular Indefinite Noun</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">Far Feminine Demonstrative</h5>
                  <div class="text-2xl arabic mb-2">${pattern.tilka.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.tilka.combinedTextBw}</div>
                  <p class="text-green-700">Meaning: "That" (feminine singular, far)</p>
                  <p class="text-xs text-gray-600 mt-1">Far demonstrative pronoun (feminine)</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">Singular Indefinite Noun</h5>
                  <div class="text-2xl arabic mb-2">${pattern.singularNoun.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.singularNoun.textBw}</div>
                  <p class="text-amber-700">Meaning: "${pattern.singularNoun.lemma}" ${nounKind}</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.singularNoun.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.singularNoun.nominalCase || 'N/A'} (رفع - Nominative)</p>
                  <p class="text-xs text-gray-600">State: ${pattern.singularNoun.nominalState || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Number: Singular (1)</p>
                  <p class="text-xs text-gray-600">Gender: ${genLabel}</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Complete Sentence:</h5>
                <div class="text-xl arabic mb-2">${pattern.tilka.combinedText} ${pattern.singularNoun.text}</div>
                <p class="text-purple-800">Translation: "That is ${pattern.singularNoun.lemma}" or "That ${pattern.singularNoun.lemma}"</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar Notes:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li><strong>تِلْكَ</strong> is a far feminine demonstrative pronoun (اسم إشارة مؤنث للبعيد)</li>
                    <li><strong>${pattern.singularNoun.text}</strong> is indefinite (نكرة) and singular</li>
                    <li><strong>Nominative case (رفع):</strong> the noun is in the subject/predicate position</li>
                    <li><strong>Feminine agreement:</strong> demonstrative agrees with feminine nouns</li>
                    <li><strong>Far reference:</strong> indicates distance (physical, temporal, or abstract)</li>
                    <li>This forms a <strong>far feminine demonstrative phrase</strong></li>
                    <li>Used for <strong>identification of distant feminine entities</strong></li>
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

  return {
    examples,
    tilkaPatterns,
    tiCount,
    loCount,
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
      tilkaPatterns,
      tiCount,
      loCount,
      kaCount,
      completeCount,
    } = findTilkaSingIndefExamples(records);
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
        totalTilkaPatterns: tilkaPatterns.length,
        samplePatterns: tilkaPatterns.slice(0, 5),
        tiCount,
        loCount,
        kaCount,
        completeCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
