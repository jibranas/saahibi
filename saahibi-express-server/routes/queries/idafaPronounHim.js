import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
const PRON_TEXT_BW = new Set(['himo', 'him']);

function findIdafaPronounHimPatterns(records) {
  const patterns = [];
  const processedWordIds = new Set();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.PartOfSpeech !== 'N') continue;
    const wordId = record.WordId;
    const wordIdKey = String(wordId);
    if (processedWordIds.has(wordIdKey)) continue;
    const nomState = String(record.NominalState || '').trim();
    if (nomState !== '') continue;
    if (!record.NominalCase || String(record.NominalCase).trim() === '')
      continue;

    let hasDet = false;
    let wordStart = i;
    while (
      wordStart > 0 &&
      String(records[wordStart - 1].WordId) === wordIdKey
    ) {
      wordStart--;
    }
    const segments = [];
    let hasConstruct = false;
    let pronSegment = null;
    let j = wordStart;

    while (j < records.length && String(records[j].WordId) === wordIdKey) {
      const seg = records[j];
      segments.push(seg);
      if (seg.PrefixType && String(seg.PrefixType).includes('DET'))
        hasDet = true;
      if (
        seg.PartOfSpeech === 'N' &&
        String(seg.NominalState || '').trim() === '' &&
        seg.NominalCase
      )
        hasConstruct = true;
      if (seg.SuffixType && String(seg.SuffixType).includes('PRON')) {
        const bw = String(seg.TextBw || '').trim();
        if (PRON_TEXT_BW.has(bw)) pronSegment = seg;
      }
      j++;
    }

    if (hasDet || !hasConstruct || !pronSegment) continue;
    processedWordIds.add(wordIdKey);

    const constructSegment = segments.find(
      (s) =>
        s.PartOfSpeech === 'N' &&
        String(s.NominalState || '').trim() === '' &&
        s.NominalCase
    );
    const combinedText = segments.map((s) => s.Text).join('');
    const combinedTextBw = segments.map((s) => s.TextBw || '').join('');

    patterns.push({
      surahId: segments[0].SurahId,
      ayahNo: segments[0].AyahNo,
      wordNo: segments[0].WordNo,
      combinedText,
      combinedTextBw,
      muzafLemma: constructSegment?.Lemma,
      zameerTextBw: pronSegment.TextBw,
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
      if (Number.isFinite(s)) {
        filter.SurahId = Math.min(
          QURAN_SURAH_MAX,
          Math.max(QURAN_SURAH_MIN, Math.round(s))
        );
      }
    }
    const rawLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.floor(rawLimit)
        : Number.POSITIVE_INFINITY;
    const records = await fetchMorphologyOrdered(filter);

    const patterns = findIdafaPronounHimPatterns(records);
    const limited = patterns.slice(0, limit);

    const examples = limited.map((p, idx) => ({
      surahId: Number(p.surahId),
      ayahNo: Number(p.ayahNo),
      words: [{ wordNo: Number(p.wordNo) }],
      beforeInterlude: [
        {
          type: 'text',
          content: `
          <h3>مضاف + مضاف إليه (هِمْ — جمع مذكر غائب بعد كسرة أو ياء ساكن) — ${idx + 1}</h3>
          <div class="bg-sky-50 p-4 rounded-lg my-4">
            <p class="font-bold text-sky-900">إضافة: مضاف + ضمير هِمْ (جمع مذكر غائب)</p>
            <p class="text-sm mt-2">When the letter before the pronoun has <strong>كسرة</strong> or <strong>ياء ساكن</strong>, هُمْ becomes <strong>هِمْ</strong> (him).</p>
            <div class="text-2xl arabic mt-3">${p.combinedText}</div>
            <div class="text-sm text-gray-600 mt-1">${p.combinedTextBw}</div>
            <p class="text-sm mt-2">"${p.muzafLemma}" + هِمْ (their)</p>
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
      ex.translations =
        translationMap.get(
          wordKey(ex.surahId, ex.ayahNo, ex.words[0].wordNo)
        ) || null;
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
