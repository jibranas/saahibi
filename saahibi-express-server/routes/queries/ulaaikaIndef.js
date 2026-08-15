import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function findUlaikaIndefPatterns(records) {
  const ulaikaPatterns = [];
  let ulaiCount = 0;
  let kaCount = 0;

  for (let i = 0; i < records.length - 2; i++) {
    const ulaiRecord = records[i];
    const kaRecord = records[i + 1];
    const nextRecord = records[i + 2];

    const ulaiBw = ulaiRecord.TextBw && String(ulaiRecord.TextBw);
    if (ulaiBw && ulaiBw.includes('>uw@la`^}i')) {
      ulaiCount++;
    }

    if (
      ulaiBw &&
      ulaiBw.includes('>uw@la`^}i') &&
      kaRecord &&
      String(kaRecord.TextBw) === 'ka' &&
      ulaiRecord.SurahId === kaRecord.SurahId &&
      ulaiRecord.AyahId === kaRecord.AyahId &&
      ulaiRecord.WordId === kaRecord.WordId
    ) {
      kaCount++;

      if (
        nextRecord &&
        nextRecord.PartOfSpeech === 'N' &&
        nextRecord.NominalState &&
        String(nextRecord.NominalState).includes('INDEF') &&
        nextRecord.Text &&
        String(nextRecord.Text).trim() !== ''
      ) {
        ulaikaPatterns.push({
          ulaika: {
            surahId: ulaiRecord.SurahId,
            ayahNo: ulaiRecord.AyahNo,
            wordNo: ulaiRecord.WordNo,
            ulaiText: ulaiRecord.Text,
            ulaiTextBw: ulaiRecord.TextBw,
            kaText: kaRecord.Text,
            kaTextBw: kaRecord.TextBw,
            combinedText: `${ulaiRecord.Text || ''}${kaRecord.Text || ''}`,
            combinedTextBw: `${ulaiRecord.TextBw || ''}${kaRecord.TextBw || ''}`,
          },
          indefiniteNoun: {
            surahId: nextRecord.SurahId,
            ayahNo: nextRecord.AyahNo,
            wordNo: nextRecord.WordNo,
            text: nextRecord.Text,
            textBw: nextRecord.TextBw,
            lemma: nextRecord.Lemma,
            root: nextRecord.Root,
            nominalCase: nextRecord.NominalCase,
            nominalState: nextRecord.NominalState,
            nominalDerivation: nextRecord.NominalDerivation,
            number: nextRecord.Number,
            gender: nextRecord.Gender,
          },
        });
      }
    }
  }

  return { ulaikaPatterns, ulaiCount, kaCount };
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

    const { ulaikaPatterns, ulaiCount, kaCount } = findUlaikaIndefPatterns(records);
    const limited = ulaikaPatterns.slice(0, limit);

    const wordRefs = [];
    for (const p of limited) {
      wordRefs.push(
        { surahId: p.ulaika.surahId, ayahNo: p.ulaika.ayahNo, wordNo: p.ulaika.wordNo },
        {
          surahId: p.indefiniteNoun.surahId,
          ayahNo: p.indefiniteNoun.ayahNo,
          wordNo: p.indefiniteNoun.wordNo,
        }
      );
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const p of limited) {
      p.ulaika.translations =
        translationMap.get(
          wordKey(p.ulaika.surahId, p.ulaika.ayahNo, p.ulaika.wordNo)
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
      surahId: Number(pattern.ulaika.surahId),
      ayahNo: Number(pattern.ulaika.ayahNo),
      words: [
        { wordNo: Number(pattern.ulaika.wordNo) },
        { wordNo: Number(pattern.indefiniteNoun.wordNo) },
      ],
    }));

    res.json({
      count: limited.length,
      totalPatterns: ulaikaPatterns.length,
      scannedSegments: records.length,
      limit,
      filter,
      examples,
      patterns: limited,
      debug: {
        totalUlaikaPatterns: ulaikaPatterns.length,
        samplePatterns: ulaikaPatterns.slice(0, 5),
        ulaiCount,
        kaCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
