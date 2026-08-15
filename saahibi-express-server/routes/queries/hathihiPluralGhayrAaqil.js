import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function isPluralThree(n) {
  return String(n == null ? '' : n).trim() === '3' || Number(n) === 3;
}

function findHathihiPatterns(records) {
  const patterns = [];
  let hathihiCount = 0;
  let hathihiAlCount = 0;
  let pluralCount = 0;

  for (let i = 0; i < records.length - 3; i++) {
    const haRecord = records[i];
    const dhihiRecord = records[i + 1];

    if (String(haRecord.TextBw) !== 'ha`' || haRecord.PrefixType !== 'ATT') continue;
    if (
      !dhihiRecord ||
      String(dhihiRecord.TextBw) !== '*ihi' ||
      dhihiRecord.LemmaBw !== '*A'
    )
      continue;
    if (haRecord.WordId !== dhihiRecord.WordId) continue;

    hathihiCount++;

    let j = i + 2;
    while (j < records.length && records[j].WordId === haRecord.WordId) {
      j++;
    }

    if (j >= records.length || records[j].AyahId !== haRecord.AyahId) continue;

    const nextWordId = records[j].WordId;
    const nextWordSegments = [];
    let hasDet = false;
    let nounRecord = null;

    while (j < records.length && records[j].WordId === nextWordId) {
      nextWordSegments.push(records[j]);
      if (records[j].PrefixType && String(records[j].PrefixType).includes('DET')) {
        hasDet = true;
      }
      if (records[j].PartOfSpeech === 'N' && !nounRecord) {
        nounRecord = records[j];
      }
      j++;
    }

    if (!hasDet || !nounRecord) continue;

    hathihiAlCount++;

    if (!isPluralThree(nounRecord.Number)) continue;

    pluralCount++;

    const hathihiText = `${haRecord.Text || ''}${dhihiRecord.Text || ''}`;
    const hathihiTextBw = `${haRecord.TextBw || ''}${dhihiRecord.TextBw || ''}`;
    const musharunText = nextWordSegments.map((s) => s.Text || '').join('');
    const musharunTextBw = nextWordSegments.map((s) => s.TextBw || '').join('');

    const nc = nounRecord.NominalCase;
    const caseLabel =
      nc === 'NOM'
        ? 'مرفوع - Nominative'
        : nc === 'ACC'
          ? 'منصوب - Accusative'
          : nc === 'GEN'
            ? 'مجرور - Genitive'
            : nc || 'N/A';

    patterns.push({
      ishara: {
        surahId: haRecord.SurahId,
        ayahNo: haRecord.AyahNo,
        wordNo: haRecord.WordNo,
        text: hathihiText,
        textBw: hathihiTextBw,
      },
      musharunIlayhi: {
        surahId: nounRecord.SurahId,
        ayahNo: nounRecord.AyahNo,
        wordNo: nextWordSegments[0].WordNo,
        combinedText: musharunText,
        combinedTextBw: musharunTextBw,
        nounText: nounRecord.Text,
        nounTextBw: nounRecord.TextBw,
        lemma: nounRecord.Lemma,
        root: nounRecord.Root,
        nominalCase: nounRecord.NominalCase,
        nominalState: nounRecord.NominalState,
        nominalDerivation: nounRecord.NominalDerivation,
        number: nounRecord.Number,
        gender: nounRecord.Gender,
        caseLabel,
      },
    });
  }

  return { patterns, hathihiCount, hathihiAlCount, pluralCount };
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

    const { patterns, hathihiCount, hathihiAlCount, pluralCount } =
      findHathihiPatterns(records);
    const limited = patterns.slice(0, limit);

    const wordRefs = [];
    for (const p of limited) {
      wordRefs.push(
        { surahId: p.ishara.surahId, ayahNo: p.ishara.ayahNo, wordNo: p.ishara.wordNo },
        {
          surahId: p.musharunIlayhi.surahId,
          ayahNo: p.musharunIlayhi.ayahNo,
          wordNo: p.musharunIlayhi.wordNo,
        }
      );
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const p of limited) {
      p.ishara.translations =
        translationMap.get(
          wordKey(p.ishara.surahId, p.ishara.ayahNo, p.ishara.wordNo)
        ) || null;
      p.musharunIlayhi.translations =
        translationMap.get(
          wordKey(
            p.musharunIlayhi.surahId,
            p.musharunIlayhi.ayahNo,
            p.musharunIlayhi.wordNo
          )
        ) || null;
    }

    const examples = limited.map((pattern) => ({
      surahId: Number(pattern.ishara.surahId),
      ayahNo: Number(pattern.ishara.ayahNo),
      words: [
        { wordNo: Number(pattern.ishara.wordNo) },
        { wordNo: Number(pattern.musharunIlayhi.wordNo) },
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
        samplePatterns: patterns.slice(0, 5),
        hathihiCount,
        hathihiAlCount,
        pluralCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
