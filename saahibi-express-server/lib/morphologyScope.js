import {
  allSegments,
  ensureMorphologyStore,
  QURAN_SURAH_MAX,
  QURAN_SURAH_MIN,
  surahSegments,
} from './morphologyStore.js';

export { QURAN_SURAH_MAX, QURAN_SURAH_MIN };

export const DEFAULT_SURAH_FILTER = {
  $gte: QURAN_SURAH_MIN,
  $lte: QURAN_SURAH_MAX,
};

function isFullRange(from, to) {
  return from <= QURAN_SURAH_MIN && to >= QURAN_SURAH_MAX;
}

/**
 * Morphology in canonical order for the requested surah scope.
 *
 * Served from the in-memory store (see `morphologyStore.js`) rather than the
 * database: the routes call this on every request and each call used to pull
 * the entire corpus over the wire.
 *
 * - If `filter.SurahId` is a finite number, that surah alone.
 * - If it is a `{ $gte, $lte }` range, those surahs concatenated in order.
 * - If `SurahId` is missing, defaults to the full Quran range.
 *
 * A fresh array is returned so callers can sort or splice it, but the segment
 * objects inside are shared and must be treated as read-only.
 */
export async function fetchMorphologyOrdered(filter = {}) {
  await ensureMorphologyStore();

  const { SurahId } = filter;

  if (typeof SurahId === 'number' && Number.isFinite(SurahId)) {
    return surahSegments(SurahId).slice();
  }

  let from = QURAN_SURAH_MIN;
  let to = QURAN_SURAH_MAX;
  if (
    SurahId &&
    typeof SurahId === 'object' &&
    SurahId.$gte != null &&
    SurahId.$lte != null
  ) {
    from = Math.max(QURAN_SURAH_MIN, Math.floor(Number(SurahId.$gte)));
    to = Math.min(QURAN_SURAH_MAX, Math.floor(Number(SurahId.$lte)));
  }

  if (isFullRange(from, to)) return allSegments().slice();

  const out = [];
  for (let s = from; s <= to; s += 1) out.push(...surahSegments(s));
  return out;
}
