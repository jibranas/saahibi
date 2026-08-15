import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function findMurrakkabJaariBiTwoPatterns(records) {
  const patterns = [];
  const seenTuples = new Set();

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (rec.PartOfSpeech !== 'P') continue;

    const text = String(rec.Text || '').trim();
    const bw = String(rec.TextBw || '').trim();
    if (text !== 'بِ' && bw !== 'bi') continue;

    const ayahId = rec.AyahId;
    const biWordId = rec.WordId;
    const biWordIdKey = String(biWordId);

    const biSegments = [];
    let idx = i;
    while (idx < records.length && String(records[idx].WordId) === biWordIdKey) {
      biSegments.push(records[idx]);
      idx++;
    }
    let hasGenInBiWord = false;
    for (const seg of biSegments) {
      if (
        seg.PartOfSpeech === 'N' &&
        String(seg.NominalCase || '').includes('GEN')
      ) {
        hasGenInBiWord = true;
        break;
      }
    }

    let maj1WordId;
    const maj1Segments = [];
    let hasGenNoun1 = false;
    let k;

    if (hasGenInBiWord) {
      maj1WordId = biWordId;
      for (const seg of biSegments) {
        maj1Segments.push(seg);
        if (
          seg.PartOfSpeech === 'N' &&
          String(seg.NominalCase || '').includes('GEN')
        ) {
          hasGenNoun1 = true;
        }
      }
      k = idx;
    } else {
      let j = idx;
      if (j >= records.length || records[j].AyahId !== ayahId) continue;
      maj1WordId = records[j].WordId;
      const maj1WordIdKey = String(maj1WordId);
      k = j;
      while (k < records.length && String(records[k].WordId) === maj1WordIdKey) {
        maj1Segments.push(records[k]);
        if (
          records[k].PartOfSpeech === 'N' &&
          String(records[k].NominalCase || '').includes('GEN')
        ) {
          hasGenNoun1 = true;
        }
        k++;
      }
    }

    if (!hasGenNoun1) continue;

    if (k >= records.length || records[k].AyahId !== ayahId) continue;
    const wawWordId = records[k].WordId;
    const wawWordIdKey = String(wawWordId);
    const wawSegments = [];
    let isWaw = false;
    let hasGenInsideWawWord = false;
    let m = k;
    while (m < records.length && String(records[m].WordId) === wawWordIdKey) {
      wawSegments.push(records[m]);
      const t2 = String(records[m].Text || '').trim();
      const bw2 = String(records[m].TextBw || '').trim();
      if (t2 === 'وَ' || bw2 === 'wa') {
        isWaw = true;
      }
      if (
        records[m].PartOfSpeech === 'N' &&
        String(records[m].NominalCase || '').includes('GEN')
      ) {
        hasGenInsideWawWord = true;
      }
      m++;
    }
    if (!isWaw) continue;

    let maj2WordId = null;
    const maj2Segments = [];
    let hasGenNoun2 = false;

    if (hasGenInsideWawWord) {
      maj2WordId = wawWordId;
      for (const seg of wawSegments) {
        maj2Segments.push(seg);
        if (
          seg.PartOfSpeech === 'N' &&
          String(seg.NominalCase || '').includes('GEN')
        ) {
          hasGenNoun2 = true;
        }
      }
    } else {
      if (m >= records.length || records[m].AyahId !== ayahId) continue;
      maj2WordId = records[m].WordId;
      const maj2WordIdKey = String(maj2WordId);
      let n = m;
      while (n < records.length && String(records[n].WordId) === maj2WordIdKey) {
        maj2Segments.push(records[n]);
        if (
          records[n].PartOfSpeech === 'N' &&
          String(records[n].NominalCase || '').includes('GEN')
        ) {
          hasGenNoun2 = true;
        }
        n++;
      }
    }

    if (maj2WordId == null || !hasGenNoun2) continue;

    const key = `${rec.SurahId}-${ayahId}-${biWordId}-${maj1WordId}-${maj2WordId}`;
    if (seenTuples.has(key)) continue;
    seenTuples.add(key);

    const biCombinedText = biSegments.map((s) => s.Text).join('');
    const biCombinedTextBw = biSegments.map((s) => s.TextBw || '').join('');
    const maj1CombinedText = maj1Segments.map((s) => s.Text).join('');
    const maj1CombinedTextBw = maj1Segments.map((s) => s.TextBw || '').join('');
    const wawCombinedText = wawSegments.map((s) => s.Text).join('');
    const wawCombinedTextBw = wawSegments.map((s) => s.TextBw || '').join('');
    const maj2CombinedText = maj2Segments.map((s) => s.Text).join('');
    const maj2CombinedTextBw = maj2Segments.map((s) => s.TextBw || '').join('');

    patterns.push({
      surahId: parseInt(rec.SurahId, 10),
      ayahNo: parseInt(rec.AyahNo, 10),
      biWordNo: parseInt(biSegments[0].WordNo, 10),
      maj1WordNo: parseInt(maj1Segments[0].WordNo, 10),
      wawWordNo: parseInt(wawSegments[0].WordNo, 10),
      maj2WordNo: parseInt(maj2Segments[0].WordNo, 10),
      biCombinedText,
      biCombinedTextBw,
      maj1CombinedText,
      maj1CombinedTextBw,
      wawCombinedText,
      wawCombinedTextBw,
      maj2CombinedText,
      maj2CombinedTextBw,
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

    const patterns = findMurrakkabJaariBiTwoPatterns(records);
    const limited = patterns.slice(0, limit);

    const examples = limited.map((p, idx) => ({
      surahId: p.surahId,
      ayahNo: p.ayahNo,
      words: [{ wordNo: p.biWordNo }, { wordNo: p.maj2WordNo }],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>مركب جرّي: بِ + اسم مجرور + وَ + اسم مجرور — ${idx + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <p class="font-bold text-sky-900">مركب جرّي (جار ومجرور) مع حرف الجر <strong>بِ</strong> واسمين مجرورين معطوفين بالواو</p>
              <p class="text-sm mt-2">
                The prepositional phrase here is formed by the jar <strong>بِ</strong> plus
                <strong>two</strong> majrūr nouns, joined by <strong>وَ</strong>:
                بِ + اسم مجرور + وَ + اسم مجرور.
              </p>
              <div class="text-2xl arabic mt-3">
                <span class="text-emerald-700">${p.biCombinedText}</span>
                <span class="mx-1 text-emerald-900">${p.maj1CombinedText}</span>
                <span class="mx-1 text-sky-700">${p.wawCombinedText}</span>
                <span class="mx-1 text-emerald-900">${p.maj2CombinedText}</span>
              </div>
              <div class="text-sm text-gray-600 mt-1">
                ${p.biCombinedTextBw} ${p.maj1CombinedTextBw} ${p.wawCombinedTextBw} ${p.maj2CombinedTextBw}
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
      debug: { totalPatterns: patterns.length },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
