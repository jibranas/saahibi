import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function findAyahsWithVpn(records) {
  const wordPosMap = new Map();
  for (const record of records) {
    const wk = `${record.SurahId}-${record.AyahNo}-${record.WordNo}`;
    if (!wordPosMap.has(wk)) {
      wordPosMap.set(wk, new Set());
    }
    const pos = record.PartOfSpeech;
    if (['V', 'P', 'N'].includes(pos)) {
      wordPosMap.get(wk).add(pos);
    }
  }

  const ayahMap = new Map();
  for (const record of records) {
    const wk = `${record.SurahId}-${record.AyahNo}-${record.WordNo}`;
    const posSet = wordPosMap.get(wk);
    if (
      posSet &&
      posSet.size === 1 &&
      ['V', 'P', 'N'].includes(record.PartOfSpeech)
    ) {
      const ayahKey = `${record.SurahId}-${record.AyahNo}`;
      if (!ayahMap.has(ayahKey)) {
        ayahMap.set(ayahKey, new Map());
      }
      ayahMap
        .get(ayahKey)
        .set(Number(record.WordNo), record.PartOfSpeech);
    }
  }

  const ayahsWithVPN = Array.from(ayahMap.entries())
    .map(([key, wordMap]) => {
      const [surahId, ayahNo] = key.split('-').map(Number);
      const words = Array.from(wordMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([wordNo, pos]) => ({ wordNo, pos }));

      let pattern = [];
      for (let i = 0; i < words.length - 2; i++) {
        if (
          words[i].pos === 'V' &&
          words[i + 1].pos === 'P' &&
          words[i + 2].pos === 'N' &&
          words[i + 1].wordNo === words[i].wordNo + 1 &&
          words[i + 2].wordNo === words[i + 1].wordNo + 1
        ) {
          pattern = [
            { wordNo: words[i].wordNo },
            { wordNo: words[i + 1].wordNo },
            { wordNo: words[i + 2].wordNo },
          ];
          break;
        }
      }

      return pattern.length ? { surahId, ayahNo, words: pattern } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.surahId !== b.surahId) return a.surahId - b.surahId;
      return a.ayahNo - b.ayahNo;
    });

  return ayahsWithVPN;
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

    const examples = findAyahsWithVpn(records);
    const limited = examples.slice(0, limit);

    const wordRefs = [];
    for (const ex of limited) {
      for (const w of ex.words || []) {
        wordRefs.push({
          surahId: ex.surahId,
          ayahNo: ex.ayahNo,
          wordNo: w.wordNo,
        });
      }
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of limited) {
      ex.translations = (ex.words || []).map((w) =>
        translationMap.get(wordKey(ex.surahId, ex.ayahNo, w.wordNo)) || null
      );
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
