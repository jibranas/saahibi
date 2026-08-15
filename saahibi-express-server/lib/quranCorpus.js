import { allSegments, ensureMorphologyStore } from './morphologyStore.js';

/**
 * An in-memory, word-level view of the whole Quran, built once from the
 * `morphology` collection.
 *
 * The morphology corpus stores *segments* (a word like `بِسْمِ` is two rows:
 * `بِ` + `سْمِ`). Everything here works with whole words instead, and adds a
 * word index so we can answer "where else does this phrase occur?" without
 * touching the database.
 *
 * Rule examples are not always contiguous — some pair a pronoun with a noun
 * further along the ayah — so a phrase is matched as a set of normalized words
 * at fixed offsets from the first one, rather than as a single n-gram.
 */

// Occurrences are packed into a single integer to keep the index small:
// (surahId * 1000 + ayahNo) * 1000 + wordNo. Max is 114:286:~129, so the
// largest value is ~114,286,129 — comfortably inside a 32-bit int.
const PACK_AYAH = 1000;
const PACK_WORD = 1000;

function packRef(surahId, ayahNo, wordNo) {
  return (surahId * PACK_AYAH + ayahNo) * PACK_WORD + wordNo;
}

function unpackRef(packed) {
  const wordNo = packed % PACK_WORD;
  const rest = (packed - wordNo) / PACK_WORD;
  const ayahNo = rest % PACK_AYAH;
  const surahId = (rest - ayahNo) / PACK_AYAH;
  return { surahId, ayahNo, wordNo };
}

export function ayahKey(surahId, ayahNo) {
  return `${surahId}-${ayahNo}`;
}

/**
 * Reduce a word to its bare letters so differently-vowelled forms of the same
 * spelling match: strips every combining mark (harakat, tanween, shadda,
 * sukun, superscript alif, Quranic annotation signs) and tatweel, then folds
 * the alif variants and alif maqsura.
 *
 * `ٱلْعَلِيمُ` and `ٱلْعَلِيمِ` both become `العليم`.
 */
export function normalizeArabic(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .trim();
}

/**
 * Keep tanween and short vowels (the i'rab signal) while stripping only noise
 * that is not case: Quranic annotation marks, tatweel, and folding `ٱ→ا`.
 *
 * `شَكُورٌ` and `شَكُورٍ` stay distinct.
 */
export function exactKey(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/\u0671/g, '\u0627') // wasla alif → alif
    .trim();
}

let corpus = null;
let building = null;

/** Words are ordered by `wordNo`, which is 1-based and normally contiguous. */
function wordAt(words, wordNo) {
  const guess = words[wordNo - 1];
  if (guess?.wordNo === wordNo) return guess;
  return words.find((w) => w.wordNo === wordNo) ?? null;
}

/**
 * Fold the in-memory segment store into whole words, ayah by ayah. Segments
 * arrive in mushaf order, so consecutive segments sharing a `WordNo` belong to
 * the same word.
 */
async function loadWordsByAyah() {
  await ensureMorphologyStore();

  const wordsByAyah = new Map();

  for (const segment of allSegments()) {
    const surahId = Number(segment.SurahId);
    const ayahNo = Number(segment.AyahNo);
    const wordNo = Number(segment.WordNo);
    if (!Number.isFinite(ayahNo) || !Number.isFinite(wordNo)) continue;

    const key = ayahKey(surahId, ayahNo);
    let words = wordsByAyah.get(key);
    if (!words) {
      words = [];
      wordsByAyah.set(key, words);
    }

    const last = words[words.length - 1];
    const nominalCase = String(segment.NominalCase ?? '').trim() || null;
    if (last && last.wordNo === wordNo) {
      last.text += segment.Text ?? '';
      // Prefer the first stem case tag on the word (SegmentNo order).
      if (nominalCase && !last.nominalCase) last.nominalCase = nominalCase;
    } else {
      words.push({
        wordNo,
        text: segment.Text ?? '',
        nominalCase,
      });
    }
  }

  for (const words of wordsByAyah.values()) {
    for (const word of words) {
      word.norm = normalizeArabic(word.text);
      word.exact = exactKey(word.text);
    }
  }

  return wordsByAyah;
}

/** Index words by a string key field (`norm` or `exact`), in mushaf order. */
function buildKeyedWordIndex(wordsByAyah, field) {
  const index = new Map();

  for (const [key, words] of wordsByAyah) {
    const dash = key.indexOf('-');
    const surahId = Number(key.slice(0, dash));
    const ayahNo = Number(key.slice(dash + 1));

    for (const word of words) {
      const form = word[field];
      if (!form) continue;
      let refs = index.get(form);
      if (!refs) {
        refs = [];
        index.set(form, refs);
      }
      refs.push(packRef(surahId, ayahNo, word.wordNo));
    }
  }

  return index;
}

async function buildCorpus() {
  const startedAt = Date.now();
  const wordsByAyah = await loadWordsByAyah();
  const wordIndex = buildKeyedWordIndex(wordsByAyah, 'norm');
  const exactWordIndex = buildKeyedWordIndex(wordsByAyah, 'exact');

  let wordCount = 0;
  for (const words of wordsByAyah.values()) wordCount += words.length;

  console.log(
    `[corpus] indexed ${wordCount} words across ${wordsByAyah.size} ayahs ` +
      `(${wordIndex.size} letter forms, ${exactWordIndex.size} vowelled forms) ` +
      `in ${Date.now() - startedAt}ms`
  );

  return { wordsByAyah, wordIndex, exactWordIndex, wordCount };
}

/**
 * Build the corpus on first use and reuse it thereafter. Concurrent callers
 * during the initial build share the same promise.
 */
export function ensureCorpus() {
  if (corpus) return Promise.resolve(corpus);
  if (!building) {
    building = buildCorpus()
      .then((built) => {
        corpus = built;
        building = null;
        return corpus;
      })
      .catch((err) => {
        building = null;
        throw err;
      });
  }
  return building;
}

export function isCorpusReady() {
  return corpus != null;
}

/** Ordered `[{ wordNo, text, norm }]` for one ayah, or `[]` if unknown. */
export function getAyahWords(surahId, ayahNo) {
  if (!corpus) return [];
  return corpus.wordsByAyah.get(ayahKey(surahId, ayahNo)) ?? [];
}

/** The vowelled text of a single word, or `null` if we don't have it. */
export function getWordText(surahId, ayahNo, wordNo) {
  const words = getAyahWords(surahId, ayahNo);
  return wordAt(words, Number(wordNo))?.text ?? null;
}

/**
 * Describe the phrase a set of word refs points at.
 *
 * Returns both keys the feature needs:
 *  - `exact`      the vowelled phrase, used to decide whether two example
 *                 cards are duplicates (so case variants stay separate cards)
 *  - `normalized` the letters-only phrase, used to find occurrences elsewhere
 *  - `exactWords` per-word exactKeys for vowelled occurrence matching
 *
 * plus `offsets`, the word-number deltas from the first ref, which lets a
 * non-contiguous example (a pronoun and a later noun) still be matched.
 */
export function describePhrase(refs) {
  if (!Array.isArray(refs) || refs.length === 0) return null;

  const ordered = [...refs]
    .filter(
      (r) => r && r.surahId != null && r.ayahNo != null && r.wordNo != null
    )
    .map((r) => ({
      surahId: Number(r.surahId),
      ayahNo: Number(r.ayahNo),
      wordNo: Number(r.wordNo),
    }))
    .filter((r) => Number.isInteger(r.wordNo) && r.wordNo > 0)
    .sort((a, b) => a.wordNo - b.wordNo);
  if (ordered.length === 0) return null;

  const { surahId, ayahNo } = ordered[0];
  if (ordered.some((r) => r.surahId !== surahId || r.ayahNo !== ayahNo)) {
    return null;
  }

  const texts = [];
  const normalized = [];
  const exactWords = [];
  for (const ref of ordered) {
    const text = getWordText(ref.surahId, ref.ayahNo, ref.wordNo);
    const norm = normalizeArabic(text);
    const exact = exactKey(text);
    if (!text || !norm || !exact) return null;
    texts.push(text);
    normalized.push(norm);
    exactWords.push(exact);
  }

  const base = ordered[0].wordNo;
  return {
    exact: texts.join(' '),
    normalized: normalized.join(' '),
    words: normalized,
    exactWords,
    offsets: ordered.map((r) => r.wordNo - base),
    wordCount: ordered.length,
    refs: ordered,
    ref: ordered.map((r) => `${r.surahId}:${r.ayahNo}:${r.wordNo}`).join(','),
  };
}

/**
 * All positions where the phrase appears at the given `offsets`.
 *
 * `mode: 'normalized'` (default) matches letters only.
 * `mode: 'exact'` keeps tanween / short vowels so case endings stay distinct.
 * `nominalCase` (optional, e.g. NOM/ACC/GEN) keeps only words tagged with that
 * morphology case — needed when ACC and GEN share the same vowelling (Musa,
 * Adam as ghair munsarif).
 */
function matchingRefs(phrase, { mode = 'normalized', nominalCase = null } = {}) {
  if (!corpus) return [];

  const useExact = mode === 'exact';
  const keyWords = useExact ? phrase?.exactWords : phrase?.words;
  if (!keyWords?.length) return [];

  const index = useExact ? corpus.exactWordIndex : corpus.wordIndex;
  const field = useExact ? 'exact' : 'norm';
  const caseFilter =
    nominalCase != null && String(nominalCase).trim() !== ''
      ? String(nominalCase).trim().toUpperCase()
      : null;
  const candidates = index.get(keyWords[0]);
  if (!candidates) return [];

  const matches = [];
  for (const packed of candidates) {
    const { surahId, ayahNo, wordNo } = unpackRef(packed);
    const words = corpus.wordsByAyah.get(ayahKey(surahId, ayahNo));
    if (!words) continue;

    const first = wordAt(words, wordNo);
    if (!first || first[field] !== keyWords[0]) continue;
    if (caseFilter && String(first.nominalCase ?? '').toUpperCase() !== caseFilter) {
      continue;
    }

    let ok = true;
    for (let i = 1; i < keyWords.length; i += 1) {
      const other = wordAt(words, wordNo + phrase.offsets[i]);
      if (!other || other[field] !== keyWords[i]) {
        ok = false;
        break;
      }
    }
    if (ok) matches.push(packed);
  }

  return matches;
}

/** How many times the phrase occurs in the Quran. */
export function countOccurrences(
  phrase,
  { mode = 'normalized', nominalCase = null } = {}
) {
  return matchingRefs(phrase, { mode, nominalCase }).length;
}

/**
 * Occurrences in mushaf order as `[{ surahId, ayahNo, wordNo }]`, where
 * `wordNo` is the phrase's first word.
 */
export function findOccurrences(
  phrase,
  { offset = 0, limit, mode = 'normalized', nominalCase = null } = {}
) {
  const matches = matchingRefs(phrase, { mode, nominalCase });
  const end = limit == null ? matches.length : offset + limit;
  return {
    total: matches.length,
    refs: matches.slice(offset, end).map(unpackRef),
  };
}
