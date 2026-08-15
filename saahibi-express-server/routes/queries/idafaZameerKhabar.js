import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
const ZAMEER_TEXT_BW = new Set([
  'hu',
  'ha',
  'haA',
  'ka',
  'ki',
  'hi',
  'ta',
  'huma',
  'kuma',
  'hum',
  'himo',
  'hunna',
  'humo',
  'kum',
  'kunna',
  'ya',
  'na',
  'naA',
  'n~aA',
]);

function getCaseLabel(nominalCase) {
  if (nominalCase === 'NOM') return 'مرفوع - Nominative';
  if (nominalCase === 'ACC') return 'منصوب - Accusative';
  if (nominalCase === 'GEN') return 'مجرور - Genitive';
  return nominalCase || 'N/A';
}

function findIdafaZameerKhabarPatterns(records) {
  const patterns = [];
  const processedWordIds = new Set();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.PartOfSpeech !== 'N') continue;
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
    const idafaWordSegments = [];
    let j = wordStart;
    let hasConstructNoun = false;
    let hasZameer = false;
    let zameerTextBw = '';
    let constructNounSegment = null;

    while (j < records.length && String(records[j].WordId) === wordIdKey) {
      const seg = records[j];
      idafaWordSegments.push(seg);
      if (seg.PrefixType && String(seg.PrefixType).includes('DET'))
        hasDet = true;
      if (
        seg.PartOfSpeech === 'N' &&
        String(seg.NominalState || '').trim() === '' &&
        seg.NominalCase
      ) {
        hasConstructNoun = true;
        if (!constructNounSegment) constructNounSegment = seg;
      }
      if (seg.SuffixType && String(seg.SuffixType).includes('PRON')) {
        const bw = String(seg.TextBw || '').trim();
        if (ZAMEER_TEXT_BW.has(bw)) {
          hasZameer = true;
          zameerTextBw = bw;
        }
      }
      j++;
    }

    if (hasDet || !hasConstructNoun || !hasZameer) continue;
    processedWordIds.add(wordIdKey);

    if (j >= records.length || records[j].AyahId !== record.AyahId) continue;
    const khabarWordId = records[j].WordId;
    const khabarWordIdKey = String(khabarWordId);
    const khabarSegments = [];
    let khabarNoun = null;
    while (j < records.length && String(records[j].WordId) === khabarWordIdKey) {
      khabarSegments.push(records[j]);
      if (
        records[j].PartOfSpeech === 'N' &&
        records[j].NominalState &&
        String(records[j].NominalState).includes('INDEF') &&
        records[j].NominalCase &&
        String(records[j].NominalCase).includes('NOM') &&
        records[j].Text &&
        String(records[j].Text).trim() !== '' &&
        !khabarNoun
      ) {
        khabarNoun = records[j];
      }
      j++;
    }
    if (!khabarNoun) continue;

    const idafaCombinedText = idafaWordSegments.map((s) => s.Text).join('');
    const idafaCombinedTextBw = idafaWordSegments
      .map((s) => s.TextBw || '')
      .join('');
    const khabarCombinedText = khabarSegments.map((s) => s.Text).join('');
    const khabarCombinedTextBw = khabarSegments
      .map((s) => s.TextBw || '')
      .join('');

    patterns.push({
      idafa: {
        surahId: idafaWordSegments[0].SurahId,
        ayahNo: idafaWordSegments[0].AyahNo,
        wordNo: idafaWordSegments[0].WordNo,
        combinedText: idafaCombinedText,
        combinedTextBw: idafaCombinedTextBw,
        muzafLemma: constructNounSegment?.Lemma,
        muzafRoot: constructNounSegment?.Root,
        nominalCase: constructNounSegment?.NominalCase,
        caseLabel: getCaseLabel(constructNounSegment?.NominalCase || ''),
        zameerTextBw,
      },
      khabar: {
        wordNo: khabarSegments[0].WordNo,
        combinedText: khabarCombinedText,
        combinedTextBw: khabarCombinedTextBw,
        lemma: khabarNoun.Lemma,
        root: khabarNoun.Root,
      },
    });
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

    const patterns = findIdafaZameerKhabarPatterns(records);
    const limitedPatterns = patterns.slice(0, limit);

    const examples = limitedPatterns.map((pattern, index) => ({
      surahId: Number(pattern.idafa.surahId),
      ayahNo: Number(pattern.idafa.ayahNo),
      words: [
        { wordNo: Number(pattern.idafa.wordNo) },
        { wordNo: Number(pattern.khabar.wordNo) },
      ],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>Idafa (مضاف + مضاف إليه ضمير) + خبر — Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">Structure: (مضاف + ضمير متصل) + خبر</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">مضاف + مضاف إليه (ضمير)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.idafa.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.idafa.combinedTextBw}</div>
                  <p class="text-green-700">"${pattern.idafa.muzafLemma}" + pronoun (${pattern.idafa.zameerTextBw})</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.idafa.muzafRoot || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case of مضاف: ${pattern.idafa.caseLabel}</p>
                  <p class="text-xs text-gray-600">مضاف إليه = ضمير متصل (hu, ha, ka, ki, hum, etc.)</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">الخبر (Khabar)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.khabar.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.khabar.combinedTextBw}</div>
                  <p class="text-amber-700">"${pattern.khabar.lemma}"</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.khabar.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">نكرة مرفوع (indefinite, nominative)</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">جملة اسمية: مبتدأ (إضافة مع ضمير) + خبر</h5>
                <div class="text-xl arabic mb-2">${pattern.idafa.combinedText} ${pattern.khabar.combinedText}</div>
                <p class="text-purple-800">"${pattern.idafa.muzafLemma}" (with pronoun) is "${pattern.khabar.lemma}"</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li>المبتدأ = إضافة: مضاف + مضاف إليه (ضمير: ${pattern.idafa.zameerTextBw})</li>
                    <li>الخبر = نكرة مرفوع</li>
                  </ul>
                </div>
              </div>
            </div>
          `,
        },
      ],
    }));

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
