import { Morphology } from '../models/Morphology.js';
import { RootMeaning } from '../models/RootMeaning.js';

/** Morphology `Root` (compact) → rootMeaning `root.letters` (slashed). */
export function compactToSlashedRoot(compactRoot) {
  const compact = String(compactRoot ?? '').trim();
  if (!compact) return '';
  return [...compact].join('/');
}

function toClientPayload(compactRoot, doc) {
  const root = doc?.root;
  if (!root) return null;

  return {
    root: compactRoot,
    letters: root.letters ?? compactToSlashedRoot(compactRoot),
    transliteration: root.transliteration ?? '',
    meanings: Array.isArray(root.meanings) ? root.meanings : [],
  };
}

export async function fetchRootMeaningByCompactRoot(compactRoot) {
  const compact = String(compactRoot ?? '').trim();
  if (!compact) return null;

  const slashed = compactToSlashedRoot(compact);
  const doc = await RootMeaning.findOne({ 'root.letters': slashed }).lean();
  if (!doc) return null;

  return toClientPayload(compact, doc);
}

export async function fetchRootMeaningForWord({ surahId, ayahNo, wordNo }) {
  if (surahId == null || ayahNo == null || wordNo == null) return null;

  const segments = await Morphology.find({
    SurahId: Number(surahId),
    AyahNo: Number(ayahNo),
    WordNo: Number(wordNo),
  })
    .sort({ SegmentNo: 1 })
    .lean();

  const withRoot = segments.find((s) => String(s.Root ?? '').trim());
  if (!withRoot) return null;

  return fetchRootMeaningByCompactRoot(withRoot.Root);
}
