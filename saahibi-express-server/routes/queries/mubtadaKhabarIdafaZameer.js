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

function findMubtadaKhabarIdafaZameerPatterns(records) {
  const patterns = [];
  const processedKhabarWordIds = new Set();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record.PartOfSpeech !== 'N') continue;
    const khabarWordId = record.WordId;
    const khabarWordIdKey = String(khabarWordId);
    if (processedKhabarWordIds.has(khabarWordIdKey)) continue;
    const nomState = String(record.NominalState || '').trim();
    if (nomState !== '') continue;
    if (!record.NominalCase || !String(record.NominalCase).includes('NOM'))
      continue;

    let hasDet = false;
    let wordStart = i;
    while (
      wordStart > 0 &&
      String(records[wordStart - 1].WordId) === khabarWordIdKey
    ) {
      wordStart--;
    }
    const khabarSegments = [];
    let j = wordStart;
    let hasConstructNoun = false;
    let hasZameer = false;
    let zameerTextBw = '';
    let constructNounSegment = null;

    while (j < records.length && String(records[j].WordId) === khabarWordIdKey) {
      const seg = records[j];
      khabarSegments.push(seg);
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
    if (
      !constructNounSegment ||
      !constructNounSegment.NominalCase ||
      !String(constructNounSegment.NominalCase).includes('NOM')
    )
      continue;
    processedKhabarWordIds.add(khabarWordIdKey);

    if (wordStart === 0) continue;
    const mubtadaLastIdx = wordStart - 1;
    let mubtadaFirstIdx = mubtadaLastIdx;
    while (
      mubtadaFirstIdx > 0 &&
      String(records[mubtadaFirstIdx - 1].WordId) ===
        String(records[mubtadaLastIdx].WordId)
    ) {
      mubtadaFirstIdx--;
    }
    if (records[mubtadaLastIdx].AyahId !== record.AyahId) continue;

    const mubtadaSegments = [];
    let mubtadaNoun = null;
    for (let k = mubtadaFirstIdx; k <= mubtadaLastIdx; k++) {
      mubtadaSegments.push(records[k]);
      if (
        records[k].PartOfSpeech === 'N' &&
        records[k].NominalCase &&
        String(records[k].NominalCase).includes('NOM') &&
        (!records[k].NominalState ||
          !String(records[k].NominalState).includes('INDEF')) &&
        records[k].Text &&
        String(records[k].Text).trim() !== '' &&
        !mubtadaNoun
      ) {
        mubtadaNoun = records[k];
      }
    }
    if (!mubtadaNoun) continue;

    const mubtadaCombinedText = mubtadaSegments.map((s) => s.Text).join('');
    const mubtadaCombinedTextBw = mubtadaSegments
      .map((s) => s.TextBw || '')
      .join('');
    const khabarCombinedText = khabarSegments.map((s) => s.Text).join('');
    const khabarCombinedTextBw = khabarSegments
      .map((s) => s.TextBw || '')
      .join('');

    patterns.push({
      mubtada: {
        surahId: mubtadaSegments[0].SurahId,
        ayahNo: mubtadaSegments[0].AyahNo,
        wordNo: mubtadaSegments[0].WordNo,
        combinedText: mubtadaCombinedText,
        combinedTextBw: mubtadaCombinedTextBw,
        lemma: mubtadaNoun.Lemma,
        root: mubtadaNoun.Root,
      },
      khabar: {
        wordNo: khabarSegments[0].WordNo,
        combinedText: khabarCombinedText,
        combinedTextBw: khabarCombinedTextBw,
        muzafLemma: constructNounSegment?.Lemma,
        muzafRoot: constructNounSegment?.Root,
        zameerTextBw,
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

    const patterns = findMubtadaKhabarIdafaZameerPatterns(records);
    const limitedPatterns = patterns.slice(0, limit);

    const examples = limitedPatterns.map((pattern, index) => ({
      surahId: Number(pattern.mubtada.surahId),
      ayahNo: Number(pattern.mubtada.ayahNo),
      words: [
        { wordNo: Number(pattern.mubtada.wordNo) },
        { wordNo: Number(pattern.khabar.wordNo) },
      ],
      beforeInterlude: [
        {
          type: 'text',
          content: `
            <h3>مبتدأ + خبر (إضافة مع ضمير) — Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">Structure: مبتدأ + خبر (مضاف + مضاف إليه ضمير)</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">المبتدأ (Mubtada)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.mubtada.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.mubtada.combinedTextBw}</div>
                  <p class="text-green-700">"${pattern.mubtada.lemma}"</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.mubtada.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">مرفوع (nominative)</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">الخبر — مضاف + ضمير (Khabar: Idafa with pronoun)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.khabar.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.khabar.combinedTextBw}</div>
                  <p class="text-amber-700">"${pattern.khabar.muzafLemma}" + pronoun (${pattern.khabar.zameerTextBw})</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.khabar.muzafRoot || 'N/A'}</p>
                  <p class="text-xs text-gray-600">الخبر = إضافة (مضاف + مضاف إليه ضمير) مرفوع</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">الجملة الاسمية:</h5>
                <div class="text-xl arabic mb-2">${pattern.mubtada.combinedText} ${pattern.khabar.combinedText}</div>
                <p class="text-purple-800">"${pattern.mubtada.lemma}" — its/her/his "${pattern.khabar.muzafLemma}" (khabar is idafa with zameer)</p>
                <div class="mt-3 text-sm">
                  <p class="font-semibold">Grammar:</p>
                  <ul class="list-disc pl-6 mt-1">
                    <li>المبتدأ = ${pattern.mubtada.combinedText} (مرفوع)</li>
                    <li>الخبر = إضافة: مضاف (${pattern.khabar.muzafLemma}) + مضاف إليه (ضمير: ${pattern.khabar.zameerTextBw})، مرفوع</li>
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
