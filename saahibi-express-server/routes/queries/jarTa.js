import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function findJarTaPatterns(records) {
  const patterns = [];

  for (let i = 0; i < records.length - 1; i++) {
    const rec = records[i];
    if (rec.PartOfSpeech !== 'P') continue;
    if (String(rec.Text || '').trim() !== 'تَ') continue;

    const next = records[i + 1];
    if (!next || next.AyahId !== rec.AyahId) continue;
    if (next.PartOfSpeech !== 'N') continue;
    if (String(next.NominalCase || '').trim() !== 'GEN') continue;

    patterns.push({
      harf: rec,
      majrur: next,
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

    const patterns = findJarTaPatterns(records);
    const limited = patterns.slice(0, limit);

    const examples = [];
    limited.forEach((p, index) => {
      examples.push({
        surahId: parseInt(p.harf.SurahId, 10),
        ayahNo: parseInt(p.harf.AyahNo, 10),
        words: [{ wordNo: parseInt(p.harf.WordNo, 10) }],
        beforeInterlude: [
          {
            type: 'text',
            content: `
            <h3>حرف الجر تَ + اسم مجرور — مثال ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-1">حرف الجر</h5>
                  <div class="text-2xl arabic mb-2">${p.harf.Text}</div>
                  <div class="text-sm text-gray-600 mb-2">${p.harf.TextBw}</div>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-1">الاسم المجرور بعده</h5>
                  <div class="text-2xl arabic mb-2">${p.majrur.Text}</div>
                  <div class="text-sm text-gray-600 mb-2">${p.majrur.TextBw}</div>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">التركيب:</h5>
                <div class="text-xl arabic mb-2">${p.harf.Text}${p.majrur.Text}</div>
                <p class="text-sm text-purple-800">حرف جر (تَ) متصل بالاسم بعده في كلمة واحدة (تَاللَّهِ): تَ = حرف جر، اللَّهِ = اسم مجرور.</p>
              </div>
            </div>
          `,
          },
        ],
      });
    });

    const wordRefs = examples.map((ex) => ({
      surahId: ex.surahId,
      ayahNo: ex.ayahNo,
      wordNo: ex.words[0].wordNo,
    }));
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of examples) {
      const wn = ex.words[0].wordNo;
      ex.words = [
        {
          wordNo: wn,
          translations:
            translationMap.get(wordKey(ex.surahId, ex.ayahNo, wn)) || null,
        },
      ];
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
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
