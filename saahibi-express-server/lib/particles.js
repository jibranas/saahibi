import {
  allSegments,
  ensureMorphologyStore,
} from './morphologyStore.js';

/** Arabic letters only (no marks / short vowels). */
function arabicLetters(text) {
  return String(text).replace(/[^\u0621-\u064A\u066E\u066F\u0671-\u06D3]/g, '');
}

/**
 * Orthographic collapse for particle cards:
 *  - strip sukun, shadda, tanween, dagger alif, tatweel, Quranic marks
 *  - keep short vowels so مِن (from) and مَن (who) stay distinct
 *  - strip trailing short vowels on multi-letter particles so sandhi/case
 *    variants (مِن / مِنْ / مِنَ / مِنِ) collapse to one card
 *  - keep the vowel on single-letter particles (بِ, لِ, تَ, …)
 */
export function particleDedupeKey(text) {
  if (!text) return '';
  let key = String(text)
    // Everything in the Arabic combining-mark ranges except short vowels
    // (fatha/damma/kasra). Shadda and sukun are stripped here too.
    .replace(/[\u0610-\u061A\u064B-\u064D\u0651-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '') // tatweel
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .trim();

  if (arabicLetters(key).length > 1) {
    key = key.replace(/[\u064E\u064F\u0650]+$/g, '');
  }

  return key;
}

/** Known muqattaʿāt without maddah (`^`) in TextBw. */
const MUQATTAAT_TEXT_BW = new Set(['Th']); // طه

/**
 * Quranic initials are tagged POS=P in this corpus. Most carry `^` in TextBw;
 * طه is the main opener without that marker.
 */
export function isMuqattaat(record) {
  if (!record || record.PartOfSpeech !== 'P') return false;
  const bw = String(record.TextBw || '');
  if (bw.includes('^')) return true;
  if (MUQATTAAT_TEXT_BW.has(bw)) return true;
  return false;
}

function isDetPrefix(record) {
  return String(record.PrefixType || '') === 'DET';
}

/** True when this particle segment is attached to a larger word. */
export function isAttachedParticle(record) {
  const prefix = String(record.PrefixType || '').trim();
  return prefix.length > 0;
}

function wordSegmentsKey(record) {
  return `${record.SurahId}:${record.AyahNo}:${record.WordNo}`;
}

function hasPronounSuffix(record) {
  return String(record.SuffixType || '').includes('PRON');
}

/**
 * Lesson hit: the particle is the whole word, or a prefix still in the
 * leading prefix chain (every segment before it is also a prefix).
 * Drops pronoun suffixes (عَنْهَا) and segments inside other words
 * (the لِ and كَ of ذَٰلِكَ).
 */
function isBareParticleUse(record, wordSegments) {
  if (hasPronounSuffix(record)) return false;
  if (!isAttachedParticle(record)) {
    return wordSegments.length === 1;
  }
  const segNo = Number(record.SegmentNo);
  return wordSegments
    .filter((segment) => Number(segment.SegmentNo) < segNo)
    .every((segment) => isAttachedParticle(segment));
}

/**
 * Particles taught in the ḥarf lesson, in table order.
 * Keys are particleDedupeKey forms; values are the lesson English glosses.
 */
export const PARTICLE_GLOSS_EN = new Map([
  ['بِ', 'In'],
  ['عَن', '(away) From/ about'],
  ['فِي', 'In/ during'],
  ['كَ', 'As/ like'],
  ['لِ', 'For (belongs to)'],
  ['مِن', 'From'],
  ['اِلَي', '(to)wards'],
  ['حَتَي', 'Until'],
  ['عَلَي', 'On/ upon/ over'],
  ['مَع', 'With'],
  ['وَ', 'And/ by (swear by)'],
]);

export function glossForParticle(key) {
  if (!PARTICLE_GLOSS_EN.has(key)) return null;
  return { en: PARTICLE_GLOSS_EN.get(key) };
}

/**
 * @typedef {{ surahId: number, ayahNo: number, wordNo: number }} ParticleRef
 * @typedef {{
 *   key: string,
 *   text: string,
 *   lemma: string|null,
 *   attached: boolean,
 *   count: number,
 *   refs: ParticleRef[],
 *   first: ParticleRef,
 * }} ParticleEntry
 */

/** @type {Map<string, ParticleEntry>|null} */
let particleIndex = null;

function buildParticleIndex(records) {
  /** @type {Map<string, object[]>} */
  const segmentsByWord = new Map();
  for (const record of records) {
    const key = wordSegmentsKey(record);
    let segments = segmentsByWord.get(key);
    if (!segments) {
      segments = [];
      segmentsByWord.set(key, segments);
    }
    segments.push(record);
  }

  /** @type {Map<string, ParticleEntry>} */
  const index = new Map();

  for (const record of records) {
    const text = String(record.Text || '').trim();
    const key = particleDedupeKey(text);
    // مَعَ is tagged N (a zarf) in this corpus, but the lesson teaches it
    // with the particles. Other nouns stay out.
    const taughtAsParticle = record.PartOfSpeech === 'P' || key === 'مَع';
    if (!taughtAsParticle) continue;
    if (isDetPrefix(record)) continue;
    if (isMuqattaat(record)) continue;
    if (!key) continue;

    const wordSegments = segmentsByWord.get(wordSegmentsKey(record));
    if (!wordSegments || !isBareParticleUse(record, wordSegments)) continue;

    const surahId = Number(record.SurahId);
    const ayahNo = Number(record.AyahNo);
    const wordNo = Number(record.WordNo);
    if (!Number.isFinite(surahId) || !Number.isFinite(ayahNo) || !Number.isFinite(wordNo)) {
      continue;
    }

    const ref = { surahId, ayahNo, wordNo };
    let entry = index.get(key);
    if (!entry) {
      entry = {
        key,
        text,
        lemma: record.Lemma ? String(record.Lemma) : null,
        attached: isAttachedParticle(record),
        count: 0,
        refs: [],
        first: ref,
      };
      index.set(key, entry);
    }
    entry.count += 1;
    entry.refs.push(ref);
  }

  return index;
}

/** Build (once) the bare-particle index over the full morphology store. */
export async function ensureParticleIndex() {
  if (particleIndex) return particleIndex;
  await ensureMorphologyStore();
  particleIndex = buildParticleIndex(allSegments());
  return particleIndex;
}

/** Test helper / rare reload path. */
export function resetParticleIndex() {
  particleIndex = null;
}

/**
 * Paginated host-word refs for a particle key, in mushaf order.
 * Multiple hits in one ayah yield multiple refs (one per host word).
 */
export function findParticleOccurrences(key, { offset = 0, limit } = {}) {
  if (!particleIndex) {
    return { total: 0, refs: [], entry: null };
  }
  const entry = particleIndex.get(key) ?? null;
  if (!entry) return { total: 0, refs: [], entry: null };

  const end = limit == null ? entry.refs.length : offset + limit;
  return {
    total: entry.count,
    refs: entry.refs.slice(offset, end),
    entry,
  };
}
