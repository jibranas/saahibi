import { Router } from 'express';

import { isDbConnected } from '../../db.js';
import { fetchTranslationsForWords, wordKey } from '../../lib/translations.js';
import { DEFAULT_SURAH_FILTER, fetchMorphologyOrdered, QURAN_SURAH_MAX, QURAN_SURAH_MIN } from '../../lib/morphologyScope.js';

const router = Router();
function wordIdKey(r) {
  return `${r.SurahId}-${r.AyahNo}-${r.WordNo}`;
}

function getCaseLabel(nominalCase) {
  if (nominalCase === 'NOM') return 'مرفوع - Nominative';
  if (nominalCase === 'ACC') return 'منصوب - Accusative';
  if (nominalCase === 'GEN') return 'مجرور - Genitive';
  return nominalCase || 'N/A';
}

const FATHA = '\u064E';
const DAMMAH = '\u064F';
const KASRA = '\u0650';
const SUKOON = '\u0652';
const YA = '\u064A';
const ALEF_MAQSURA = '\u0649';

const DIACRITICS = new Set([
  FATHA,
  DAMMAH,
  KASRA,
  SUKOON,
  '\u0651',
  '\u064B',
  '\u064C',
  '\u064D',
]);

function getHarakahBefore(segmentText) {
  const t = String(segmentText || '').trim();
  if (!t.length) return null;
  const last = t.slice(-1);
  if (last === FATHA || last === DAMMAH) return 'fatha_dammah';
  if (last === KASRA) return 'kasra';
  if (last === SUKOON) return 'sukoon';
  if (last === YA || last === ALEF_MAQSURA) return 'ya';
  let idx = t.length - 1;
  while (idx >= 0 && DIACRITICS.has(t[idx])) idx--;
  if (idx >= 0 && (t[idx] === YA || t[idx] === ALEF_MAQSURA)) return 'ya';
  for (let i = t.length - 1; i >= 0; i--) {
    const c = t[i];
    if (c === FATHA || c === DAMMAH) return 'fatha_dammah';
    if (c === KASRA) return 'kasra';
    if (c === SUKOON) return 'sukoon';
  }
  return null;
}

function isYaaSaakin(segmentText) {
  const t = String(segmentText || '').trim();
  if (t.length < 2) return false;
  const last = t.slice(-1);
  if (last !== SUKOON) return false;
  const beforeSukoon = t.slice(-2, -1);
  return beforeSukoon === YA || beforeSukoon === ALEF_MAQSURA;
}

const PRONOUN_LABELS = {
  '3-1-1': 'هُ (his / him — 3rd masc. sing.)',
  '3-2-1': 'هَا (her — 3rd fem. sing.)',
  '2-1-1': 'كَ (your — 2nd masc. sing.)',
  '2-2-1': 'كِ (your — 2nd fem. sing.)',
  '3-1-2': 'هُمَا (their — 3rd masc. dual)',
  '3-2-2': 'هُمَا (their — 3rd fem. dual)',
  '3-0-2': 'هُمَا (their — 3rd dual)',
  '2-1-2': 'كُمَا (your — 2nd masc. dual)',
  '2-2-2': 'كُمَا (your — 2nd fem. dual)',
  '2-0-2': 'كُمَا (your — 2nd dual)',
  '3-1-3': 'هُمْ (their — 3rd masc. plural)',
  '3-2-3': 'هُنَّ (their — 3rd fem. plural)',
  '2-1-3': 'كُمْ (your — 2nd masc. plural)',
  '2-2-3': 'كُنَّ (your — 2nd fem. plural)',
  '1-1-1': 'ي (my — 1st sing., masc. context)',
  '1-2-1': 'ي (my — 1st sing., fem. context)',
  '1-0-1': 'ي (my — 1st sing.)',
  '1-1-2': 'نَا (our — 1st dual masc.)',
  '1-2-2': 'نَا (our — 1st dual fem.)',
  '1-1-3': 'نَا (our — 1st plural masc.)',
  '1-2-3': 'نَا (our — 1st plural fem.)',
  '1-0-0': 'نَا (our — 1st dual/plural)',
};

function findIdafaPronounPatterns(records, person, gender, number, harakah) {
  const patterns = [];
  const seenWordIds = new Set();

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (rec.PartOfSpeech !== 'N') continue;
    if (String(rec.SuffixType || '').trim() !== 'PRON') continue;

    if (String(rec.Person ?? '').trim() !== String(person).trim()) continue;

    const recNum = String(rec.Number || '').trim();
    if (String(number).trim() !== '0' && recNum !== String(number).trim())
      continue;
    if (
      String(number).trim() === '0' &&
      recNum !== '2' &&
      recNum !== '3'
    )
      continue;

    const g = String(rec.Gender || '').trim();
    if (
      String(gender).trim() !== '0' &&
      g !== String(gender).trim() &&
      g !== '0'
    )
      continue;

    const wid = wordIdKey(rec);
    if (seenWordIds.has(wid)) continue;

    let wordStart = i;
    while (wordStart > 0 && wordIdKey(records[wordStart - 1]) === wid) {
      wordStart--;
    }

    let hasDet = false;
    let mudafSegment = null;
    const allSegments = [];
    let j = wordStart;

    while (j < records.length && wordIdKey(records[j]) === wid) {
      const seg = records[j];
      allSegments.push(seg);
      if (seg.PrefixType && String(seg.PrefixType).includes('DET'))
        hasDet = true;
      if (
        String(seg.SuffixType || '').trim() !== 'PRON' &&
        seg.PartOfSpeech === 'N' &&
        String(seg.NominalCase || '').trim()
      ) {
        if (!mudafSegment) mudafSegment = seg;
      }
      j++;
    }

    if (hasDet || !mudafSegment) continue;
    const nomState = String(mudafSegment.NominalState || '').trim();
    if (nomState === 'INDEF') continue;

    seenWordIds.add(wid);

    let harakahBefore = null;
    if (allSegments.length >= 2) {
      const segmentBeforePron = allSegments[allSegments.length - 2];
      harakahBefore = getHarakahBefore(segmentBeforePron.Text || '');
    }
    if (harakah != null && String(harakah).trim() !== '') {
      const h = String(harakah).trim();
      if (harakahBefore !== h) continue;
      if (h === 'sukoon' && allSegments.length >= 2) {
        const segmentBeforePron = allSegments[allSegments.length - 2];
        if (isYaaSaakin(segmentBeforePron.Text || '')) continue;
      }
    }

    const combinedText = allSegments.map((s) => s.Text || '').join('');
    const combinedTextBw = allSegments.map((s) => s.TextBw || '').join('');

    patterns.push({
      harakahBefore: harakahBefore ?? undefined,
      muzaf: {
        surahId: allSegments[0].SurahId,
        ayahNo: allSegments[0].AyahNo,
        wordNo: allSegments[0].WordNo,
        combinedText,
        combinedTextBw,
        lemma: mudafSegment.Lemma,
        root: mudafSegment.Root,
        nominalCase: mudafSegment.NominalCase,
        caseLabel: getCaseLabel(mudafSegment.NominalCase),
      },
      pron: {
        text: rec.Text,
        textBw: rec.TextBw,
        person: rec.Person,
        gender: rec.Gender,
        number: rec.Number,
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

    const person = req.query.person;
    const gender = req.query.gender;
    const number = req.query.number;
    const harakah = req.query.harakah;

    if (person == null || gender == null || number == null) {
      res.status(400).json({
        error:
          'Query params required: person, gender, number (e.g. ?person=3&gender=1&number=1)',
      });
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

    const patterns = findIdafaPronounPatterns(
      records,
      person,
      gender,
      number,
      harakah
    );

    const pronKey = `${String(person).trim()}-${String(gender).trim()}-${String(number).trim()}`;
    const pronLabel =
      PRONOUN_LABELS[pronKey] ||
      `ضمير (P=${person}, G=${gender}, N=${number})`;
    const limitedPatterns = patterns.slice(0, limit);

    const examples = [];
    limitedPatterns.forEach((pattern, index) => {
      examples.push({
        surahId: Number(pattern.muzaf.surahId),
        ayahNo: Number(pattern.muzaf.ayahNo),
        words: [{ wordNo: Number(pattern.muzaf.wordNo) }],
        beforeInterlude: [
          {
            type: 'text',
            content: `
            <h3>Idafa with ضمير — Pattern ${index + 1}</h3>
            <div class="bg-sky-50 p-4 rounded-lg my-4">
              <h4 class="font-bold text-sky-900 text-lg mb-3">مضاف + مضاف إليه (ضمير متصل)</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded">
                  <h5 class="font-bold text-green-800 mb-2">المضاف (Mudaf)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.muzaf.combinedText}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.muzaf.combinedTextBw}</div>
                  <p class="text-green-700">"${pattern.muzaf.lemma}"</p>
                  <p class="text-xs text-gray-600 mt-1">Root: ${pattern.muzaf.root || 'N/A'}</p>
                  <p class="text-xs text-gray-600">Case: ${pattern.muzaf.caseLabel}</p>
                  <p class="text-xs text-gray-600">Construct state</p>
                </div>
                <div class="bg-amber-50 p-3 rounded">
                  <h5 class="font-bold text-amber-800 mb-2">المضاف إليه (ضمير)</h5>
                  <div class="text-2xl arabic mb-2">${pattern.pron.text}</div>
                  <div class="text-sm text-gray-600 mb-2">${pattern.pron.textBw}</div>
                  <p class="text-amber-700">${pronLabel}</p>
                  <p class="text-xs text-gray-600 mt-1">Attached pronoun (ضمير متصل)</p>
                </div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 class="font-bold text-purple-900 mb-2">Idafa:</h5>
                <div class="text-xl arabic mb-2">${pattern.muzaf.combinedText}</div>
                <p class="text-purple-800">"${pattern.muzaf.lemma}" + attached pronoun</p>
              </div>
            </div>
          `,
          },
        ],
      });
    });

    const wordRefs = examples.map((ex) => ({
      surahId: ex.surahId,
      ayahNo: ex.ayahNo,
      wordNo: ex.words[0].wordNo,
    }));
    const translationMap = await fetchTranslationsForWords(wordRefs);
    for (const ex of examples) {
      const wn = ex.words[0].wordNo;
      ex.words[0].translations =
        translationMap.get(wordKey(ex.surahId, ex.ayahNo, wn)) || null;
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
        person: String(person),
        gender: String(gender),
        number: String(number),
        harakah: harakah != null ? String(harakah) : undefined,
        pronLabel,
        samplePatterns: patterns.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
