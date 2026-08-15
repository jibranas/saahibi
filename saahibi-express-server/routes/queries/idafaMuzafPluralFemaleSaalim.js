import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function wordIdKey(r) {
  return `${r.SurahId}-${r.AyahNo}-${r.WordNo}`;
}

function getCaseLabel(nominalCase) {
  if (nominalCase === 'NOM') return 'مرفوع - Nominative';
  if (nominalCase === 'ACC') return 'منصوب - Accusative';
  if (nominalCase === 'GEN') return 'مجرور - Genitive';
  return nominalCase || 'N/A';
}

function numLabel(n) {
  return String(n) === '1'
    ? 'Singular'
    : String(n) === '2'
      ? 'Dual'
      : String(n) === '3'
        ? 'Plural'
        : n || 'N/A';
}

function genLabel(g) {
  return String(g) === '1'
    ? 'Masculine'
    : String(g) === '2'
      ? 'Feminine'
      : g || 'N/A';
}

/** Same as source route: sound feminine plural Buckwalter ending on combined مضاف */
const MUZAF_FEM_SAALIM_BW = /[A`]t[iKuN]$/;

function findIdafaMuzafPluralFemaleSaalimPatterns(records) {
  const patterns = [];
  const processedWordIds = new Set();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.PartOfSpeech !== 'N') continue;

    const wid = wordIdKey(record);
    if (processedWordIds.has(wid)) continue;

    const nomState = String(record.NominalState || '').trim();
    if (nomState !== '') continue;
    if (!record.NominalCase || String(record.NominalCase).trim() === '') continue;

    let hasDet = false;
    let wordStart = i;
    while (wordStart > 0 && wordIdKey(records[wordStart - 1]) === wid) {
      wordStart--;
    }

    const muzafSegments = [];
    let j = wordStart;
    while (j < records.length && wordIdKey(records[j]) === wid) {
      muzafSegments.push(records[j]);
      if (
        records[j].PrefixType &&
        String(records[j].PrefixType).includes('DET')
      ) {
        hasDet = true;
      }
      j++;
    }
    if (hasDet) continue;
    processedWordIds.add(wid);

    const muzafCombinedBw = muzafSegments.map((s) => s.TextBw || '').join('');
    if (String(record.Gender ?? '') !== '2' || String(record.Number ?? '') !== '3')
      continue;
    if (!MUZAF_FEM_SAALIM_BW.test(muzafCombinedBw)) continue;

    if (j >= records.length || records[j].AyahId != record.AyahId) continue;
    const nextWordId = wordIdKey(records[j]);
    const ilaySegments = [];
    let ilayNoun = null;
    while (j < records.length && wordIdKey(records[j]) === nextWordId) {
      ilaySegments.push(records[j]);
      if (
        records[j].PartOfSpeech === 'N' &&
        records[j].NominalCase &&
        String(records[j].NominalCase).includes('GEN') &&
        !ilayNoun
      ) {
        ilayNoun = records[j];
      }
      j++;
    }
    if (!ilayNoun) continue;

    const muzafCombinedText = muzafSegments.map((s) => s.Text || '').join('');
    const muzafCombinedTextBw = muzafCombinedBw;
    const ilayCombinedText = ilaySegments.map((s) => s.Text || '').join('');
    const ilayCombinedTextBw = ilaySegments.map((s) => s.TextBw || '').join('');

    patterns.push({
      muzaf: {
        surahId: muzafSegments[0].SurahId,
        ayahNo: muzafSegments[0].AyahNo,
        wordNo: muzafSegments[0].WordNo,
        combinedText: muzafCombinedText,
        combinedTextBw: muzafCombinedTextBw,
        lemma: record.Lemma,
        root: record.Root,
        nominalCase: record.NominalCase,
        caseLabel: getCaseLabel(record.NominalCase),
        number: record.Number,
        gender: record.Gender,
      },
      muzafIlayhi: {
        wordNo: ilaySegments[0].WordNo,
        combinedText: ilayCombinedText,
        combinedTextBw: ilayCombinedTextBw,
        lemma: ilayNoun.Lemma,
        root: ilayNoun.Root,
        nominalCase: ilayNoun.NominalCase,
        nominalState: ilayNoun.NominalState,
        number: ilayNoun.Number,
        gender: ilayNoun.Gender,
      },
    });
  }

  return patterns;
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

    const patterns = findIdafaMuzafPluralFemaleSaalimPatterns(records);
    const limitedPatterns = patterns.slice(0, limit);

    const examples = [];
    limitedPatterns.forEach((pattern, index) => {
      const ilayStateLabel =
        pattern.muzafIlayhi.nominalState === 'INDEF'
          ? 'نكرة - Indefinite'
          : 'معرفة - Definite';
      examples.push({
        surahId: Number(pattern.muzaf.surahId),
        ayahNo: Number(pattern.muzaf.ayahNo),
        words: [
          { wordNo: Number(pattern.muzaf.wordNo) },
          { wordNo: Number(pattern.muzafIlayhi.wordNo) },
        ],
        beforeInterlude: [
          {
            type: 'text',
            content: `
            <h3>Idafa: مضاف جمع مؤنث سالم — Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">Structure: مضاف (جمع مؤنث سالم) + مضاف إليه</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">المضاف — جمع مؤنث سالم (Muzaf: Sound Fem. Plural)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.muzaf.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.muzaf.combinedTextBw}</div>
                  <p class="text-green-700">"${pattern.muzaf.lemma}"</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.muzaf.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.muzaf.caseLabel}</p>
                  <p class="text-xs text-gray-600">Number: Plural | Gender: Feminine | Sound plural (ـات)</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">المضاف إليه (any number/gender)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.muzafIlayhi.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.muzafIlayhi.combinedTextBw}</div>
                  <p class="text-amber-700">"${pattern.muzafIlayhi.lemma}"</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.muzafIlayhi.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: مجرور - Genitive</p>
                  <p class="text-xs text-gray-600">State: ${ilayStateLabel}</p>
                  <p class="text-xs text-gray-600">Number: ${numLabel(pattern.muzafIlayhi.number)} | Gender: ${genLabel(pattern.muzafIlayhi.gender)}</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Complete Idafa:</h5>
                <div class="text-xl arabic mb-2">${pattern.muzaf.combinedText} ${pattern.muzafIlayhi.combinedText}</div>
                <p class="text-purple-800">"${pattern.muzaf.lemma}" of "${pattern.muzafIlayhi.lemma}"</p>
              </div>
            </div>
          `,
          },
        ],
      });
    });

    const wordRefs = [];
    for (const ex of examples) {
      for (const w of ex.words) {
        wordRefs.push({
          surahId: ex.surahId,
          ayahNo: ex.ayahNo,
          wordNo: w.wordNo,
        });
      }
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of examples) {
      for (const w of ex.words) {
        w.translations =
          translationMap.get(wordKey(ex.surahId, ex.ayahNo, w.wordNo)) || null;
      }
    }

    res.json({
      count: examples.length,
      totalPatterns: patterns.length,
      scannedSegments: records.length,
      limit,
      filter,
      examples,
      debug: { totalPatterns: patterns.length, samplePatterns: patterns.slice(0, 5) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
