import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
const MUZAF_LEMMA_BW = '>ax';
const ASM_ARABIC = 'أَخ';
const ASM_EN = 'brother';

function getCaseLabel(nominalCase) {
  if (nominalCase === 'NOM') return 'مرفوع - Nominative';
  if (nominalCase === 'ACC') return 'منصوب - Accusative';
  if (nominalCase === 'GEN') return 'مجرور - Genitive';
  return nominalCase || 'N/A';
}

function caseOrder(nominalCase) {
  if (nominalCase && String(nominalCase).includes('NOM')) return 0;
  if (nominalCase && String(nominalCase).includes('ACC')) return 1;
  if (nominalCase && String(nominalCase).includes('GEN')) return 2;
  return 3;
}

function findIdafaAsmaAkhPatterns(records) {
  const patterns = [];
  const processedWordIds = new Set();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.PartOfSpeech !== 'N') continue;
    if (String(record.LemmaBw || '').trim() !== MUZAF_LEMMA_BW) continue;
    const wordId = record.WordId;
    const wordIdKey = String(wordId);
    if (processedWordIds.has(wordIdKey)) continue;
    const nomState = String(record.NominalState || '').trim();
    if (nomState !== '') continue;
    if (!record.NominalCase || String(record.NominalCase).trim() === '')
      continue;

    let hasDet = false;
    let wordStart = i;
    while (
      wordStart > 0 &&
      String(records[wordStart - 1].WordId) === wordIdKey
    ) {
      wordStart--;
    }
    const muzafSegments = [];
    let j = wordStart;
    while (j < records.length && String(records[j].WordId) === wordIdKey) {
      muzafSegments.push(records[j]);
      if (
        records[j].PrefixType &&
        String(records[j].PrefixType).includes('DET')
      )
        hasDet = true;
      j++;
    }
    if (hasDet) continue;
    processedWordIds.add(wordIdKey);

    if (j >= records.length || records[j].AyahId !== record.AyahId) continue;
    const nextWordId = records[j].WordId;
    const nextWordIdKey = String(nextWordId);
    const ilaySegments = [];
    let ilayNoun = null;
    while (j < records.length && String(records[j].WordId) === nextWordIdKey) {
      ilaySegments.push(records[j]);
      if (
        records[j].PartOfSpeech === 'N' &&
        records[j].NominalCase &&
        String(records[j].NominalCase).includes('GEN') &&
        !ilayNoun
      )
        ilayNoun = records[j];
      j++;
    }
    if (!ilayNoun) continue;

    const muzafCombinedText = muzafSegments.map((s) => s.Text).join('');
    const muzafCombinedTextBw = muzafSegments
      .map((s) => s.TextBw || '')
      .join('');
    const ilayCombinedText = ilaySegments.map((s) => s.Text).join('');
    const ilayCombinedTextBw = ilaySegments
      .map((s) => s.TextBw || '')
      .join('');
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
      },
      muzafIlayhi: {
        wordNo: ilaySegments[0].WordNo,
        combinedText: ilayCombinedText,
        combinedTextBw: ilayCombinedTextBw,
        lemma: ilayNoun.Lemma,
        root: ilayNoun.Root,
        nominalCase: ilayNoun.NominalCase,
        nominalState: ilayNoun.NominalState,
      },
    });
  }

  patterns.sort(
    (a, b) => caseOrder(a.muzaf.nominalCase) - caseOrder(b.muzaf.nominalCase)
  );
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
      if (Number.isFinite(s)) {
        filter.SurahId = Math.min(
          QURAN_SURAH_MAX,
          Math.max(QURAN_SURAH_MIN, Math.round(s))
        );
      }
    }
    const rawLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.floor(rawLimit)
        : Number.POSITIVE_INFINITY;
    const records = await fetchMorphologyOrdered(filter);

    const patterns = findIdafaAsmaAkhPatterns(records);
    const limitedPatterns = patterns.slice(0, limit);

    const examples = limitedPatterns.map((pattern, index) => {
      const ilayStateLabel =
        pattern.muzafIlayhi.nominalState === 'INDEF' ? 'نكرة' : 'معرفة';
      return {
        surahId: Number(pattern.muzaf.surahId),
        ayahNo: Number(pattern.muzaf.ayahNo),
        words: [
          { wordNo: Number(pattern.muzaf.wordNo) },
          { wordNo: Number(pattern.muzafIlayhi.wordNo) },
        ],
        beforeInterlude: [
          {
            type: 'text',
            content: `
            <h3>إضافة — مضاف (${ASM_ARABIC} من الأسماء الخمسة) — Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">إعراب: ${pattern.muzaf.caseLabel} (رَفْع ثم نَصْب ثم جَرّ)</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">المضاف — ${ASM_ARABIC} (${ASM_EN})</h5>
                  <div class="text-2xl arabic mb-2">${pattern.muzaf.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.muzaf.combinedTextBw}</div>
                  <p class="text-green-700">Case: ${pattern.muzaf.caseLabel}</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">المضاف إليه</h5>
                  <div class="text-2xl arabic mb-2">${pattern.muzafIlayhi.combinedText}</div>
                  <p class="text-amber-700">"${pattern.muzafIlayhi.lemma}" — ${ilayStateLabel}، مجرور</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <div class="text-xl arabic">${pattern.muzaf.combinedText} ${pattern.muzafIlayhi.combinedText}</div>
                <p class="text-sm mt-2">الأسماء الخمسة: أَخ — رفعًا (أَخُو)، نصبًا (أَخَا)، جرًّا (أَخِي)</p>
              </div>
            </div>
          `,
          },
        ],
      };
    });

    const wordRefs = [];
    for (const ex of examples) {
      wordRefs.push(
        { surahId: ex.surahId, ayahNo: ex.ayahNo, wordNo: ex.words[0].wordNo },
        { surahId: ex.surahId, ayahNo: ex.ayahNo, wordNo: ex.words[1].wordNo }
      );
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of examples) {
      ex.translations = [
        translationMap.get(
          wordKey(ex.surahId, ex.ayahNo, ex.words[0].wordNo)
        ) || null,
        translationMap.get(
          wordKey(ex.surahId, ex.ayahNo, ex.words[1].wordNo)
        ) || null,
      ];
    }

    res.json({
      count: examples.length,
      totalPatterns: patterns.length,
      scannedSegments: records.length,
      limit,
      filter,
      examples,
      debug: { totalPatterns: patterns.length },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
