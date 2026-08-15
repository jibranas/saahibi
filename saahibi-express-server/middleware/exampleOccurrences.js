import {
  countOccurrences,
  describePhrase,
  ensureCorpus,
  isCorpusReady,
} from '../lib/quranCorpus.js';

/**
 * Post-processes every `/api/queries/*` response so the ~80 rule routes get
 * phrase de-duplication and Quran occurrence counts without each one being
 * edited.
 *
 * Two different keys are at play, deliberately:
 *  - cards are de-duplicated on the *vowelled* phrase by default
 *  - occurrences default to the *letters-only* phrase, so most cards show
 *    every place the same spelling appears, whatever its case
 *
 * Case-ending lessons opt into vowelled matching with
 * `occurrenceMatch: 'exact'` (phraseRef becomes `exact:…`). Those lessons
 * also de-duplicate by *location* so ACC/GEN that share the same vowelling
 * (ghair munsarif, mabni) still get separate cards.
 */

const EXACT_REF_PREFIX = 'exact:';
const CASE_REF_SUFFIX_RE = /^(NOM|ACC|GEN)$/;

/** Word refs for an `examples[]` entry: `{ surahId, ayahNo, words: [...] }`. */
function refsFromExample(example) {
  if (!example || typeof example !== 'object') return null;
  const { surahId, ayahNo } = example;
  if (surahId == null || ayahNo == null) return null;

  const words = Array.isArray(example.words) ? example.words : [];
  const refs = words
    .map((w) => w?.wordNo)
    .filter((wordNo) => wordNo != null)
    .map((wordNo) => ({ surahId, ayahNo, wordNo }));

  return refs.length > 0 ? refs : null;
}

/**
 * Word refs for a `patterns[]` entry. Pattern sides are named per rule
 * (`mawsuf`/`sifah`, `muzaf`/`muzafIlayhi`, `mudaf`/`mudafIlayhi1`/…), so we
 * take any nested object carrying a full word reference.
 */
function refsFromPattern(pattern) {
  if (!pattern || typeof pattern !== 'object') return null;

  const refs = [];
  for (const side of Object.values(pattern)) {
    if (!side || typeof side !== 'object' || Array.isArray(side)) continue;
    const { surahId, ayahNo, wordNo } = side;
    if (surahId == null || ayahNo == null || wordNo == null) continue;
    refs.push({ surahId, ayahNo, wordNo });
  }

  return refs.length > 0 ? refs : null;
}

function shouldProcess(res, body) {
  if (res.statusCode < 200 || res.statusCode >= 300) return false;
  if (!body || typeof body !== 'object') return false;
  return Array.isArray(body.examples) || Array.isArray(body.patterns);
}

function decorate(body) {
  const examples = Array.isArray(body.examples) ? body.examples : null;
  const patterns = Array.isArray(body.patterns) ? body.patterns : null;

  // The 12 routes returning both keep the two arrays index-aligned, so they
  // must be filtered together.
  const length = Math.max(examples?.length ?? 0, patterns?.length ?? 0);
  if (length === 0) return body;

  const keptExamples = [];
  const keptPatterns = [];
  const seen = new Set();
  // Two cards in one response usually share a phrase; counting is cheap but
  // not free, so memoize within the response.
  const counts = new Map();

  for (let i = 0; i < length; i += 1) {
    const example = examples?.[i];
    const pattern = patterns?.[i];

    // Particle lessons pre-compute segment tallies and a `particle:` phraseRef.
    // Keep those; host-word phrase matching cannot see attached prefixes.
    const particleKey = example?.particleKey;
    if (particleKey) {
      const seenKey = `particle:${particleKey}`;
      if (seen.has(seenKey)) continue;
      seen.add(seenKey);
      if (!example.phraseRef) {
        example.phraseRef = seenKey;
      }
      keptExamples.push(example);
      if (pattern) keptPatterns.push(pattern);
      continue;
    }

    const refs = refsFromExample(example) ?? refsFromPattern(pattern);
    const phrase = refs ? describePhrase(refs) : null;

    if (phrase) {
      const matchExact =
        example?.occurrenceMatch === 'exact' ||
        pattern?.occurrenceMatch === 'exact';
      // Exact (case-ending) lessons dedupe by location so ACC/GEN that share
      // the same vowelling (ghair munsarif, mabni) still get separate cards.
      // Other lessons keep one card per distinct vowelled surface form.
      const seenKey = matchExact ? phrase.ref : phrase.exact;
      if (seen.has(seenKey)) continue;
      seen.add(seenKey);

      const mode = matchExact ? 'exact' : 'normalized';
      const nominalCaseRaw = example?.case ?? pattern?.case ?? null;
      const nominalCase =
        nominalCaseRaw != null &&
        CASE_REF_SUFFIX_RE.test(String(nominalCaseRaw).trim().toUpperCase())
          ? String(nominalCaseRaw).trim().toUpperCase()
          : null;
      const memoKey = matchExact
        ? `exact:${phrase.exact}${nominalCase ? `@${nominalCase}` : ''}`
        : phrase.normalized;

      const presetCount =
        example?.occurrenceCount != null
          ? example.occurrenceCount
          : pattern?.occurrenceCount != null
            ? pattern.occurrenceCount
            : null;

      let occurrenceCount = presetCount;
      if (occurrenceCount == null) {
        occurrenceCount = counts.get(memoKey);
        if (occurrenceCount === undefined) {
          occurrenceCount = countOccurrences(phrase, { mode, nominalCase });
          counts.set(memoKey, occurrenceCount);
        }
      }

      const phraseRef = matchExact
        ? `${EXACT_REF_PREFIX}${phrase.ref}${nominalCase ? `@${nominalCase}` : ''}`
        : phrase.ref;

      // Attach to both arrays: `RuleExamplesScreen` reads examples, while
      // `MawsufSifahScreen` reads patterns.
      if (example) {
        Object.assign(example, {
          occurrenceCount,
          phraseRef: example.phraseRef ?? phraseRef,
        });
      }
      if (pattern) {
        Object.assign(pattern, {
          occurrenceCount,
          phraseRef: pattern.phraseRef ?? phraseRef,
        });
      }
    }

    if (example) keptExamples.push(example);
    if (pattern) keptPatterns.push(pattern);
  }

  const next = { ...body };
  if (examples) next.examples = keptExamples;
  if (patterns) next.patterns = keptPatterns;
  next.count = examples ? keptExamples.length : keptPatterns.length;
  next.dedupedFrom = length;
  return next;
}

/**
 * Wraps `res.json` so the decoration runs on whatever the route sends. If the
 * corpus isn't loaded yet the original payload is passed through untouched —
 * the lesson still works, just without occurrence counts.
 */
export function exampleOccurrences(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (!shouldProcess(res, body)) return originalJson(body);

    if (isCorpusReady()) {
      try {
        return originalJson(decorate(body));
      } catch (err) {
        console.warn(`[occurrences] decoration failed: ${err?.message ?? err}`);
        return originalJson(body);
      }
    }

    ensureCorpus()
      .then(() => originalJson(decorate(body)))
      .catch((err) => {
        console.warn(`[occurrences] corpus unavailable: ${err?.message ?? err}`);
        originalJson(body);
      });
    return res;
  };

  next();
}

export default exampleOccurrences;
