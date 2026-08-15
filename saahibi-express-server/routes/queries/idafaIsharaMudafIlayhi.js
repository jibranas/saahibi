import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function isIsmIsharaWord(segments) {
  return segments.some((seg) => String(seg.LemmaBw || '') === '*A');
}

function findIdafaIsharaMudafIlayhiPatterns(records) {
  const wordMap = new Map();

  for (const rec of records) {
    if (!rec.SurahId || !rec.AyahId || !rec.WordId) continue;
    const key = `${rec.SurahId}-${rec.AyahId}-${rec.WordId}`;

    if (!wordMap.has(key)) {
      wordMap.set(key, {
        surahId: rec.SurahId,
        ayahNo: rec.AyahId,
        wordId: rec.WordId,
        wordNo: rec.WordNo,
        segments: [],
        combinedText: '',
        combinedTextBw: '',
      });
    }

    const word = wordMap.get(key);
    word.segments.push(rec);
    if (rec.Text && String(rec.Text).trim()) {
      word.combinedText += rec.Text;
      word.combinedTextBw += rec.TextBw || '';
    }
  }

  const ayahWords = new Map();
  for (const word of wordMap.values()) {
    const k = `${word.surahId}-${word.ayahNo}`;
    if (!ayahWords.has(k)) ayahWords.set(k, []);
    ayahWords.get(k).push(word);
  }
  for (const list of ayahWords.values()) {
    list.sort((a, b) => parseInt(a.wordNo, 10) - parseInt(b.wordNo, 10));
  }

  const patterns = [];

  for (const [, words] of ayahWords.entries()) {
    for (let i = 0; i < words.length - 2; i++) {
      const w1 = words[i];
      const w2 = words[i + 1];
      const w3 = words[i + 2];

      if (!isIsmIsharaWord(w2.segments)) continue;

      const n1 = w1.segments.find(
        (s) => s.PartOfSpeech === 'N' && String(s.NominalCase || '').trim()
      );
      if (!n1) continue;
      const hasDet1 = w1.segments.some((s) =>
        String(s.PrefixType || '').includes('DET')
      );
      if (hasDet1) continue;
      const isIndef1 = String(n1.NominalState || '').includes('INDEF');
      if (isIndef1) continue;

      const n3 = w3.segments.find(
        (s) => s.PartOfSpeech === 'N' && String(s.NominalCase || '').trim()
      );
      if (!n3) continue;
      const case3 = String(n3.NominalCase || '').trim();
      if (case3 !== 'GEN') continue;

      patterns.push({
        mudaf: {
          surahId: w1.surahId,
          ayahNo: w1.ayahNo,
          wordNo: w1.wordNo,
          text: w1.combinedText,
          textBw: w1.combinedTextBw,
        },
        ishara: {
          surahId: w2.surahId,
          ayahNo: w2.ayahNo,
          wordNo: w2.wordNo,
          text: w2.combinedText,
          textBw: w2.combinedTextBw,
        },
        mudafIlayhi: {
          surahId: w3.surahId,
          ayahNo: w3.ayahNo,
          wordNo: w3.wordNo,
          text: w3.combinedText,
          textBw: w3.combinedTextBw,
        },
      });
    }
  }

  patterns.sort((a, b) => {
    const sa = parseInt(a.mudaf.surahId, 10) || 0;
    const sb = parseInt(b.mudaf.surahId, 10) || 0;
    if (sa !== sb) return sb - sa;
    const aa = parseInt(a.mudaf.ayahNo, 10) || 0;
    const ab = parseInt(b.mudaf.ayahNo, 10) || 0;
    if (aa !== ab) return ab - aa;
    const wa = parseInt(a.mudaf.wordNo, 10) || 0;
    const wb = parseInt(b.mudaf.wordNo, 10) || 0;
    return wb - wa;
  });

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

    const patterns = findIdafaIsharaMudafIlayhiPatterns(records);
    const limited = patterns.slice(0, limit);

    const examples = limited.map((p, index) => ({
      surahId: parseInt(p.mudaf.surahId, 10),
      ayahNo: parseInt(p.mudaf.ayahNo, 10),
      words: [
        { wordNo: parseInt(p.mudaf.wordNo, 10) },
        { wordNo: parseInt(p.ishara.wordNo, 10) },
        { wordNo: parseInt(p.mudafIlayhi.wordNo, 10) },
      ],
      beforeInterlude: [
        {
          type: 'text',
          content: `
          <h3>Idafa + Ism Ishara (Pointing to Mudaf Ilayhi) — Pattern ${index + 1}</h3>
          <div class="bg-sky-50 p-4 rounded-lg my-4">
            <h4 class="font-bold text-sky-900 text-lg mb-3">مضاف + اسم إشارة + مضاف إليه</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="bg-green-50 p-3 rounded border border-dashed border-green-300">
                <h5 class="font-bold text-green-800 mb-1">المضاف</h5>
                <div class="text-2xl arabic mb-2">${p.mudaf.text}</div>
                <div class="text-sm text-gray-600 mb-2">${p.mudaf.textBw}</div>
              </div>
              <div class="bg-amber-50 p-3 rounded border border-dashed border-amber-300">
                <h5 class="font-bold text-amber-800 mb-1">اسم الإشارة (للمضاف إليه)</h5>
                <div class="text-2xl arabic mb-2">${p.ishara.text}</div>
                <div class="text-sm text-gray-600 mb-2">${p.ishara.textBw}</div>
              </div>
              <div class="bg-blue-50 p-3 rounded border border-dashed border-blue-300">
                <h5 class="font-bold text-blue-800 mb-1">المضاف إليه</h5>
                <div class="text-2xl arabic mb-2">${p.mudafIlayhi.text}</div>
                <div class="text-sm text-gray-600 mb-2">${p.mudafIlayhi.textBw}</div>
              </div>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg mt-4">
              <h5 class="font-bold text-purple-900 mb-2">التركيب:</h5>
              <div class="text-xl arabic mb-2">${p.mudaf.text} ${p.ishara.text} ${p.mudafIlayhi.text}</div>
              <p class="text-sm text-purple-800">اسم الإشارة هنا يشير إلى المضاف إليه (الكلمة الثالثة) داخل تركيب الإضافة.</p>
            </div>
          </div>
        `,
        },
      ],
    }));

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
