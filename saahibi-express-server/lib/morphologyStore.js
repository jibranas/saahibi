import { Morphology } from '../models/Morphology.js';

/**
 * The whole morphology corpus, held in memory in canonical mushaf order.
 *
 * The corpus is static — the Quran does not change between requests — but
 * every one of the ~85 rule routes needs to scan all of it to find its
 * examples. Reading it from Mongo per request meant 130k documents crossing
 * the wire each time; here it is read once and every route scans the same
 * arrays.
 */

/** Full Quran surah ids (same idea as `parseInt(SurahId) > 0` in the legacy TSV routes). */
export const QURAN_SURAH_MIN = 1;
export const QURAN_SURAH_MAX = 114;

/**
 * Only the fields the rule routes actually read. The stored documents average
 * 487 bytes, most of it in columns (`RootBw`, `LemmaBwNew`, `Special*`,
 * `Verb*`, `WordPart`) that nothing looks at.
 */
const SEGMENT_PROJECTION = {
  _id: 0,
  SurahId: 1,
  AyahId: 1,
  AyahNo: 1,
  WordId: 1,
  WordNo: 1,
  SegmentNo: 1,
  PartOfSpeech: 1,
  Person: 1,
  Gender: 1,
  Number: 1,
  Text: 1,
  TextBw: 1,
  Root: 1,
  Lemma: 1,
  LemmaBw: 1,
  PrefixType: 1,
  SuffixType: 1,
  NominalDerivation: 1,
  NominalCase: 1,
  NominalState: 1,
};

const MUSHAF_ORDER = { SurahId: 1, AyahNo: 1, WordNo: 1, SegmentNo: 1 };

let store = null;
let loading = null;

async function loadStore() {
  const startedAt = Date.now();

  // The compound index backing MUSHAF_ORDER is declared on the schema but is
  // built lazily; without waiting, this scan can still sort in memory.
  await Morphology.init();

  const segments = await Morphology.find({}, SEGMENT_PROJECTION)
    .sort(MUSHAF_ORDER)
    .lean();

  const bySurah = new Map();
  for (const segment of segments) {
    const surahId = Number(segment.SurahId);
    if (
      !Number.isFinite(surahId) ||
      surahId < QURAN_SURAH_MIN ||
      surahId > QURAN_SURAH_MAX
    ) {
      continue;
    }
    let bucket = bySurah.get(surahId);
    if (!bucket) {
      bucket = [];
      bySurah.set(surahId, bucket);
    }
    bucket.push(segment);
  }

  // Pre-flattened full-Quran view, which is what almost every route asks for.
  const all = [];
  for (let s = QURAN_SURAH_MIN; s <= QURAN_SURAH_MAX; s += 1) {
    const bucket = bySurah.get(s);
    if (bucket) all.push(...bucket);
  }

  console.log(
    `[morphology] loaded ${all.length} segments across ${bySurah.size} surahs ` +
      `in ${Date.now() - startedAt}ms ` +
      `(heap ${Math.round(process.memoryUsage().heapUsed / 1e6)}MB)`
  );

  return { bySurah, all };
}

/** Load the corpus on first use and reuse it thereafter. */
export function ensureMorphologyStore() {
  if (store) return Promise.resolve(store);
  if (!loading) {
    loading = loadStore()
      .then((loaded) => {
        store = loaded;
        loading = null;
        return store;
      })
      .catch((err) => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

export function isMorphologyStoreReady() {
  return store != null;
}

/**
 * Segments for one surah, in mushaf order. The returned array is the stored
 * one — callers must not mutate it or its elements.
 */
export function surahSegments(surahId) {
  return store?.bySurah.get(Number(surahId)) ?? [];
}

/** Every segment in mushaf order, shared and not to be mutated. */
export function allSegments() {
  return store?.all ?? [];
}
