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

function findIdafaComplexPatterns(records) {
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

      const case3 = String(n3.NominalCase || '').trim();
      if (case3 !== 'GEN') continue;

      patterns.push({
        mudaf: {
          surahId: w1.surahId,
          ayahNo: w1.ayahNo,
          wordNo: w1.wordNo,
          text: w1.combinedText,
          textBw: w1.combinedTextBw,
          lemma: n1.Lemma,
          root: n1.Root,
          nominalCase: String(n1.NominalCase || '').trim(),
        },
        mudafIlayhi1: {
          surahId: w2.surahId,
          ayahNo: w2.ayahNo,
          wordNo: w2.wordNo,
          text: w2.combinedText,
          textBw: w2.combinedTextBw,
          lemma: n2.Lemma,
          root: n2.Root,
          hasDET: w2.hasDET,
        },
        mudafIlayhi2: {
          surahId: w3.surahId,
          ayahNo: w3.ayahNo,
          wordNo: w3.wordNo,
          text: w3.combinedText,
          textBw: w3.combinedTextBw,
          lemma: n3.Lemma,
          root: n3.Root,
          hasDET: w3.hasDET,
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

    const patterns = findIdafaComplexPatterns(records);
    const limitedPatterns = patterns.slice(0, limit);

    const examples = [];
    limitedPatterns.forEach((pattern, index) => {
      examples.push({
        surahId: parseInt(pattern.mudaf.surahId, 10),
        ayahNo: parseInt(pattern.mudaf.ayahNo, 10),
        words: [
          { wordNo: parseInt(pattern.mudaf.wordNo, 10) },
          { wordNo: parseInt(pattern.mudafIlayhi1.wordNo, 10) },
          { wordNo: parseInt(pattern.mudafIlayhi2.wordNo, 10) },
        ],
        beforeInterlude: [
          {
            type: 'text',
            content: `
            <h3>Complex Idafa — مضاف + مضاف إليه + مضاف إليه (Pattern ${index + 1})</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">إضافة مركبة: مضاف ثم مضاف إليه ثم مضاف إليه</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="bg-green-50 p-3 rounded border-2 border-dashed border-green-300">
                  <h5 class="font-bold text-green-800 mb-1">مضاف</h5>
                  <p class="text-xs text-green-600 mb-2">(1st part — construct)</p>
                  <div class="text-2xl arabic mb-2">${pattern.mudaf.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.mudaf.textBw}</div>
                  <p class="text-green-700">${pattern.mudaf.lemma || 'N/A'}</p>
                  <p class="text-xs text-gray-600 mt-1">Case: ${getCaseLabel(pattern.mudaf.nominalCase)}</p>
                  <p class="text-xs text-gray-600">No ال, no تنوين</p>
                </div>
                <div class="bg-amber-50 p-3 rounded border-2 border-dashed border-amber-300">
                  <h5 class="font-bold text-amber-800 mb-1">مضاف إليه (أول)</h5>
                  <p class="text-xs text-amber-600 mb-2">(1st genitive)</p>
                  <div class="text-2xl arabic mb-2">${pattern.mudafIlayhi1.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.mudafIlayhi1.textBw}</div>
                  <p class="text-amber-700">${pattern.mudafIlayhi1.lemma || 'N/A'}</p>
                  <p class="text-xs text-gray-600 mt-1">مجرور (GEN)</p>
                </div>
                <div class="bg-orange-50 p-3 rounded border-2 border-dashed border-orange-300">
                  <h5 class="font-bold text-orange-800 mb-1">مضاف إليه (ثاني)</h5>
                  <p class="text-xs text-orange-600 mb-2">(2nd genitive)</p>
                  <div class="text-2xl arabic mb-2">${pattern.mudafIlayhi2.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.mudafIlayhi2.textBw}</div>
                  <p class="text-orange-700">${pattern.mudafIlayhi2.lemma || 'N/A'}</p>
                  <p class="text-xs text-gray-600 mt-1">مجرور (GEN)</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Full chain:</h5>
                <div class="text-xl arabic mb-2">${pattern.mudaf.text} ${pattern.mudafIlayhi1.text} ${pattern.mudafIlayhi2.text}</div>
                <p class="text-purple-800 text-sm">مضاف + مضاف إليه + مضاف إليه — all in genitive except the first term (مضاف).</p>
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
