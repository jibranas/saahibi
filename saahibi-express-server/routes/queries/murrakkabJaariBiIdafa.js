import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function findMurrakkabJaariBiIdafaPatterns(records) {
  const patterns = [];
  const seenTriples = new Set();

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (rec.PartOfSpeech !== 'P') continue;

    const text = String(rec.Text || '').trim();
    const bw = String(rec.TextBw || '').trim();
    if (text !== 'بِ' && bw !== 'bi') continue;

    const ayahId = rec.AyahId;
    const biWordId = rec.WordId;
    const biWordIdKey = String(biWordId);

    let j = i + 1;
    while (j < records.length && String(records[j].WordId) === biWordIdKey) j++;
    if (j >= records.length || records[j].AyahId !== ayahId) continue;

    const mudhafWordId = records[j].WordId;
    const mudhafWordIdKey = String(mudhafWordId);
    const mudhafSegments = [];
    let hasGenNounMudhaf = false;
    let hasDetMudhaf = false;
    let mudhafCore = null;
    let k = j;
    while (k < records.length && String(records[k].WordId) === mudhafWordIdKey) {
      const seg = records[k];
      mudhafSegments.push(seg);
      if (seg.PrefixType && String(seg.PrefixType).includes('DET'))
        hasDetMudhaf = true;
      if (
        seg.PartOfSpeech === 'N' &&
        String(seg.NominalCase || '').includes('GEN')
      ) {
        hasGenNounMudhaf = true;
        if (!mudhafCore) mudhafCore = seg;
      }
      k++;
    }
    if (hasDetMudhaf) continue;
    if (!hasGenNounMudhaf) continue;
    const mudhafState = String(mudhafCore?.NominalState || '').trim();
    if (mudhafState !== '') continue;

    if (k >= records.length || records[k].AyahId !== ayahId) continue;
    const ilayhiWordId = records[k].WordId;
    const ilayhiWordIdKey = String(ilayhiWordId);
    const ilayhiSegments = [];
    let hasGenNounIlayhi = false;
    let ilayhiCore = null;
    let m = k;
    while (m < records.length && String(records[m].WordId) === ilayhiWordIdKey) {
      const seg = records[m];
      ilayhiSegments.push(seg);
      if (
        seg.PartOfSpeech === 'N' &&
        String(seg.NominalCase || '').includes('GEN')
      ) {
        hasGenNounIlayhi = true;
        if (!ilayhiCore) ilayhiCore = seg;
      }
      m++;
    }
    if (!hasGenNounIlayhi) continue;

    const key = `${rec.SurahId}-${ayahId}-${biWordId}-${mudhafWordId}-${ilayhiWordId}`;
    if (seenTriples.has(key)) continue;
    seenTriples.add(key);

    const biSegments = [];
    let b = i;
    while (b < records.length && String(records[b].WordId) === biWordIdKey) {
      biSegments.push(records[b]);
      b++;
    }

    const biCombinedText = biSegments.map((s) => s.Text).join('');
    const biCombinedTextBw = biSegments.map((s) => s.TextBw || '').join('');
    const mudhafCombinedText = mudhafSegments.map((s) => s.Text).join('');
    const mudhafCombinedTextBw = mudhafSegments.map((s) => s.TextBw || '').join('');
    const ilayhiCombinedText = ilayhiSegments.map((s) => s.Text).join('');
    const ilayhiCombinedTextBw = ilayhiSegments.map((s) => s.TextBw || '').join('');

    patterns.push({
      surahId: parseInt(rec.SurahId, 10),
      ayahNo: parseInt(rec.AyahNo, 10),
      biWordNo: parseInt(biSegments[0].WordNo, 10),
      mudhafWordNo: parseInt(mudhafSegments[0].WordNo, 10),
      ilayhiWordNo: parseInt(ilayhiSegments[0].WordNo, 10),
      biCombinedText,
      biCombinedTextBw,
      mudhafCombinedText,
      mudhafCombinedTextBw,
      ilayhiCombinedText,
      ilayhiCombinedTextBw,
      mudhafLemma: mudhafCore?.Lemma,
      ilayhiLemma: ilayhiCore?.Lemma,
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

    const patterns = findMurrakkabJaariBiIdafaPatterns(records);
    const limited = patterns.slice(0, limit);

    const examples = limited.map((p, idx) => ({
      surahId: p.surahId,
      ayahNo: p.ayahNo,
      words: [{ wordNo: p.biWordNo }],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>مركب جرّي + إضافة: بِ + اسم مجرور (مضاف) + مضاف إليه — ${idx + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <p class="font-bold text-sky-900">
                مركب جرّي (جار ومجرور) حيث الاسم المجرور بعد <strong>بِ</strong> هو مضاف، ثم يأتي بعده مضاف إليه.
              </p>
              <p class="text-sm mt-2">
                Structure: <strong>بِ</strong> (ḥarf jar) + <strong>مضاف مجرور</strong> + <strong>مضاف إليه</strong>.
              </p>
              <div class="text-2xl arabic mt-3">
                <span class="text-emerald-700">${p.biCombinedText}</span>
                <span class="mx-1 text-emerald-900">${p.mudhafCombinedText}</span>
                <span class="mx-1 text-emerald-900">${p.ilayhiCombinedText}</span>
              </div>
              <div class="text-sm text-gray-600 mt-1">
                ${p.biCombinedTextBw} ${p.mudhafCombinedTextBw} ${p.ilayhiCombinedTextBw}
              </div>
              <p class="text-sm mt-2">
                Mudhaf (GEN): ${p.mudhafLemma || ''} — Mudhaf ilayhi (GEN): ${p.ilayhiLemma || ''}.
              </p>
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
