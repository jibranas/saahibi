import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function getIsharaTranslation(combinedTextBw) {
  const bw = String(combinedTextBw || '');
  if (bw.includes('ha`') && bw.includes('*aA')) return 'this (masc.)';
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
  if (bw.includes('ha`') && bw.includes('*aA') && !bw.includes('*aAni'))
    return 'اسم إشارة للمفرد المذكر (near masc. sing.)';
  if (bw.includes('ha`') && bw.includes('*ihi')) return 'اسم إشارة للمفرد المؤنث (near fem. sing.)';
  if (bw.includes('ha`') && bw.includes('*aAni')) return 'اسم إشارة للمثنى المذكر (near masc. dual)';
  if (bw.includes('ha`') && bw.includes('taAni')) return 'اسم إشارة للمثنى المؤنث (near fem. dual)';
  if (bw.includes('ha`') && bw.includes('&ulaA')) return 'اسم إشارة للجمع القريب (near plural)';
  if (bw.includes('>uw@la`^}i')) return 'اسم إشارة للجمع البعيد (far plural)';
  if (bw.startsWith('*a`') && bw.includes('ka')) return 'اسم إشارة للمفرد المذكر البعيد (far masc. sing.)';
  if (bw.startsWith('ti') && bw.includes('lo') && bw.includes('ka'))
    return 'اسم إشارة للمفرد المؤنث البعيد (far fem. sing.)';
  return 'اسم إشارة';
}

function findMurakkabIsharaPatterns(records) {
  const patterns = [];
  const processedWordIds = new Set();
  let isharaCount = 0;
  let murakkabCount = 0;

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

    murakkabCount++;

    const isharaCombinedText = isharaSegments.map((s) => s.Text || '').join('');
    const isharaCombinedTextBw = isharaSegments.map((s) => s.TextBw || '').join('');
    const musharunCombinedText = nextWordSegments.map((s) => s.Text || '').join('');
    const musharunCombinedTextBw = nextWordSegments.map((s) => s.TextBw || '').join('');

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
        surahId: nounRecord.SurahId,
        ayahNo: nounRecord.AyahNo,
        wordNo: nextWordSegments[0].WordNo,
        combinedText: musharunCombinedText,
        combinedTextBw: musharunCombinedTextBw,
        nounText: nounRecord.Text,
        nounTextBw: nounRecord.TextBw,
        lemma: nounRecord.Lemma,
        root: nounRecord.Root,
        nominalCase: nounRecord.NominalCase,
        nominalState: nounRecord.NominalState,
        nominalDerivation: nounRecord.NominalDerivation,
        number: nounRecord.Number,
        gender: nounRecord.Gender,
      },
    });
  }

  return { patterns, isharaCount, murakkabCount };
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

    const { patterns, isharaCount, murakkabCount } = findMurakkabIsharaPatterns(records);
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
        isharaCount,
        murakkabCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
