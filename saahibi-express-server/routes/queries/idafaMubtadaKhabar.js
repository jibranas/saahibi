import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function getCaseLabel(nominalCase) {
  if (nominalCase === 'NOM') return 'مرفوع - Nominative';
  if (nominalCase === 'ACC') return 'منصوب - Accusative';
  if (nominalCase === 'GEN') return 'مجرور - Genitive';
  return nominalCase || 'N/A';
}

function findIdafaMubtadaKhabarPatterns(records) {
  const patterns = [];
  const processedWordIds = new Set();
  let idafaCount = 0;
  let withKhabarCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    if (record.PartOfSpeech !== 'N') continue;

    const wordId = record.WordId;
    const widKey = String(wordId);
    if (processedWordIds.has(widKey)) continue;

    const nomState = String(record.NominalState || '').trim();
    if (nomState !== '') continue;
    if (!record.NominalCase || String(record.NominalCase).trim() === '') continue;

    let hasDet = false;
    let wordStart = i;
    while (wordStart > 0 && records[wordStart - 1].WordId === wordId) {
      wordStart--;
    }

    const muzafSegments = [];
    let j = wordStart;
    while (j < records.length && records[j].WordId === wordId) {
      muzafSegments.push(records[j]);
      if (records[j].PrefixType && String(records[j].PrefixType).includes('DET')) {
        hasDet = true;
      }
      j++;
    }

    if (hasDet) continue;
    processedWordIds.add(widKey);

    if (j >= records.length || records[j].AyahId !== record.AyahId) continue;

    const ilayWordId = records[j].WordId;
    const ilaySegments = [];
    let ilayNoun = null;

    while (j < records.length && records[j].WordId === ilayWordId) {
      ilaySegments.push(records[j]);
      if (
        records[j].PartOfSpeech === 'N' &&
        records[j].NominalCase &&
        String(records[j].NominalCase).includes('GEN') &&
        !ilayNoun
      ) {
        ilayNoun = records[j];
      }
      j++;
    }

    if (!ilayNoun) continue;

    idafaCount++;

    if (j >= records.length || records[j].AyahId !== record.AyahId) continue;

    const khabarWordId = records[j].WordId;
    const khabarSegments = [];
    let khabarNoun = null;

    while (j < records.length && records[j].WordId === khabarWordId) {
      khabarSegments.push(records[j]);
      if (
        records[j].PartOfSpeech === 'N' &&
        records[j].NominalState &&
        String(records[j].NominalState).includes('INDEF') &&
        records[j].Text &&
        String(records[j].Text).trim() !== '' &&
        !khabarNoun
      ) {
        khabarNoun = records[j];
      }
      j++;
    }

    if (!khabarNoun) continue;

    withKhabarCount++;

    const muzafCombinedText = muzafSegments.map((s) => s.Text || '').join('');
    const muzafCombinedTextBw = muzafSegments.map((s) => s.TextBw || '').join('');
    const ilayCombinedText = ilaySegments.map((s) => s.Text || '').join('');
    const ilayCombinedTextBw = ilaySegments.map((s) => s.TextBw || '').join('');
    const khabarCombinedText = khabarSegments.map((s) => s.Text || '').join('');
    const khabarCombinedTextBw = khabarSegments.map((s) => s.TextBw || '').join('');

    const ilayStateLabel =
      ilayNoun.NominalState === 'INDEF' ? 'نكرة - Indefinite' : 'معرفة - Definite';

    patterns.push({
      muzaf: {
        surahId: muzafSegments[0].SurahId,
        ayahNo: muzafSegments[0].AyahNo,
        wordNo: muzafSegments[0].WordNo,
        combinedText: muzafCombinedText,
        combinedTextBw: muzafCombinedTextBw,
        lemma: record.Lemma,
        root: record.Root,
        nominalCase: record.NominalCase,
        caseLabel: getCaseLabel(record.NominalCase),
        number: record.Number,
        gender: record.Gender,
      },
      muzafIlayhi: {
        surahId: ilaySegments[0].SurahId,
        ayahNo: ilaySegments[0].AyahNo,
        wordNo: ilaySegments[0].WordNo,
        combinedText: ilayCombinedText,
        combinedTextBw: ilayCombinedTextBw,
        lemma: ilayNoun.Lemma,
        root: ilayNoun.Root,
        nominalCase: ilayNoun.NominalCase,
        nominalState: ilayNoun.NominalState,
        stateLabel: ilayStateLabel,
        number: ilayNoun.Number,
        gender: ilayNoun.Gender,
      },
      khabar: {
        surahId: khabarSegments[0].SurahId,
        ayahNo: khabarSegments[0].AyahNo,
        wordNo: khabarSegments[0].WordNo,
        combinedText: khabarCombinedText,
        combinedTextBw: khabarCombinedTextBw,
        lemma: khabarNoun.Lemma,
        root: khabarNoun.Root,
        nominalCase: khabarNoun.NominalCase,
        nominalState: khabarNoun.NominalState,
        nominalDerivation: khabarNoun.NominalDerivation,
        caseLabel: getCaseLabel(khabarNoun.NominalCase),
        number: khabarNoun.Number,
        gender: khabarNoun.Gender,
      },
    });
  }

  return { patterns, idafaCount, withKhabarCount };
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

    const { patterns, idafaCount, withKhabarCount } = findIdafaMubtadaKhabarPatterns(records);
    const limitedPatterns = patterns.slice(0, limit);

    const wordRefs = [];
    for (const p of limitedPatterns) {
      wordRefs.push(p.muzaf, p.muzafIlayhi, p.khabar);
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const p of limitedPatterns) {
      p.muzaf.translations =
        translationMap.get(
          wordKey(p.muzaf.surahId, p.muzaf.ayahNo, p.muzaf.wordNo)
        ) || null;
      p.muzafIlayhi.translations =
        translationMap.get(
          wordKey(p.muzafIlayhi.surahId, p.muzafIlayhi.ayahNo, p.muzafIlayhi.wordNo)
        ) || null;
      p.khabar.translations =
        translationMap.get(
          wordKey(p.khabar.surahId, p.khabar.ayahNo, p.khabar.wordNo)
        ) || null;
    }

    const examples = limitedPatterns.map((pattern) => ({
      surahId: Number(pattern.muzaf.surahId),
      ayahNo: Number(pattern.muzaf.ayahNo),
      words: [
        { wordNo: Number(pattern.muzaf.wordNo) },
        { wordNo: Number(pattern.muzafIlayhi.wordNo) },
        { wordNo: Number(pattern.khabar.wordNo) },
      ],
    }));

    res.json({
      count: limitedPatterns.length,
      totalPatterns: patterns.length,
      scannedSegments: records.length,
      limit,
      filter,
      examples,
      patterns: limitedPatterns,
      debug: {
        totalPatterns: patterns.length,
        samplePatterns: patterns.slice(0, 5),
        idafaCount,
        withKhabarCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
