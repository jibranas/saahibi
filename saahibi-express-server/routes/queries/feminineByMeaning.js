import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import {
  DEFAULT_SURAH_FILTER,
  QURAN_SURAH_MAX,
  QURAN_SURAH_MIN,
} from '../../lib/morphologyScope.js';
import { Morphology } from '../../models/Morphology.js';

const router = Router();

/**
 * Unmarked feminine lemmas taught by category (fire, drink vessel, paired
 * body parts, misc). Knowledge-based — not a morphological detector.
 */
const FEMININE_BY_MEANING_LEMMAS = [
  // fire
  'nAr',
  'jaHiym',
  // wine / drink vessel (خمر is Gender 1 in this corpus — skip it)
  'ka>os',
  // paired body parts
  'Eayon',
  'yad',
  '>u*un',
  'rijol',
  // misc
  'nafos',
  "samA'",
  '>aroD',
  'riyH',
  'dAr',
  '$amos',
];

/** Prefer singular; رجل only appears as plural أرجل (still Gender 2). */
function isAcceptableNumber(lemma, record) {
  const n = Number(record.Number);
  if (!Number.isFinite(n) || n === 0 || n === 1) return true;
  if (lemma === 'rijol' && n === 3) return true;
  return false;
}

/** Prefer singular سماء over سماوات for the sky lemma. */
function isPreferredSurface(lemma, text) {
  const t = String(text || '');
  if (lemma === "samA'") {
    return t.includes('سَمَا') && !t.includes('سَمَٰو') && !t.includes('سَمَاو');
  }
  return true;
}

function buildFeminineByMeaningExamples(records) {
  const byLemma = new Map();

  for (const record of records) {
    if (Number(record.SegmentNo) !== 1) continue;
    if (record.PartOfSpeech !== 'N') continue;
    if (Number(record.Gender) !== 2) continue;

    const lemma = String(record.LemmaBw || '').trim();
    if (!FEMININE_BY_MEANING_LEMMAS.includes(lemma)) continue;
    if (!isAcceptableNumber(lemma, record)) continue;
    if (!isPreferredSurface(lemma, record.Text)) continue;
    if (byLemma.has(lemma)) continue;

    byLemma.set(lemma, {
      surahId: Number(record.SurahId),
      ayahNo: Number(record.AyahNo),
      wordNo: Number(record.WordNo),
      text: record.Text,
      lemma,
      lemmaArabic: record.Lemma,
    });
  }

  return FEMININE_BY_MEANING_LEMMAS.filter((lemma) => byLemma.has(lemma)).map(
    (lemma) => {
      const instance = byLemma.get(lemma);
      return {
        surahId: instance.surahId,
        ayahNo: instance.ayahNo,
        words: [{ wordNo: instance.wordNo }],
        text: instance.text,
        lemma: instance.lemma,
        lemmaArabic: instance.lemmaArabic,
      };
    }
  );
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
        res.status(400).json({
          error: `Surah filter must be between ${QURAN_SURAH_MIN} and ${QURAN_SURAH_MAX}`,
        });
        return;
      }
      filter.SurahId = s;
    }
    const rawLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.floor(rawLimit)
        : Number.POSITIVE_INFINITY;
    const records = await Morphology.find({
      ...filter,
      SegmentNo: 1,
      PartOfSpeech: 'N',
      Gender: 2,
      LemmaBw: { $in: FEMININE_BY_MEANING_LEMMAS },
    }).lean();

    records.sort((a, b) => {
      if (a.SurahId !== b.SurahId) return a.SurahId - b.SurahId;
      if (a.AyahNo !== b.AyahNo) return a.AyahNo - b.AyahNo;
      if (a.WordNo !== b.WordNo) return a.WordNo - b.WordNo;
      return a.SegmentNo - b.SegmentNo;
    });

    const examples = buildFeminineByMeaningExamples(records);
    const limited = examples.slice(0, limit);

    const wordRefs = limited.map((ex) => ({
      surahId: ex.surahId,
      ayahNo: ex.ayahNo,
      wordNo: ex.words?.[0]?.wordNo,
    }));
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of limited) {
      const wn = ex.words?.[0]?.wordNo;
      ex.translations =
        translationMap.get(wordKey(ex.surahId, ex.ayahNo, wn)) || null;
    }

    res.json({
      count: limited.length,
      totalMatches: examples.length,
      scannedSegments: records.length,
      limit,
      examples: limited,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
