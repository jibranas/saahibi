import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function findMawsufSifahPluralPatterns(records) {
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
    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i];
      const word2 = words[i + 1];

      if (!word1.nounSegment || !word2.nounSegment) continue;

      const n1 = word1.nounSegment;
      const n2 = word2.nounSegment;

      const num1 = parseInt(String(n1.Number || '0').trim(), 10) || 0;
      if (num1 !== 3) continue;

      const g2 = parseInt(String(n2.Gender || '0').trim(), 10) || 0;
      if (g2 !== 2) continue;

      const case1 = String(n1.NominalCase || '').trim();
      const case2 = String(n2.NominalCase || '').trim();
      if (!case1 || !case2 || case1 !== case2) continue;

      const isIndef1 = String(n1.NominalState || '').includes('INDEF');
      const isIndef2 = String(n2.NominalState || '').includes('INDEF');
      const isDef1 = word1.hasDET;
      const isDef2 = word2.hasDET;

      const bothIndef = isIndef1 && isIndef2;
      const bothDef = isDef1 && isDef2;
      if (!bothIndef && !bothDef) continue;

      if (word1.allSegments.length > 2 || word2.allSegments.length > 2) continue;

      const stateLabel = bothDef ? 'Definite (معرفة)' : 'Indefinite (نكرة)';
      const g1 = parseInt(String(n1.Gender || '0').trim(), 10) || 0;
      const num2 = parseInt(String(n2.Number || '0').trim(), 10) || 0;
      const effectiveNum2 = num2 === 0 ? 1 : num2;

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
          number: num1,
          gender: g1,
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
          number: effectiveNum2,
          gender: g2,
          nominalDerivation: n2.NominalDerivation || '',
        },
      });
    }
  }

  patterns.sort((a, b) => {
    const gA = a.mawsuf.gender;
    const gB = b.mawsuf.gender;
    if (gA === 1 && gB !== 1) return -1;
    if (gA !== 1 && gB === 1) return 1;
    return 0;
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

    const patterns = findMawsufSifahPluralPatterns(records);
    const limited = patterns.slice(0, limit);

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

    const examples = limited.map((pattern) => ({
      surahId: Number(pattern.mawsuf.surahId),
      ayahNo: Number(pattern.mawsuf.ayahNo),
      words: [
        { wordNo: Number(pattern.mawsuf.wordNo) },
        { wordNo: Number(pattern.sifah.wordNo) },
      ],
    }));

    res.json({
      count: limited.length,
      totalPatterns: patterns.length,
      scannedSegments: records.length,
      limit,
      filter,
      examples,
      patterns: limited,
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
