import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function buildWordMap(records) {
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

  return ayahWords;
}

function findMubtadaSifahKhabarPatterns(ayahWords) {
  const patterns = [];

  for (const [, words] of ayahWords.entries()) {
    for (let i = 0; i < words.length - 2; i++) {
      const w1 = words[i];
      const w2 = words[i + 1];
      const w3 = words[i + 2];

      if (!w1.nounSegment || !w2.nounSegment || !w3.nounSegment) continue;

      const n1 = w1.nounSegment;
      const n2 = w2.nounSegment;
      const n3 = w3.nounSegment;

      if (w1.allSegments.length > 2 || w2.allSegments.length > 2 || w3.allSegments.length > 2)
        continue;

      const case1 = String(n1.NominalCase || '').trim();
      if (case1 !== 'NOM') continue;
      const isIndef1 = String(n1.NominalState || '').includes('INDEF');
      if (isIndef1) continue;

      const case2 = String(n2.NominalCase || '').trim();
      if (case2 !== 'NOM') continue;
      const isIndef2 = String(n2.NominalState || '').includes('INDEF');
      if (isIndef2) continue;

      const bothHaveDET = w1.hasDET && w2.hasDET;
      const bothInherent = !w1.hasDET && !w2.hasDET;
      if (!bothHaveDET && !bothInherent) continue;

      const g1 = parseInt(String(n1.Gender || '0').trim(), 10) || 0;
      const g2 = parseInt(String(n2.Gender || '0').trim(), 10) || 0;
      if (g1 === 0 && g2 === 0) continue;
      if (g1 !== 0 && g2 !== 0 && g1 !== g2) continue;

      const num1 = parseInt(String(n1.Number || '0').trim(), 10) || 0;
      const num2 = parseInt(String(n2.Number || '0').trim(), 10) || 0;
      const effNum1 = num1 === 0 ? 1 : num1;
      const effNum2 = num2 === 0 ? 1 : num2;
      if (effNum1 !== effNum2) continue;

      const case3 = String(n3.NominalCase || '').trim();
      if (case3 !== 'NOM') continue;
      const isIndef3 = String(n3.NominalState || '').includes('INDEF');
      if (!isIndef3) continue;

      const effectiveGender = g1 !== 0 ? g1 : g2;
      const effectiveNumber = effNum1;
      const stateLabel = bothHaveDET ? 'Definite (معرفة) - ال' : 'Definite (معرفة)';

      patterns.push({
        mubtada: {
          surahId: w1.surahId,
          ayahNo: w1.ayahNo,
          wordNo: w1.wordNo,
          text: w1.combinedText,
          textBw: w1.combinedTextBw,
          lemma: n1.Lemma,
          root: n1.Root,
          nominalCase: case1,
          state: stateLabel,
          hasDET: w1.hasDET,
          gender: effectiveGender,
          number: effectiveNumber,
          nominalDerivation: n1.NominalDerivation || '',
        },
        sifah: {
          surahId: w2.surahId,
          ayahNo: w2.ayahNo,
          wordNo: w2.wordNo,
          text: w2.combinedText,
          textBw: w2.combinedTextBw,
          lemma: n2.Lemma,
          root: n2.Root,
          nominalCase: case2,
          state: stateLabel,
          hasDET: w2.hasDET,
          gender: effectiveGender,
          number: effectiveNumber,
          nominalDerivation: n2.NominalDerivation || '',
        },
        khabar: {
          surahId: w3.surahId,
          ayahNo: w3.ayahNo,
          wordNo: w3.wordNo,
          text: w3.combinedText,
          textBw: w3.combinedTextBw,
          lemma: n3.Lemma,
          root: n3.Root,
          nominalCase: case3,
          nominalDerivation: n3.NominalDerivation || '',
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

    const ayahWords = buildWordMap(records);
    const patterns = findMubtadaSifahKhabarPatterns(ayahWords);
    const limited = patterns.slice(0, limit);

    const wordRefs = [];
    for (const p of limited) {
      wordRefs.push(p.mubtada, p.sifah, p.khabar);
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const p of limited) {
      p.mubtada.translations =
        translationMap.get(
          wordKey(p.mubtada.surahId, p.mubtada.ayahNo, p.mubtada.wordNo)
        ) || null;
      p.sifah.translations =
        translationMap.get(
          wordKey(p.sifah.surahId, p.sifah.ayahNo, p.sifah.wordNo)
        ) || null;
      p.khabar.translations =
        translationMap.get(
          wordKey(p.khabar.surahId, p.khabar.ayahNo, p.khabar.wordNo)
        ) || null;
    }

    const examples = limited.map((pattern) => ({
      surahId: Number(pattern.mubtada.surahId),
      ayahNo: Number(pattern.mubtada.ayahNo),
      words: [
        { wordNo: Number(pattern.mubtada.wordNo) },
        { wordNo: Number(pattern.sifah.wordNo) },
        { wordNo: Number(pattern.khabar.wordNo) },
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
