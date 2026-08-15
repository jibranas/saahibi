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

function findIdafaDualMubtadaKhabarPatterns(records) {
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

    if (String(record.Number ?? '') !== '2') continue;

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

    if (j >= records.length || records[j].AyahId != record.AyahId) continue;

    const ilayWordId = wordIdKey(records[j]);
    const ilaySegments = [];
    let ilayNoun = null;

    while (j < records.length && wordIdKey(records[j]) === ilayWordId) {
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

    if (j >= records.length || records[j].AyahId != record.AyahId) continue;

    const khabarWordId = wordIdKey(records[j]);
    const khabarSegments = [];
    let khabarNoun = null;

    while (j < records.length && wordIdKey(records[j]) === khabarWordId) {
      khabarSegments.push(records[j]);
      if (
        records[j].PartOfSpeech === 'N' &&
        records[j].NominalState &&
        String(records[j].NominalState).includes('INDEF') &&
        records[j].Text &&
        String(records[j].Text).trim() !== '' &&
        !khabarNoun
      ) {
        khabarNoun = records[j];
      }
      j++;
    }

    if (!khabarNoun) continue;

    const muzafCombinedText = muzafSegments.map((s) => s.Text || '').join('');
    const muzafCombinedTextBw = muzafSegments.map((s) => s.TextBw || '').join('');
    const ilayCombinedText = ilaySegments.map((s) => s.Text || '').join('');
    const ilayCombinedTextBw = ilaySegments.map((s) => s.TextBw || '').join('');
    const khabarCombinedText = khabarSegments.map((s) => s.Text || '').join('');
    const khabarCombinedTextBw = khabarSegments.map((s) => s.TextBw || '').join('');

    const ilayStateLabel =
      ilayNoun.NominalState === 'INDEF'
        ? 'نكرة - Indefinite'
        : 'معرفة - Definite';

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
        stateLabel: ilayStateLabel,
        number: ilayNoun.Number,
        gender: ilayNoun.Gender,
      },
      khabar: {
        wordNo: khabarSegments[0].WordNo,
        combinedText: khabarCombinedText,
        combinedTextBw: khabarCombinedTextBw,
        lemma: khabarNoun.Lemma,
        root: khabarNoun.Root,
        nominalCase: khabarNoun.NominalCase,
        nominalState: khabarNoun.NominalState,
        nominalDerivation: khabarNoun.NominalDerivation,
        caseLabel: getCaseLabel(khabarNoun.NominalCase),
        number: khabarNoun.Number,
        gender: khabarNoun.Gender,
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

    const patterns = findIdafaDualMubtadaKhabarPatterns(records);
    const limitedPatterns = patterns.slice(0, limit);

    const examples = [];
    limitedPatterns.forEach((pattern, index) => {
      examples.push({
        surahId: Number(pattern.muzaf.surahId),
        ayahNo: Number(pattern.muzaf.ayahNo),
        words: [
          { wordNo: Number(pattern.muzaf.wordNo) },
          { wordNo: Number(pattern.muzafIlayhi.wordNo) },
          { wordNo: Number(pattern.khabar.wordNo) },
        ],
        beforeInterlude: [
          {
            type: 'text',
            content: `
            <h3>Idafa (Dual Mudaf) as Mubtada + Khabar — Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">[مضاف مثنى + مضاف إليه] (مبتدأ) → خبر</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">المضاف (مثنى — Dual)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.muzaf.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.muzaf.combinedTextBw}</div>
                  <p class="text-green-700">"${pattern.muzaf.lemma}"</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.muzaf.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.muzaf.caseLabel}</p>
                  <p class="text-xs text-gray-600">Construct state (no ال, no tanween)</p>
                  <p class="text-xs text-gray-600 font-bold">Number: <strong>Dual (مثنى)</strong></p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">المضاف إليه (Muzaf Ilayhi)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.muzafIlayhi.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.muzafIlayhi.combinedTextBw}</div>
                  <p class="text-amber-700">"${pattern.muzafIlayhi.lemma}"</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.muzafIlayhi.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: مجرور - Genitive</p>
                  <p class="text-xs text-gray-600">State: ${pattern.muzafIlayhi.stateLabel}</p>
                </div>
                <div class="bg-red-50 p-3 rounded">
                  <h5 class="font-bold text-red-800 mb-2">الخبر (Khabar)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.khabar.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.khabar.combinedTextBw}</div>
                  <p class="text-red-700">"${pattern.khabar.lemma}" ${pattern.khabar.nominalDerivation && String(pattern.khabar.nominalDerivation).includes('ACT_PCPL') ? '(active participle)' : pattern.khabar.nominalDerivation && String(pattern.khabar.nominalDerivation).includes('PASS_PCPL') ? '(passive participle)' : '(noun)'}</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.khabar.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.khabar.caseLabel}</p>
                  <p class="text-xs text-gray-600">State: نكرة - Indefinite</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Complete Nominal Sentence (جملة اسمية):</h5>
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <div class="bg-blue-100 px-3 py-1 rounded">
                    <span class="text-xs font-bold text-blue-800">مبتدأ (إضافة — مضاف مثنى)</span>
                  </div>
                  <div class="text-xl arabic">${pattern.muzaf.combinedText} ${pattern.muzafIlayhi.combinedText}</div>
                  <div class="bg-red-100 px-3 py-1 rounded">
                    <span class="text-xs font-bold text-red-800">خبر</span>
                  </div>
                  <div class="text-xl arabic">${pattern.khabar.combinedText}</div>
                </div>
                <p class="text-purple-800">Translation: "${pattern.muzaf.lemma} of ${pattern.muzafIlayhi.lemma} is ${pattern.khabar.lemma}"</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar Notes:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li>The <strong>مضاف</strong> is <strong>dual (مثنى)</strong> — e.g. انِ (NOM) or يْنِ (GEN/ACC)</li>
                    <li><strong>${pattern.muzaf.combinedText} ${pattern.muzafIlayhi.combinedText}</strong> = إضافة acting as <strong>مبتدأ</strong></li>
                    <li><strong>${pattern.khabar.combinedText}</strong> = <strong>خبر</strong> — indefinite (نكرة)</li>
                    <li>The مضاف إليه is always مجرور</li>
                  </ul>
                </div>
              </div>
            </div>
          `,
          },
        ],
      });
    });

    const wordRefs = [];
    for (const ex of examples) {
      const sid = ex.surahId;
      const an = ex.ayahNo;
      for (const w of ex.words) {
        wordRefs.push({ surahId: sid, ayahNo: an, wordNo: w.wordNo });
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
      debug: {
        totalPatterns: patterns.length,
        limitedTo: limit,
        samplePatterns: patterns.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
