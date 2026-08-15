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

function findHaulaiIndefExamples(records) {
  const haulaiPatterns = [];
  const examples = [];
  let haCount = 0;
  let ulaiCount = 0;

  for (let i = 0; i < records.length - 2; i++) {
    const haRecord = records[i];
    const ulaiRecord = records[i + 1];
    const nextRecord = records[i + 2];

    if (haRecord.Text === 'هَٰٓ') {
      haCount++;
    }

    if (ulaiRecord && ulaiRecord.TextBw && String(ulaiRecord.TextBw).includes('&ulaA')) {
      ulaiCount++;
    }

    if (
      haRecord.Text === 'هَٰٓ' &&
      haRecord.TextBw &&
      String(haRecord.TextBw).includes('ha`^') &&
      ulaiRecord &&
      ulaiRecord.TextBw &&
      String(ulaiRecord.TextBw).includes('&ulaA') &&
      sameWordMorph(haRecord, ulaiRecord)
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
        haulaiPatterns.push({
          haulai: {
            surahId: haRecord.SurahId,
            ayahNo: haRecord.AyahNo,
            wordNo: haRecord.WordNo,
            haText: haRecord.Text,
            haTextBw: haRecord.TextBw,
            ulaiText: ulaiRecord.Text,
            ulaiTextBw: ulaiRecord.TextBw,
            combinedText: `${haRecord.Text}${ulaiRecord.Text}`,
            combinedTextBw: `${haRecord.TextBw}${ulaiRecord.TextBw}`,
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

  haulaiPatterns.forEach((pattern, index) => {
    const ind = pattern.indefiniteNoun;
    const nd = String(ind.nominalDerivation || '');
    const nounKind = nd.includes('ACT_PCPL')
      ? '(active participle)'
      : nd.includes('PASS_PCPL')
        ? '(passive participle)'
        : '(noun)';
    const numStr = String(ind.number ?? '');
    const numLabel =
      numStr === '1'
        ? 'Singular'
        : numStr === '2'
          ? 'Dual'
          : numStr === '3'
            ? 'Plural'
            : ind.number || 'N/A';
    const genStr = String(ind.gender ?? '');
    const genLabel =
      genStr === '1'
        ? 'Masculine'
        : genStr === '2'
          ? 'Feminine'
          : ind.gender || 'N/A';
    const indefMarker =
      ind.nominalState && String(ind.nominalState).includes('INDEF')
        ? 'INDEF marker'
        : 'tanween or lack of ال';

    examples.push({
      surahId: parseInt(String(pattern.haulai.surahId), 10),
      ayahNo: parseInt(String(pattern.haulai.ayahNo), 10),
      words: [
        { wordNo: parseInt(String(pattern.haulai.wordNo), 10) },
        { wordNo: parseInt(String(pattern.indefiniteNoun.wordNo), 10) },
      ],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>Haulai + Indefinite Noun Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">Sentence Structure: هَٰؤُلَآءِ + Indefinite Noun</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">Plural Demonstrative</h5>
                  <div class="text-2xl arabic mb-2">${pattern.haulai.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.haulai.combinedTextBw}</div>
                  <p class="text-green-700">Meaning: "These" (plural)</p>
                  <p class="text-xs text-gray-600 mt-1">Plural demonstrative pronoun</p>
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
                <div class="text-xl arabic mb-2">${pattern.haulai.combinedText} ${pattern.indefiniteNoun.text}</div>
                <p class="text-purple-800">Translation: "These are ${pattern.indefiniteNoun.lemma}" or "These ${pattern.indefiniteNoun.lemma}"</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar Notes:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li><strong>هَٰؤُلَآءِ</strong> is a plural demonstrative pronoun (اسم إشارة للجمع)</li>
                    <li><strong>${pattern.indefiniteNoun.text}</strong> is indefinite (نكرة) as indicated by ${indefMarker}</li>
                    <li><strong>Nominative case (رفع):</strong> the noun is in the subject/predicate position</li>
                    <li><strong>Plural reference:</strong> demonstrative points to multiple entities (3 or more)</li>
                    <li>This forms a <strong>plural demonstrative phrase</strong></li>
                    <li>Used for <strong>identification of groups</strong> or multiple entities</li>
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

  return { examples, haulaiPatterns, haCount, ulaiCount };
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

    const { examples, haulaiPatterns, haCount, ulaiCount } =
      findHaulaiIndefExamples(records);
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
        totalHaulaiPatterns: haulaiPatterns.length,
        samplePatterns: haulaiPatterns.slice(0, 5),
        haCount,
        ulaiCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
