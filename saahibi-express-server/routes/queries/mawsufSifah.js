import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
/**
 * Core mawsuf-sifah detection (ported from the original TSV implementation).
 * Kept inside this route file by request — the algorithm and the HTTP handler live together.
 */
function findMawsufSifahPatterns(records) {
  // Group segments by word key (SurahId-AyahNo-WordNo)
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

  // Build ordered list of words per ayah
  const ayahWords = new Map();
  for (const word of wordMap.values()) {
    const ayahKey = `${word.surahId}-${word.ayahNo}`;
    if (!ayahWords.has(ayahKey)) ayahWords.set(ayahKey, []);
    ayahWords.get(ayahKey).push(word);
  }

  for (const words of ayahWords.values()) {
    words.sort((a, b) => parseInt(a.wordNo) - parseInt(b.wordNo));
  }

  const patterns = [];

  for (const [, words] of ayahWords.entries()) {
    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i];
      const word2 = words[i + 1];

      if (!word1.nounSegment || !word2.nounSegment) continue;

      const n1 = word1.nounSegment;
      const n2 = word2.nounSegment;

      // 1. NominalCase must match (both non-empty)
      const case1 = String(n1.NominalCase || '').trim();
      const case2 = String(n2.NominalCase || '').trim();
      if (!case1 || !case2 || case1 !== case2) continue;

      // 2. NominalState must match (both INDEF, or both have DET)
      const isIndef1 = String(n1.NominalState || '').includes('INDEF');
      const isIndef2 = String(n2.NominalState || '').includes('INDEF');
      const isDef1 = word1.hasDET;
      const isDef2 = word2.hasDET;

      const bothIndef = isIndef1 && isIndef2;
      const bothDef = isDef1 && isDef2;
      if (!bothIndef && !bothDef) continue;

      // 3. Gender must match (both non-zero and equal, or treat 0 as matching)
      const gender1 = String(n1.Gender ?? '0').trim();
      const gender2 = String(n2.Gender ?? '0').trim();
      const g1 = parseInt(gender1) || 0;
      const g2 = parseInt(gender2) || 0;
      if (g1 === 0 && g2 === 0) continue; // both unspecified, skip
      if (g1 !== 0 && g2 !== 0 && g1 !== g2) continue; // both specified but different

      // 4. Number must match
      // Treat 0 as compatible with 1 (singular), since many singular nouns have Number=0
      const number1 = String(n1.Number ?? '0').trim();
      const number2 = String(n2.Number ?? '0').trim();
      const num1 = parseInt(number1) || 0;
      const num2 = parseInt(number2) || 0;
      const effectiveNum1 = num1 === 0 ? 1 : num1;
      const effectiveNum2 = num2 === 0 ? 1 : num2;
      if (effectiveNum1 !== effectiveNum2) continue;

      // Skip words that have attached suffix pronouns (3+ segments)
      if (word1.allSegments.length > 2 || word2.allSegments.length > 2) continue;

      const stateLabel = bothDef ? 'Definite (معرفة)' : 'Indefinite (نكرة)';
      const effectiveGender = g1 !== 0 ? g1 : g2;
      const effectiveNumber = effectiveNum1;

      patterns.push({
        mawsuf: {
          surahId: word1.surahId,
          ayahNo: word1.ayahNo,
          wordNo: word1.wordNo,
          text: word1.combinedText,
          textBw: word1.combinedTextBw,
          lemma: n1.Lemma,
          root: n1.Root,
          nominalCase: case1,
          nominalState: stateLabel,
          hasDET: isDef1,
          number: effectiveNumber,
          gender: effectiveGender,
          nominalDerivation: n1.NominalDerivation || '',
        },
        sifah: {
          surahId: word2.surahId,
          ayahNo: word2.ayahNo,
          wordNo: word2.wordNo,
          text: word2.combinedText,
          textBw: word2.combinedTextBw,
          lemma: n2.Lemma,
          root: n2.Root,
          nominalCase: case2,
          nominalState: stateLabel,
          hasDET: isDef2,
          number: effectiveNumber,
          gender: effectiveGender,
          nominalDerivation: n2.NominalDerivation || '',
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

    const patterns = findMawsufSifahPatterns(records);
    const limited = patterns.slice(0, limit);

    // Attach translations to each side (mawsuf + sifah) for just the words we return.
    const wordRefs = [];
    for (const p of limited) {
      wordRefs.push(p.mawsuf, p.sifah);
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const p of limited) {
      p.mawsuf.translations =
        translationMap.get(
          wordKey(p.mawsuf.surahId, p.mawsuf.ayahNo, p.mawsuf.wordNo)
        ) || null;
      p.sifah.translations =
        translationMap.get(
          wordKey(p.sifah.surahId, p.sifah.ayahNo, p.sifah.wordNo)
        ) || null;
    }

    res.json({
      count: limited.length,
      totalPatterns: patterns.length,
      scannedSegments: records.length,
      limit,
      filter,
      patterns: limited,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
