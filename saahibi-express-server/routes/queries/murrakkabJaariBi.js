import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function findMurrakkabJaariBiPatterns(records) {
  const patterns = [];
  const seenWordIds = new Set();

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (rec.PartOfSpeech !== 'P') continue;

    const wordId = rec.WordId;
    const wordIdKey = String(wordId);
    if (seenWordIds.has(wordIdKey)) continue;

    const text = String(rec.Text || '').trim();
    const bw = String(rec.TextBw || '').trim();
    if (text !== 'بِ' && bw !== 'bi') continue;

    const wordSegments = [];
    let hasGenNoun = false;
    let j = i;
    while (j < records.length && String(records[j].WordId) === wordIdKey) {
      const seg = records[j];
      wordSegments.push(seg);
      if (
        seg.PartOfSpeech === 'N' &&
        String(seg.NominalCase || '').includes('GEN')
      ) {
        hasGenNoun = true;
      }
      j++;
    }

    if (!hasGenNoun) continue;
    seenWordIds.add(wordIdKey);

    const combinedText = wordSegments.map((s) => s.Text).join('');
    const combinedTextBw = wordSegments.map((s) => s.TextBw || '').join('');

    patterns.push({
      surahId: parseInt(wordSegments[0].SurahId, 10),
      ayahNo: parseInt(wordSegments[0].AyahNo, 10),
      wordNo: parseInt(wordSegments[0].WordNo, 10),
      combinedText,
      combinedTextBw,
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

    const patterns = findMurrakkabJaariBiPatterns(records);
    const limited = patterns.slice(0, limit);

    const examples = limited.map((p, idx) => ({
      surahId: p.surahId,
      ayahNo: p.ayahNo,
      words: [{ wordNo: p.wordNo }],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>مركب جرّي: بِ + اسم مجرور — ${idx + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <p class="font-bold text-sky-900">مركب جرّي (جار ومجرور) مع حرف الجر <strong>بِ</strong></p>
              <p class="text-sm mt-2">The prepositional phrase (مركب جرّي) is formed inside a single word that contains both the جار <strong>بِ</strong> and its مجرور noun (e.g. بِاسْمِ).</p>
              <div class="text-2xl arabic mt-3">
                <span class="text-emerald-900">${p.combinedText}</span>
              </div>
              <div class="text-sm text-gray-600 mt-1">${p.combinedTextBw}</div>
            </div>
          `,
        },
      ],
    }));

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
      debug: { totalPatterns: patterns.length },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
