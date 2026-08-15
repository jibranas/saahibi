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

function findHathaniNomExamples(records) {
  const hathaniPatterns = [];
  const examples = [];

  for (let i = 0; i < records.length - 3; i++) {
    const haRecord = records[i];
    const thaniRecord = records[i + 1];
    const nextRecord = records[i + 2];
    const targetRecord = records[i + 3];

    if (
      haRecord.Text === 'هَٰ' &&
      haRecord.TextBw &&
      String(haRecord.TextBw).includes('ha`') &&
      thaniRecord.LemmaBw === '*A' &&
      (thaniRecord.TextBw === '*a`ni' || thaniRecord.TextBw === '*aAni') &&
      sameWordMorph(haRecord, thaniRecord)
    ) {
      let nounRecord = null;
      const wordsToHighlight = [parseInt(String(haRecord.WordNo), 10)];

      if (
        nextRecord &&
        nextRecord.PartOfSpeech === 'N' &&
        nextRecord.NominalCase &&
        String(nextRecord.NominalCase).includes('NOM') &&
        nextRecord.Text &&
        String(nextRecord.Text).trim() !== ''
      ) {
        nounRecord = nextRecord;
        wordsToHighlight.push(parseInt(String(nextRecord.WordNo), 10));
      } else if (
        targetRecord &&
        targetRecord.PartOfSpeech === 'N' &&
        targetRecord.NominalCase &&
        String(targetRecord.NominalCase).includes('NOM') &&
        targetRecord.Text &&
        String(targetRecord.Text).trim() !== ''
      ) {
        nounRecord = targetRecord;
        if (nextRecord && nextRecord.Text && String(nextRecord.Text).trim() !== '') {
          wordsToHighlight.push(parseInt(String(nextRecord.WordNo), 10));
        }
        wordsToHighlight.push(parseInt(String(targetRecord.WordNo), 10));
      }

      if (nounRecord) {
        hathaniPatterns.push({
          hathani: {
            surahId: haRecord.SurahId,
            ayahNo: haRecord.AyahNo,
            wordNo: haRecord.WordNo,
            haText: haRecord.Text,
            haTextBw: haRecord.TextBw,
            thaniText: thaniRecord.Text,
            thaniTextBw: thaniRecord.TextBw,
            combinedText: `${haRecord.Text}${thaniRecord.Text}`,
            combinedTextBw: `${haRecord.TextBw}${thaniRecord.TextBw}`,
          },
          nominativeNoun: {
            surahId: nounRecord.SurahId,
            ayahNo: nounRecord.AyahNo,
            wordNo: nounRecord.WordNo,
            text: nounRecord.Text,
            textBw: nounRecord.TextBw,
            lemma: nounRecord.Lemma,
            root: nounRecord.Root,
            nominalCase: nounRecord.NominalCase,
            nominalState: nounRecord.NominalState,
            nominalDerivation: nounRecord.NominalDerivation,
            number: nounRecord.Number,
          },
          wordsToHighlight,
        });
      }
    }
  }

  hathaniPatterns.forEach((pattern, index) => {
    const nnd = String(pattern.nominativeNoun.nominalDerivation || '');
    const isAct = nnd && nnd.includes('ACT_PCPL');
    const lemmaLine = isAct
      ? '(active participle)'
      : '(noun)';
    const numStr = String(pattern.nominativeNoun.number ?? '');
    const numLabel =
      numStr === '2'
        ? 'Dual (2)'
        : pattern.nominativeNoun.number || 'N/A';

    examples.push({
      surahId: parseInt(String(pattern.hathani.surahId), 10),
      ayahNo: parseInt(String(pattern.hathani.ayahNo), 10),
      words: pattern.wordsToHighlight.map((wordNo) => ({ wordNo })),
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>Hathani + Nominative Noun Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">Sentence Structure: هَٰذَانِ + Nominative Noun</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">Dual Demonstrative</h5>
                  <div class="text-2xl arabic mb-2">${pattern.hathani.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.hathani.combinedTextBw}</div>
                  <p class="text-green-700">Meaning: "These two" (masculine dual)</p>
                  <p class="text-xs text-gray-600 mt-1">Dual demonstrative pronoun (masculine)</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">Nominative Noun</h5>
                  <div class="text-2xl arabic mb-2">${pattern.nominativeNoun.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.nominativeNoun.textBw}</div>
                  <p class="text-amber-700">Meaning: "${pattern.nominativeNoun.lemma}" ${lemmaLine}</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.nominativeNoun.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.nominativeNoun.nominalCase || 'N/A'} (رفع)</p>
                  <p class="text-xs text-gray-600">Number: ${numLabel}</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Complete Sentence:</h5>
                <div class="text-xl arabic mb-2">${pattern.hathani.combinedText} ${pattern.nominativeNoun.text}</div>
                <p class="text-purple-800">Translation: "These two are ${pattern.nominativeNoun.lemma}" or "These two ${pattern.nominativeNoun.lemma}"</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar Notes:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li><strong>هَٰذَانِ</strong> is a dual demonstrative pronoun (اسم إشارة للمثنى)</li>
                    <li><strong>${pattern.nominativeNoun.text}</strong> is in nominative case (رفع)</li>
                    <li><strong>Dual agreement:</strong> demonstrative points to exactly two entities</li>
                    <li>This forms a <strong>dual demonstrative phrase</strong></li>
                    <li>Used for <strong>identification of pairs</strong> or two specific entities</li>
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

  return { examples, hathaniPatterns };
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

    const { examples, hathaniPatterns } = findHathaniNomExamples(records);
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
        totalHathaniPatterns: hathaniPatterns.length,
        samplePatterns: hathaniPatterns.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
