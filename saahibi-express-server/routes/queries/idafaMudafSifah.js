import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function getCaseLabel(c) {
  if (!c) return 'N/A';
  if (c.includes('NOM')) return 'Nominative (مرفوع)';
  if (c.includes('ACC')) return 'Accusative (منصوب)';
  if (c.includes('GEN')) return 'Genitive (مجرور)';
  return c;
}

function findIdafaMudafSifahPatterns(records) {
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

      if (w1.hasDET) continue;
      const isIndef1 = String(n1.NominalState || '').includes('INDEF');
      if (isIndef1) continue;

      const case2 = String(n2.NominalCase || '').trim();
      if (case2 !== 'GEN') continue;

      const case1 = String(n1.NominalCase || '').trim();
      const case3 = String(n3.NominalCase || '').trim();
      if (!case1 || !case3 || case1 !== case3) continue;

      const g1 = parseInt(String(n1.Gender || '0').trim(), 10) || 0;
      const g3 = parseInt(String(n3.Gender || '0').trim(), 10) || 0;
      if (g1 !== 0 && g3 !== 0 && g1 !== g3) continue;

      const num1Raw = parseInt(String(n1.Number || '0').trim(), 10) || 0;
      const num3Raw = parseInt(String(n3.Number || '0').trim(), 10) || 0;
      const num1 = num1Raw === 0 ? 1 : num1Raw;
      const num3 = num3Raw === 0 ? 1 : num3Raw;
      if (num1 !== num3) continue;

      patterns.push({
        mudaf: {
          surahId: w1.surahId,
          ayahNo: w1.ayahNo,
          wordNo: w1.wordNo,
          text: w1.combinedText,
          textBw: w1.combinedTextBw,
          lemma: n1.Lemma,
          root: n1.Root,
          nominalCase: case1,
        },
        mudafIlayhi: {
          surahId: w2.surahId,
          ayahNo: w2.ayahNo,
          wordNo: w2.wordNo,
          text: w2.combinedText,
          textBw: w2.combinedTextBw,
          lemma: n2.Lemma,
          root: n2.Root,
          nominalCase: case2,
        },
        sifah: {
          surahId: w3.surahId,
          ayahNo: w3.ayahNo,
          wordNo: w3.wordNo,
          text: w3.combinedText,
          textBw: w3.combinedTextBw,
          lemma: n3.Lemma,
          root: n3.Root,
          nominalCase: case3,
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

    const patterns = findIdafaMudafSifahPatterns(records);
    const limitedPatterns = patterns.slice(0, limit);

    const examples = [];
    limitedPatterns.forEach((pattern, index) => {
      examples.push({
        surahId: parseInt(pattern.mudaf.surahId, 10),
        ayahNo: parseInt(pattern.mudaf.ayahNo, 10),
        words: [
          { wordNo: parseInt(pattern.mudaf.wordNo, 10) },
          { wordNo: parseInt(pattern.mudafIlayhi.wordNo, 10) },
          { wordNo: parseInt(pattern.sifah.wordNo, 10) },
        ],
        beforeInterlude: [
          {
            type: 'text',
            content: `
            <h3>Idafa: Mudaf + Mudaf Ilayhi + Sifah of Mudaf (Pattern ${index + 1})</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">مضاف + مضاف إليه + صفة المضاف</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="bg-green-50 p-3 rounded border-2 border-dashed border-green-300">
                  <h5 class="font-bold text-green-800 mb-1">المضاف</h5>
                  <div class="text-2xl arabic mb-2">${pattern.mudaf.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.mudaf.textBw}</div>
                  <p class="text-xs text-gray-600 mt-1">Case: ${getCaseLabel(pattern.mudaf.nominalCase)}</p>
                </div>
                <div class="bg-amber-50 p-3 rounded border-2 border-dashed border-amber-300">
                  <h5 class="font-bold text-amber-800 mb-1">المضاف إليه</h5>
                  <div class="text-2xl arabic mb-2">${pattern.mudafIlayhi.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.mudafIlayhi.textBw}</div>
                  <p class="text-xs text-gray-600 mt-1">Case: ${getCaseLabel(pattern.mudafIlayhi.nominalCase)}</p>
                </div>
                <div class="bg-blue-50 p-3 rounded border-2 border-dashed border-blue-300">
                  <h5 class="font-bold text-blue-800 mb-1">صفة المضاف</h5>
                  <div class="text-2xl arabic mb-2">${pattern.sifah.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.sifah.textBw}</div>
                  <p class="text-xs text-gray-600 mt-1">Case: ${getCaseLabel(pattern.sifah.nominalCase)}</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Full chain:</h5>
                <div class="text-xl arabic mb-2">${pattern.mudaf.text} ${pattern.mudafIlayhi.text} ${pattern.sifah.text}</div>
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
        wordRefs.push({ surahId: ex.surahId, ayahNo: ex.ayahNo, wordNo: w.wordNo });
      }
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of examples) {
      ex.words = ex.words.map((w) => ({
        ...w,
        translations:
          translationMap.get(wordKey(ex.surahId, ex.ayahNo, w.wordNo)) || null,
      }));
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
