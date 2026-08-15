import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function findAlNomIndefPatterns(records) {
  const alNomPatterns = [];
  let alCount = 0;
  let alNomCount = 0;

  for (let i = 0; i < records.length - 3; i++) {
    const alRecord = records[i];
    const nounRecord = records[i + 1];

    if (
      alRecord.PrefixType &&
      String(alRecord.PrefixType).includes('DET') &&
      alRecord.PartOfSpeech === 'P' &&
      nounRecord &&
      nounRecord.PartOfSpeech === 'N' &&
      nounRecord.NominalCase &&
      String(nounRecord.NominalCase).includes('NOM') &&
      alRecord.WordId === nounRecord.WordId &&
      alRecord.SurahId === nounRecord.SurahId &&
      alRecord.AyahId === nounRecord.AyahId
    ) {
      alCount++;

      const currentWordId = alRecord.WordId;

      let j = i + 2;
      while (j < records.length && records[j].WordId === currentWordId) {
        j++;
      }

      if (j >= records.length || records[j].AyahId !== alRecord.AyahId) continue;

      const nextWordId = records[j].WordId;
      let foundIndef = false;
      let indefRecord = null;

      while (j < records.length && records[j].WordId === nextWordId) {
        if (
          records[j].PartOfSpeech === 'N' &&
          records[j].NominalState &&
          String(records[j].NominalState).includes('INDEF') &&
          records[j].NominalCase &&
          String(records[j].NominalCase).includes('NOM') &&
          records[j].Text &&
          String(records[j].Text).trim() !== ''
        ) {
          foundIndef = true;
          indefRecord = records[j];
          break;
        }
        j++;
      }

      if (foundIndef && indefRecord) {
        alNomCount++;

        alNomPatterns.push({
          definiteNoun: {
            surahId: alRecord.SurahId,
            ayahNo: alRecord.AyahNo,
            wordNo: alRecord.WordNo,
            alText: alRecord.Text,
            alTextBw: alRecord.TextBw,
            nounText: nounRecord.Text,
            nounTextBw: nounRecord.TextBw,
            combinedText: `${alRecord.Text || ''}${nounRecord.Text || ''}`,
            combinedTextBw: `${alRecord.TextBw || ''}${nounRecord.TextBw || ''}`,
            lemma: nounRecord.Lemma,
            root: nounRecord.Root,
            nominalCase: nounRecord.NominalCase,
            nominalDerivation: nounRecord.NominalDerivation,
            number: nounRecord.Number,
            gender: nounRecord.Gender,
          },
          indefiniteNoun: {
            surahId: indefRecord.SurahId,
            ayahNo: indefRecord.AyahNo,
            wordNo: indefRecord.WordNo,
            text: indefRecord.Text,
            textBw: indefRecord.TextBw,
            lemma: indefRecord.Lemma,
            root: indefRecord.Root,
            nominalCase: indefRecord.NominalCase,
            nominalState: indefRecord.NominalState,
            nominalDerivation: indefRecord.NominalDerivation,
            number: indefRecord.Number,
            gender: indefRecord.Gender,
          },
        });
      }
    }
  }

  return { alNomPatterns, alCount, alNomCount };
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

    const { alNomPatterns, alCount, alNomCount } = findAlNomIndefPatterns(records);
    const limited = alNomPatterns.slice(0, limit);

    const wordRefs = [];
    for (const p of limited) {
      wordRefs.push(
        {
          surahId: p.definiteNoun.surahId,
          ayahNo: p.definiteNoun.ayahNo,
          wordNo: p.definiteNoun.wordNo,
        },
        {
          surahId: p.indefiniteNoun.surahId,
          ayahNo: p.indefiniteNoun.ayahNo,
          wordNo: p.indefiniteNoun.wordNo,
        }
      );
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const p of limited) {
      p.definiteNoun.translations =
        translationMap.get(
          wordKey(p.definiteNoun.surahId, p.definiteNoun.ayahNo, p.definiteNoun.wordNo)
        ) || null;
      p.indefiniteNoun.translations =
        translationMap.get(
          wordKey(
            p.indefiniteNoun.surahId,
            p.indefiniteNoun.ayahNo,
            p.indefiniteNoun.wordNo
          )
        ) || null;
    }

    const examples = limited.map((pattern) => ({
      surahId: Number(pattern.definiteNoun.surahId),
      ayahNo: Number(pattern.definiteNoun.ayahNo),
      words: [
        { wordNo: Number(pattern.definiteNoun.wordNo) },
        { wordNo: Number(pattern.indefiniteNoun.wordNo) },
      ],
    }));

    res.json({
      count: limited.length,
      totalPatterns: alNomPatterns.length,
      scannedSegments: records.length,
      limit,
      filter,
      examples,
      patterns: limited,
      debug: {
        totalAlNomPatterns: alNomPatterns.length,
        samplePatterns: alNomPatterns.slice(0, 5),
        alCount,
        alNomCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
