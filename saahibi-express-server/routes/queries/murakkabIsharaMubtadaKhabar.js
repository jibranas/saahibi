import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function getIsharaTranslation(combinedTextBw) {
  const bw = String(combinedTextBw || '');
  if (bw.includes('ha`') && bw.includes('*aA') && !bw.includes('*aAni')) return 'this (masc.)';
  if (bw.includes('ha`') && bw.includes('*ihi')) return 'this (fem.)';
  if (bw.includes('ha`') && bw.includes('*aAni')) return 'these two (masc.)';
  if (bw.includes('ha`') && bw.includes('taAni')) return 'these two (fem.)';
  if (bw.includes('ha`') && bw.includes('&ulaA')) return 'these (plural)';
  if (bw.includes('>uw@la`^}i')) return 'those (plural)';
  if (bw.startsWith('*a`') && bw.includes('ka')) return 'that (masc.)';
  if (bw.startsWith('ti') && bw.includes('lo') && bw.includes('ka')) return 'that (fem.)';
  return 'demonstrative';
}

function getIsharaType(combinedTextBw) {
  const bw = String(combinedTextBw || '');
  if (bw.includes('ha`') && bw.includes('*aA') && !bw.includes('*aAni')) return 'اسم إشارة للمفرد المذكر';
  if (bw.includes('ha`') && bw.includes('*ihi')) return 'اسم إشارة للمفرد المؤنث';
  if (bw.includes('ha`') && bw.includes('*aAni')) return 'اسم إشارة للمثنى المذكر';
  if (bw.includes('ha`') && bw.includes('taAni')) return 'اسم إشارة للمثنى المؤنث';
  if (bw.includes('ha`') && bw.includes('&ulaA')) return 'اسم إشارة للجمع القريب';
  if (bw.includes('>uw@la`^}i')) return 'اسم إشارة للجمع البعيد';
  if (bw.startsWith('*a`') && bw.includes('ka')) return 'اسم إشارة للمفرد المذكر البعيد';
  if (bw.startsWith('ti') && bw.includes('lo') && bw.includes('ka')) return 'اسم إشارة للمفرد المؤنث البعيد';
  return 'اسم إشارة';
}

function caseLabelFromNominalCase(nominalCase) {
  const nc = nominalCase;
  if (nc === 'NOM') return 'مرفوع - Nominative';
  if (nc === 'ACC') return 'منصوب - Accusative';
  if (nc === 'GEN') return 'مجرور - Genitive';
  return nc || 'N/A';
}

function findPatterns(records) {
  const patterns = [];
  const processedWordIds = new Set();
  let isharaCount = 0;
  let murakkabCount = 0;
  let withKhabarCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    if (record.LemmaBw !== '*A') continue;

    const isharaWordId = record.WordId;
    const widKey = String(isharaWordId);
    if (processedWordIds.has(widKey)) continue;
    processedWordIds.add(widKey);

    isharaCount++;

    let startIdx = i;
    while (startIdx > 0 && records[startIdx - 1].WordId === isharaWordId) {
      startIdx--;
    }

    const isharaSegments = [];
    let j = startIdx;
    while (j < records.length && records[j].WordId === isharaWordId) {
      isharaSegments.push(records[j]);
      j++;
    }

    if (j >= records.length || records[j].AyahId !== record.AyahId) continue;

    const musharunWordId = records[j].WordId;
    const musharunSegments = [];
    let hasDet = false;
    let musharunNoun = null;

    while (j < records.length && records[j].WordId === musharunWordId) {
      musharunSegments.push(records[j]);
      if (records[j].PrefixType && String(records[j].PrefixType).includes('DET')) {
        hasDet = true;
      }
      if (records[j].PartOfSpeech === 'N' && !musharunNoun) {
        musharunNoun = records[j];
      }
      j++;
    }

    if (!hasDet || !musharunNoun) continue;

    murakkabCount++;

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

    const isharaCombinedText = isharaSegments.map((s) => s.Text || '').join('');
    const isharaCombinedTextBw = isharaSegments.map((s) => s.TextBw || '').join('');
    const musharunCombinedText = musharunSegments.map((s) => s.Text || '').join('');
    const musharunCombinedTextBw = musharunSegments.map((s) => s.TextBw || '').join('');
    const khabarCombinedText = khabarSegments.map((s) => s.Text || '').join('');
    const khabarCombinedTextBw = khabarSegments.map((s) => s.TextBw || '').join('');

    const musharunCaseLabel = caseLabelFromNominalCase(musharunNoun.NominalCase);
    const khabarCaseLabel = caseLabelFromNominalCase(khabarNoun.NominalCase);

    patterns.push({
      ishara: {
        surahId: isharaSegments[0].SurahId,
        ayahNo: isharaSegments[0].AyahNo,
        wordNo: isharaSegments[0].WordNo,
        combinedText: isharaCombinedText,
        combinedTextBw: isharaCombinedTextBw,
        translation: getIsharaTranslation(isharaCombinedTextBw),
        type: getIsharaType(isharaCombinedTextBw),
      },
      musharunIlayhi: {
        surahId: musharunNoun.SurahId,
        ayahNo: musharunNoun.AyahNo,
        wordNo: musharunSegments[0].WordNo,
        combinedText: musharunCombinedText,
        combinedTextBw: musharunCombinedTextBw,
        lemma: musharunNoun.Lemma,
        root: musharunNoun.Root,
        nominalCase: musharunNoun.NominalCase,
        caseLabel: musharunCaseLabel,
        number: musharunNoun.Number,
        gender: musharunNoun.Gender,
      },
      khabar: {
        surahId: khabarNoun.SurahId,
        ayahNo: khabarNoun.AyahNo,
        wordNo: khabarSegments[0].WordNo,
        combinedText: khabarCombinedText,
        combinedTextBw: khabarCombinedTextBw,
        lemma: khabarNoun.Lemma,
        root: khabarNoun.Root,
        nominalCase: khabarNoun.NominalCase,
        nominalState: khabarNoun.NominalState,
        nominalDerivation: khabarNoun.NominalDerivation,
        caseLabel: khabarCaseLabel,
        number: khabarNoun.Number,
        gender: khabarNoun.Gender,
      },
    });
  }

  return { patterns, isharaCount, murakkabCount, withKhabarCount };
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

    const { patterns, isharaCount, murakkabCount, withKhabarCount } =
      findPatterns(records);
    const limited = patterns.slice(0, limit);

    const wordRefs = [];
    for (const p of limited) {
      wordRefs.push(p.ishara, p.musharunIlayhi, p.khabar);
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
      p.khabar.translations =
        translationMap.get(
          wordKey(p.khabar.surahId, p.khabar.ayahNo, p.khabar.wordNo)
        ) || null;
    }

    const examples = limited.map((pattern) => ({
      surahId: Number(pattern.ishara.surahId),
      ayahNo: Number(pattern.ishara.ayahNo),
      words: [
        { wordNo: Number(pattern.ishara.wordNo) },
        { wordNo: Number(pattern.musharunIlayhi.wordNo) },
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
        samplePatterns: patterns.slice(0, 5),
        isharaCount,
        murakkabCount,
        withKhabarCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
