import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function nahnuPredicateOk(nextRecord) {
  const nd = nextRecord.NominalDerivation;
  return (
    (nd && String(nd).includes('ACT_PCPL')) ||
    (nd && String(nd).includes('PASS_PCPL')) ||
    (!nd ||
      (!String(nd).includes('ACT_PCPL') && !String(nd).includes('PASS_PCPL')))
  );
}

function findNahnuActpcplExamples(records) {
  const nahnuPatterns = [];
  const examples = [];

  for (let i = 0; i < records.length - 1; i++) {
    const currentRecord = records[i];
    const nextRecord = records[i + 1];
    if (currentRecord.Text === 'نَحْنُ' && currentRecord.TextBw === 'naHonu') {
      const nd = nextRecord?.NominalDerivation;
      if (
        nextRecord &&
        nextRecord.PartOfSpeech === 'N' &&
        nextRecord.Text &&
        String(nextRecord.Text).trim() !== '' &&
        !(nd && String(nd).includes('COMP')) &&
        nahnuPredicateOk(nextRecord)
      ) {
        nahnuPatterns.push({
          nahnu: {
            surahId: currentRecord.SurahId,
            ayahNo: currentRecord.AyahNo,
            wordNo: currentRecord.WordNo,
            text: currentRecord.Text,
            textBw: currentRecord.TextBw,
          },
          predicate: {
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
          },
        });
      }
    }
  }

  nahnuPatterns.forEach((pattern, index) => {
    const pnd = String(pattern.predicate.nominalDerivation || '');
    const isAct = pnd && pnd.includes('ACT_PCPL');
    const isPass = pnd && pnd.includes('PASS_PCPL');
    const predLabel = isAct
      ? 'Active Participle'
      : isPass
        ? 'Passive Participle'
        : 'Noun';
    const predHtmlLabel = isAct
      ? 'Active Participle'
      : isPass
        ? 'Passive Participle'
        : 'Noun';
    const meaningSuffix = isAct
      ? '(active participle)'
      : isPass
        ? '(passive participle)'
        : pattern.predicate.nominalState &&
            String(pattern.predicate.nominalState).includes('INDEF')
          ? '(indefinite)'
          : '(definite)';
    const transSuffix = isAct
      ? '(doing the action)'
      : isPass
        ? '(receiving the action)'
        : '';
    const liAct = isAct
      ? '<li>Active participles describe those who perform an action</li>'
      : isPass
        ? '<li>Passive participles describe those who receive an action</li>'
        : '<li>This noun serves as the predicate describing the group</li>';
    const predGrammar = isAct
      ? 'an active participle (اسم فاعل)'
      : isPass
        ? 'a passive participle (اسم مفعول)'
        : 'a noun';

    examples.push({
      surahId: parseInt(String(pattern.nahnu.surahId), 10),
      ayahNo: parseInt(String(pattern.nahnu.ayahNo), 10),
      words: [
        { wordNo: parseInt(String(pattern.nahnu.wordNo), 10) },
        { wordNo: parseInt(String(pattern.predicate.wordNo), 10) },
      ],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>Nahnu + Predicate Pattern ${index + 1}</h3>
            <div class="bg-cyan-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-cyan-900 text-lg mb-3">Sentence Structure: نَحْنُ + ${predLabel}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">Subject Pronoun</h5>
                  <div class="text-2xl arabic mb-2">${pattern.nahnu.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.nahnu.textBw}</div>
                  <p class="text-green-700">Meaning: "We are" (1st person plural)</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">Predicate (${predHtmlLabel})</h5>
                  <div class="text-2xl arabic mb-2">${pattern.predicate.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.predicate.textBw}</div>
                  <p class="text-amber-700">Meaning: "${pattern.predicate.lemma}" ${meaningSuffix}</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.predicate.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.predicate.nominalCase || 'N/A'}</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Complete Sentence:</h5>
                <div class="text-xl arabic mb-2">${pattern.nahnu.text} ${pattern.predicate.text}</div>
                <p class="text-purple-800">Translation: "We are ${pattern.predicate.lemma}" ${transSuffix}</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar Notes:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li><strong>نَحْنُ</strong> is a subject pronoun (1st person plural)</li>
                    <li><strong>${pattern.predicate.text}</strong> is ${predGrammar}</li>
                    ${liAct}
                    <li>This forms a nominal sentence (جملة اسمية)</li>
                    <li>Used for <strong>collective self-description</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          `,
        },
      ],
    });
  });

  return { examples, nahnuPatterns };
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

    const { examples, nahnuPatterns } = findNahnuActpcplExamples(records);
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
        totalNahnuPatterns: nahnuPatterns.length,
        samplePatterns: nahnuPatterns.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
