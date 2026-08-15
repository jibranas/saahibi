import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
const ALIF = '\u0627';
const ALIF_MAQSURA = '\u0649';
const DIACRITICS = new Set([
  '\u064B',
  '\u064C',
  '\u064D',
  '\u064E',
  '\u064F',
  '\u0650',
  '\u0651',
  '\u0652',
  '\u0653',
  '\u0654',
  '\u0655',
  '\u0656',
  '\u0657',
  '\u0658',
]);

function lastLetter(text) {
  const t = (text || '').trim();
  for (let i = t.length - 1; i >= 0; i--) {
    const c = t[i];
    if (DIACRITICS.has(c)) continue;
    return c;
  }
  return null;
}

function isAlif(c) {
  return c === ALIF || c === ALIF_MAQSURA;
}

function findIdafaYaFathaJoiningNextPatterns(records) {
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
    )
      wordStart--;
    const segments = [];
    let hasConstruct = false;
    let pronSegment = null;
    let pronIdx = -1;
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
      if (
        seg.SuffixType &&
        String(seg.SuffixType).includes('PRON') &&
        String(seg.Person) === '1' &&
        String(seg.Number) === '1'
      ) {
        const bw = String(seg.TextBw || '').trim();
        if (bw === 'Ya') {
          pronSegment = seg;
          pronIdx = segments.length - 1;
        }
      }
      j++;
    }

    if (hasDet || !hasConstruct || !pronSegment || pronIdx <= 0) continue;
    const prevSegment = segments[pronIdx - 1];
    const prevLast = lastLetter(prevSegment.Text || '');
    if (!prevLast || isAlif(prevLast)) continue;

    const ayahId = segments[0].AyahId;
    const nextWordSegments = [];
    if (j < records.length && records[j].AyahId === ayahId) {
      const nextWordId = records[j].WordId;
      while (
        j < records.length &&
        String(records[j].WordId) === String(nextWordId)
      ) {
        nextWordSegments.push(records[j]);
        j++;
      }
    }

    processedWordIds.add(wordIdKey);

    const constructSegment = segments.find(
      (s) =>
        s.PartOfSpeech === 'N' &&
        String(s.NominalState || '').trim() === '' &&
        s.NominalCase
    );
    const combinedText = segments.map((s) => s.Text).join('');
    const combinedTextBw = segments.map((s) => s.TextBw || '').join('');
    const nextWordText = nextWordSegments.map((s) => s.Text).join('');
    const nextWordTextBw = nextWordSegments
      .map((s) => s.TextBw || '')
      .join('');
    const nextWordNo = nextWordSegments.length
      ? nextWordSegments[0].WordNo
      : null;

    patterns.push({
      surahId: segments[0].SurahId,
      ayahNo: segments[0].AyahNo,
      wordNo: segments[0].WordNo,
      combinedText,
      combinedTextBw,
      muzafLemma: constructSegment?.Lemma,
      nextWordText,
      nextWordTextBw,
      nextWordNo,
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

    const patterns = findIdafaYaFathaJoiningNextPatterns(records);
    const limited = patterns.slice(0, limit);

    const examples = limited.map((p, idx) => ({
      surahId: parseInt(p.surahId, 10),
      ayahNo: parseInt(p.ayahNo, 10),
      words:
        p.nextWordNo != null
          ? [
              { wordNo: parseInt(p.wordNo, 10) },
              { wordNo: parseInt(p.nextWordNo, 10) },
            ]
          : [{ wordNo: parseInt(p.wordNo, 10) }],
      beforeInterlude: [
        {
          type: 'text',
          content: `
          <h3>Idafa — "my" (ي) with fatha joining the next word — ${idx + 1}</h3>
          <div class="bg-sky-50 p-4 rounded-lg my-4">
            <p class="font-bold text-sky-900">مضاف + مضاف إليه (يَ — فتحة بسبب الوصل بالكلمة التالية)</p>
            <p class="text-sm mt-2">When the attached pronoun ي (my) has <strong>fatha</strong> (ىَ) due to joining with the word that follows.</p>
            <div class="text-2xl arabic mt-3">${p.combinedText} <span class="text-sky-600">${p.nextWordText || ''}</span></div>
            <div class="text-sm text-gray-600 mt-1">${p.combinedTextBw} ${p.nextWordTextBw || ''}</div>
            <p class="text-sm mt-2">"${p.muzafLemma}" + يَ (my) → then next word: ${p.nextWordText || '—'}</p>
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
      totalMatches: patterns.length,
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
