import { Morphology } from '../models/Morphology.js';
import { RootMeaning } from '../models/RootMeaning.js';

/** Morphology `Root` (compact) → rootMeaning `root.letters` (slashed). */
export function compactToSlashedRoot(compactRoot) {
  const compact = String(compactRoot ?? '').trim();
  if (!compact) return '';
  return [...compact].join('/');
}

function glossesOf(meaning) {
  return String(meaning ?? '')
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * One cloud entry per gloss. A form's Quran count is shared by every gloss
 * in its definitions. Identical glosses (ignoring case) add their counts.
 */
export function buildMeaningCloud(forms) {
  const totals = new Map();
  for (const form of Array.isArray(forms) ? forms : []) {
    const weight = Number(form?.occurrences) || 0;
    if (weight <= 0) continue;
    const definitions = Array.isArray(form?.definitions) ? form.definitions : [];
    for (const definition of definitions) {
      for (const gloss of glossesOf(definition?.meaning)) {
        const key = gloss.toLowerCase();
        const current = totals.get(key);
        if (current) current.count += weight;
        else totals.set(key, { text: gloss, count: weight });
      }
    }
  }
  return [...totals.values()].sort(
    (a, b) => b.count - a.count || a.text.localeCompare(b.text)
  );
}

function toClientPayload(compactRoot, doc) {
  const root = doc?.root;
  if (!root) return null;

  return {
    root: compactRoot,
    letters: root.letters ?? compactToSlashedRoot(compactRoot),
    transliteration: root.transliteration ?? '',
    cloud: buildMeaningCloud(root.forms),
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
