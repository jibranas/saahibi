import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function getCaseLabel(c) {
  if (!c) return 'N/A';
  const s = String(c);
  if (s.includes('NOM')) return 'Nominative (مرفوع)';
  if (s.includes('ACC')) return 'Accusative (منصوب)';
  if (s.includes('GEN')) return 'Genitive (مجرور)';
  return s;
}

function getCaseArabic(c) {
  if (!c) return '';
  const s = String(c);
  if (s.includes('NOM')) return 'كُلُّ';
  if (s.includes('ACC')) return 'كُلَّ';
  if (s.includes('GEN')) return 'كُلِّ';
  return 'كُلّ';
}

function findKulluIndefPatterns(records) {
  const wordMap = new Map();

  for (const record of records) {
    if (!record.SurahId || !record.AyahNo || !record.WordNo) continue;
    const key = `${record.SurahId}-${record.AyahNo}-${record.WordNo}`;

    if (!wordMap.has(key)) {
      wordMap.set(key, {
        surahId: record.SurahId,
        ayahNo: record.AyahNo,
        wordNo: record.WordNo,
        hasDET: false,
        nounSegment: null,
        allSegments: [],
        combinedText: '',
        combinedTextBw: '',
      });
    }

    const word = wordMap.get(key);
    word.allSegments.push(record);

    if (record.Text && String(record.Text).trim()) {
      word.combinedText += record.Text;
      word.combinedTextBw += record.TextBw || '';
    }

    if (record.PrefixType && String(record.PrefixType).includes('DET')) {
      word.hasDET = true;
    }

    if (
      record.PartOfSpeech === 'N' &&
      record.NominalCase &&
      String(record.NominalCase).trim()
    ) {
      word.nounSegment = record;
    }
  }

  const ayahWords = new Map();
  for (const word of wordMap.values()) {
    const ayahKey = `${word.surahId}-${word.ayahNo}`;
    if (!ayahWords.has(ayahKey)) ayahWords.set(ayahKey, []);
    ayahWords.get(ayahKey).push(word);
  }

  for (const words of ayahWords.values()) {
    words.sort((a, b) => parseInt(a.wordNo, 10) - parseInt(b.wordNo, 10));
  }

  const patterns = [];

  for (const [, words] of ayahWords.entries()) {
    for (let i = 0; i < words.length - 1; i++) {
      const w1 = words[i];
      const w2 = words[i + 1];

      if (!w1.nounSegment || !w2.nounSegment) continue;

      const n1 = w1.nounSegment;
      const n2 = w2.nounSegment;

      const lemma1 = String(n1.LemmaBw || '').trim();
      if (lemma1 !== 'kul~') continue;

      const case1 = String(n1.NominalCase || '').trim();
      if (!case1) continue;

      const case2 = String(n2.NominalCase || '').trim();
      if (case2 !== 'GEN') continue;

      if (w1.allSegments.length > 2 || w2.allSegments.length > 2) continue;

      const isIndef2 = String(n2.NominalState || '').includes('INDEF');
      if (!isIndef2) continue;

      patterns.push({
        kullu: {
          surahId: w1.surahId,
          ayahNo: w1.ayahNo,
          wordNo: w1.wordNo,
          text: w1.combinedText,
          textBw: w1.combinedTextBw,
          nominalCase: case1,
        },
        mudafIlayhi: {
          surahId: w2.surahId,
          ayahNo: w2.ayahNo,
          wordNo: w2.wordNo,
          text: w2.combinedText,
          textBw: w2.combinedTextBw,
          lemma: n2.Lemma,
          root: n2.Root,
          nominalCase: case2,
          nominalDerivation: n2.NominalDerivation || '',
        },
      });
    }
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

    const patterns = findKulluIndefPatterns(records);
    const limitedPatterns = patterns.slice(0, limit);

    const examples = [];
    limitedPatterns.forEach((pattern, index) => {
      examples.push({
        surahId: Number(pattern.kullu.surahId),
        ayahNo: Number(pattern.kullu.ayahNo),
        words: [
          { wordNo: Number(pattern.kullu.wordNo) },
          { wordNo: Number(pattern.mudafIlayhi.wordNo) },
        ],
        beforeInterlude: [
          {
            type: 'text',
            content: `
            <h3>كُلّ + Indefinite Noun — Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">كُلّ + نكرة = "Every / Each"</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-blue-50 p-3 rounded">
                  <h5 class="font-bold text-blue-800 mb-2">مضاف — كُلّ</h5>
                  <div class="text-2xl arabic mb-2">${pattern.kullu.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.kullu.textBw}</div>
                  <p class="text-blue-700">Meaning: "every / each"</p>
                  <p class="text-xs text-gray-600 mt-1">Case: ${getCaseLabel(pattern.kullu.nominalCase)}</p>
                  <p class="text-xs text-gray-600">Form: <strong>${getCaseArabic(pattern.kullu.nominalCase)}</strong></p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">مضاف إليه (نكرة)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.mudafIlayhi.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.mudafIlayhi.textBw}</div>
                  <p class="text-amber-700">Lemma: ${pattern.mudafIlayhi.lemma || 'N/A'}</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.mudafIlayhi.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: Genitive (مجرور)</p>
                  <p class="text-xs text-gray-600">State: <strong>Indefinite (نكرة)</strong></p>
                  ${pattern.mudafIlayhi.nominalDerivation ? `<p class="text-xs text-gray-600">Derivation: ${pattern.mudafIlayhi.nominalDerivation}</p>` : ''}
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Meaning:</h5>
                <div class="text-xl arabic mb-2">${pattern.kullu.text} ${pattern.mudafIlayhi.text}</div>
                <p class="text-sm text-purple-800 mb-2">"every ${pattern.mudafIlayhi.lemma || '...'}"</p>
                <p class="text-xs text-gray-600 mt-2">كُلّ + indefinite singular = <strong>"every / each"</strong> — refers to each individual member</p>
              </div>
            </div>
          `,
          },
        ],
      });
    });

    const wordRefs = [];
    for (const ex of examples) {
      const sid = ex.surahId;
      const an = ex.ayahNo;
      for (const w of ex.words) {
        wordRefs.push({ surahId: sid, ayahNo: an, wordNo: w.wordNo });
      }
    }
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of examples) {
      for (const w of ex.words) {
        w.translations =
          translationMap.get(wordKey(ex.surahId, ex.ayahNo, w.wordNo)) || null;
      }
    }

    res.json({
      count: examples.length,
      totalPatterns: patterns.length,
      scannedSegments: records.length,
      limit,
      filter,
      examples,
      debug: {
        totalPatterns: patterns.length,
        limitedTo: limit,
        samplePatterns: patterns.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
