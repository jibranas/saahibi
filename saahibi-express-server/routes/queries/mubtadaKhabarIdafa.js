import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function getCaseLabel(c) {
  if (!c) return 'N/A';
  const s = String(c);
  if (s.includes('NOM')) return 'Nominative (مرفوع)';
  if (s.includes('ACC')) return 'Accusative (منصوب)';
  if (s.includes('GEN')) return 'Genitive (مجرور)';
  return s;
}

function findMubtadaKhabarIdafaPatterns(records) {
  const wordMap = new Map();

  for (const record of records) {
    if (!record.SurahId || !record.AyahNo || !record.WordNo) continue;
    const key = `${record.SurahId}-${record.AyahNo}-${record.WordNo}`;

    if (!wordMap.has(key)) {
      wordMap.set(key, {
        surahId: record.SurahId,
        ayahNo: record.AyahNo,
        wordNo: record.WordNo,
        hasDET: false,
        nounSegment: null,
        allSegments: [],
        combinedText: '',
        combinedTextBw: '',
      });
    }

    const word = wordMap.get(key);
    word.allSegments.push(record);

    if (record.Text && String(record.Text).trim()) {
      word.combinedText += record.Text;
      word.combinedTextBw += record.TextBw || '';
    }

    if (record.PrefixType && String(record.PrefixType).includes('DET')) {
      word.hasDET = true;
    }

    if (
      record.PartOfSpeech === 'N' &&
      record.NominalCase &&
      String(record.NominalCase).trim()
    ) {
      word.nounSegment = record;
    }
  }

  const ayahWords = new Map();
  for (const word of wordMap.values()) {
    const ayahKey = `${word.surahId}-${word.ayahNo}`;
    if (!ayahWords.has(ayahKey)) ayahWords.set(ayahKey, []);
    ayahWords.get(ayahKey).push(word);
  }

  for (const words of ayahWords.values()) {
    words.sort((a, b) => parseInt(a.wordNo, 10) - parseInt(b.wordNo, 10));
  }

  const patterns = [];

  for (const [, words] of ayahWords.entries()) {
    for (let i = 0; i < words.length - 2; i++) {
      const w1 = words[i];
      const w2 = words[i + 1];
      const w3 = words[i + 2];

      if (!w1.nounSegment || !w2.nounSegment || !w3.nounSegment) continue;

      const n1 = w1.nounSegment;
      const n2 = w2.nounSegment;
      const n3 = w3.nounSegment;

      if (
        w1.allSegments.length > 2 ||
        w2.allSegments.length > 2 ||
        w3.allSegments.length > 2
      )
        continue;

      const case1 = String(n1.NominalCase || '').trim();
      if (case1 !== 'NOM') continue;
      const isIndef1 = String(n1.NominalState || '').includes('INDEF');
      if (isIndef1) continue;

      const case2 = String(n2.NominalCase || '').trim();
      if (case2 !== 'NOM') continue;
      const isIndef2 = String(n2.NominalState || '').includes('INDEF');
      if (isIndef2) continue;
      if (w2.hasDET) continue;

      const case3 = String(n3.NominalCase || '').trim();
      if (case3 !== 'GEN') continue;

      const mubtadaState = w1.hasDET
        ? 'Definite (معرفة) - ال'
        : 'Definite (معرفة)';

      patterns.push({
        mubtada: {
          surahId: w1.surahId,
          ayahNo: w1.ayahNo,
          wordNo: w1.wordNo,
          text: w1.combinedText,
          textBw: w1.combinedTextBw,
          lemma: n1.Lemma,
          root: n1.Root,
          nominalCase: case1,
          state: mubtadaState,
          hasDET: w1.hasDET,
          nominalDerivation: n1.NominalDerivation || '',
        },
        mudaf: {
          surahId: w2.surahId,
          ayahNo: w2.ayahNo,
          wordNo: w2.wordNo,
          text: w2.combinedText,
          textBw: w2.combinedTextBw,
          lemma: n2.Lemma,
          root: n2.Root,
          nominalCase: case2,
          nominalDerivation: n2.NominalDerivation || '',
        },
        mudafIlayhi: {
          surahId: w3.surahId,
          ayahNo: w3.ayahNo,
          wordNo: w3.wordNo,
          text: w3.combinedText,
          textBw: w3.combinedTextBw,
          lemma: n3.Lemma,
          root: n3.Root,
          nominalCase: case3,
          hasDET: w3.hasDET,
          nominalDerivation: n3.NominalDerivation || '',
        },
      });
    }
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

    const patterns = findMubtadaKhabarIdafaPatterns(records);
    const limitedPatterns = patterns.slice(0, limit);

    const examples = [];
    limitedPatterns.forEach((pattern, index) => {
      examples.push({
        surahId: Number(pattern.mubtada.surahId),
        ayahNo: Number(pattern.mubtada.ayahNo),
        words: [
          { wordNo: Number(pattern.mubtada.wordNo) },
          { wordNo: Number(pattern.mudaf.wordNo) },
          { wordNo: Number(pattern.mudafIlayhi.wordNo) },
        ],
        beforeInterlude: [
          {
            type: 'text',
            content: `
            <h3>Mubtada + Khabar as Idafa — Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">مبتدأ + خبر (مضاف + مضاف إليه)</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="bg-blue-50 p-3 rounded">
                  <h5 class="font-bold text-blue-800 mb-2">مبتدأ (Subject)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.mubtada.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.mubtada.textBw}</div>
                  <p class="text-blue-700">Lemma: ${pattern.mubtada.lemma || 'N/A'}</p>
                  <p class="text-xs text-gray-600 mt-1">Case: ${getCaseLabel(pattern.mubtada.nominalCase)}</p>
                  <p class="text-xs text-gray-600">State: ${pattern.mubtada.state}</p>
                  ${pattern.mubtada.nominalDerivation ? `<p class="text-xs text-gray-600">Derivation: ${pattern.mubtada.nominalDerivation}</p>` : ''}
                </div>
                <div class="bg-green-50 p-3 rounded border-2 border-dashed border-green-300">
                  <h5 class="font-bold text-green-800 mb-1">خبر / مضاف</h5>
                  <p class="text-xs text-green-600 mb-2">(Predicate / 1st part of Idafa)</p>
                  <div class="text-2xl arabic mb-2">${pattern.mudaf.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.mudaf.textBw}</div>
                  <p class="text-green-700">Lemma: ${pattern.mudaf.lemma || 'N/A'}</p>
                  <p class="text-xs text-gray-600 mt-1">Case: ${getCaseLabel(pattern.mudaf.nominalCase)}</p>
                  <p class="text-xs text-gray-600">State: Construct (مضاف) — no ال, no تنوين</p>
                  ${pattern.mudaf.nominalDerivation ? `<p class="text-xs text-gray-600">Derivation: ${pattern.mudaf.nominalDerivation}</p>` : ''}
                </div>
                <div class="bg-amber-50 p-3 rounded border-2 border-dashed border-amber-300">
                  <h5 class="font-bold text-amber-800 mb-1">مضاف إليه</h5>
                  <p class="text-xs text-amber-600 mb-2">(2nd part of Idafa)</p>
                  <div class="text-2xl arabic mb-2">${pattern.mudafIlayhi.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.mudafIlayhi.textBw}</div>
                  <p class="text-amber-700">Lemma: ${pattern.mudafIlayhi.lemma || 'N/A'}</p>
                  <p class="text-xs text-gray-600 mt-1">Case: ${getCaseLabel(pattern.mudafIlayhi.nominalCase)}</p>
                  <p class="text-xs text-gray-600">Always مجرور (Genitive)</p>
                  ${pattern.mudafIlayhi.nominalDerivation ? `<p class="text-xs text-gray-600">Derivation: ${pattern.mudafIlayhi.nominalDerivation}</p>` : ''}
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Full Structure:</h5>
                <div class="text-xl arabic mb-2">${pattern.mubtada.text} ${pattern.mudaf.text} ${pattern.mudafIlayhi.text}</div>
                <div class="mt-3 text-sm">
                  <p class="mb-2"><strong>${pattern.mubtada.text}</strong> = مبتدأ (definite subject, NOM)</p>
                  <p class="mb-2"><span class="inline-block border border-dashed border-green-400 px-2 rounded"><strong>${pattern.mudaf.text} ${pattern.mudafIlayhi.text}</strong></span> = خبر as إضافة (Idafa)</p>
                  <div class="grid grid-cols-3 gap-2 mt-3">
                    <div class="flex items-center gap-1"><span class="text-blue-600 font-bold">&#10003;</span> مبتدأ: NOM + Definite</div>
                    <div class="flex items-center gap-1"><span class="text-green-600 font-bold">&#10003;</span> مضاف: NOM (no ال, no تنوين)</div>
                    <div class="flex items-center gap-1"><span class="text-amber-600 font-bold">&#10003;</span> مضاف إليه: GEN</div>
                  </div>
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
