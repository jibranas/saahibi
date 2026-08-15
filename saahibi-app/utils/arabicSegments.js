import { forArabicDisplay } from './arabicDisplay';

/**
 * Split a diacritized Arabic word into colored segments so root letters can
 * be highlighted, as in: ال (prefix) + ك ت ب (root letters) + harakat.
 */

// Harakat, tanween, shadda, sukoon, superscript alif, quranic annotation marks…
const DIACRITIC_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;

const SHADDA = '\u0651';

// Root letters that frequently disappear or change shape in written forms.
const WEAK_LETTERS = new Set(['ا', 'أ', 'إ', 'و', 'ي', 'ى', 'ء']);

// Letters that may substitute for a root letter in written form.
const EQUIVALENTS = {
  ا: ['ا', 'أ', 'إ', 'آ', 'ٱ', 'ى', 'ء', 'ؤ', 'ئ'],
  أ: ['أ', 'ا', 'آ', 'إ', 'ء', 'ؤ', 'ئ'],
  إ: ['إ', 'ا', 'ء'],
  ء: ['ء', 'أ', 'إ', 'ؤ', 'ئ', 'آ'],
  و: ['و', 'ؤ', 'ا'],
  ي: ['ي', 'ئ', 'ى', 'ا'],
  ى: ['ى', 'ي', 'ا'],
  ت: ['ت', 'ة'],
  ة: ['ة', 'ت'],
};

function matchesRootLetter(char, rootLetter) {
  if (char === rootLetter) return true;
  const candidates = EQUIVALENTS[rootLetter];
  return candidates ? candidates.includes(char) : false;
}

function normalizeRoot(root) {
  return String(root ?? '')
    .replace(/[\s\-·,]/g, '')
    .split('')
    .filter((c) => !DIACRITIC_RE.test(c));
}

/**
 * Segment `text` into `[{ text, isRoot }]` runs, marking the base letters
 * that spell the given `root` (in order). Diacritics stay attached to the
 * letter before them. Returns null when no confident match exists — callers
 * should then render the word unsegmented.
 *
 * Matching allows: letter-shape equivalences (أ/ا/ؤ…), doubled letters
 * written once with shadda, and dropped weak letters (و ي ا ء). Among all
 * candidate matches it prefers fewest dropped letters, then the most compact
 * span (so the alif of a ال prefix is not mistaken for a root alif).
 */
export function segmentByRoot(text, root) {
  const rootLetters = normalizeRoot(root);
  if (!text || rootLetters.length === 0) return null;

  const chars = [...String(text)];

  // Base (non-diacritic) letters with their positions and shadda flag.
  const bases = [];
  for (let i = 0; i < chars.length; i++) {
    if (DIACRITIC_RE.test(chars[i])) continue;
    let hasShadda = false;
    for (let j = i + 1; j < chars.length && DIACRITIC_RE.test(chars[j]); j++) {
      if (chars[j] === SHADDA) hasShadda = true;
    }
    bases.push({ index: i, char: chars[i], hasShadda });
  }
  if (bases.length === 0) return null;

  // Backtracking search: match rootLetters against bases in order.
  // Returns { positions, skips } minimizing (skips, span), or null.
  let best = null;

  function consider(positions, skips) {
    const matched = positions.length;
    if (matched < Math.min(2, rootLetters.length)) return;
    const span =
      matched > 0 ? positions[positions.length - 1] - positions[0] : 0;
    if (
      !best ||
      skips < best.skips ||
      (skips === best.skips && span < best.span)
    ) {
      best = { positions: [...positions], skips, span };
    }
  }

  function search(baseIdx, rootIdx, positions, skips) {
    if (rootIdx >= rootLetters.length) {
      consider(positions, skips);
      return;
    }
    const letter = rootLetters[rootIdx];

    // Option: drop a weak root letter entirely.
    if (WEAK_LETTERS.has(letter)) {
      search(baseIdx, rootIdx + 1, positions, skips + 1);
    }

    for (let b = baseIdx; b < bases.length; b++) {
      if (!matchesRootLetter(bases[b].char, letter)) continue;
      positions.push(b);

      // Doubled root letter written once with shadda (e.g. رَبّ ← ر ب ب).
      if (
        rootIdx + 1 < rootLetters.length &&
        rootLetters[rootIdx + 1] === letter &&
        bases[b].hasShadda
      ) {
        search(b + 1, rootIdx + 2, positions, skips);
      }
      search(b + 1, rootIdx + 1, positions, skips);
      positions.pop();
    }
  }

  search(0, 0, [], 0);

  if (!best || best.positions.length === 0) return null;
  // Reject matches that dropped strong information: require at least two
  // matched letters and no more than one dropped letter.
  if (best.skips > 1 || best.positions.length < 2) return null;

  const flagged = new Set(best.positions.map((b) => bases[b].index));

  // Build runs; diacritics inherit the flag of the preceding base letter.
  const runs = [];
  let currentFlag = null;
  let buffer = '';
  let lastBaseFlag = false;

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const isDiacritic = DIACRITIC_RE.test(c);
    const flag = isDiacritic ? lastBaseFlag : flagged.has(i);
    if (!isDiacritic) lastBaseFlag = flagged.has(i);

    if (currentFlag === null || flag === currentFlag) {
      buffer += c;
      currentFlag = flag;
    } else {
      runs.push({ text: buffer, isRoot: currentFlag });
      buffer = c;
      currentFlag = flag;
    }
  }
  if (buffer) runs.push({ text: buffer, isRoot: currentFlag });

  return runs;
}

/**
 * Split `text` into `[{ text, isPattern }]` runs around the first occurrence of
 * `part` — the letters carrying a lesson's grammatical pattern. `part` must
 * match exactly, diacritics included.
 *
 * Returns null when there is no part to look for or it is not present, so
 * callers can fall back to treating the whole word as the pattern.
 */
/**
 * Split `text` into `[{ text, highlighted }]` runs, marking each ordered
 * substring in `highlights`. Highlights must appear in the string in order
 * and must not overlap. Unmatched highlights are skipped.
 */
export function splitByHighlights(text, highlights) {
  const displayText = forArabicDisplay(text) ?? '';
  const terms = (highlights ?? [])
    .map((h) => forArabicDisplay(h))
    .filter(Boolean);

  if (!displayText || terms.length === 0) return null;

  const parts = [];
  let cursor = 0;

  for (const term of terms) {
    const idx = displayText.indexOf(term, cursor);
    if (idx === -1) continue;
    if (idx > cursor) {
      parts.push({ text: displayText.slice(cursor, idx), highlighted: false });
    }
    parts.push({ text: term, highlighted: true });
    cursor = idx + term.length;
  }

  if (cursor < displayText.length) {
    parts.push({ text: displayText.slice(cursor), highlighted: false });
  }

  const hasHighlight = parts.some((part) => part.highlighted);
  return hasHighlight ? parts : null;
}

export function splitByPatternPart(text, part) {
  const word = String(text ?? '');
  if (!part) return null;

  // Bare harakat often recur earlier in the word (e.g. fatha on ءَادَمَ).
  // Prefer the last match so case-ending washes land on the final letter.
  const diacriticOnly = [...part].every((char) => DIACRITIC_RE.test(char));
  const start = diacriticOnly ? word.lastIndexOf(part) : word.indexOf(part);
  if (start === -1) return null;

  const before = word.slice(0, start);
  const after = word.slice(start + part.length);

  return [
    ...(before ? [{ text: before, isPattern: false }] : []),
    { text: part, isPattern: true },
    ...(after ? [{ text: after, isPattern: false }] : []),
  ];
}

/**
 * Pull the preceding base letter into any run made up purely of combining
 * marks, so a background fill behind it has something to cover.
 *
 * A bare tanween (ٌ) carries no advance width of its own. iOS paints the
 * background across the whole glyph cluster anyway, but Android measures the
 * run at zero width and the highlight never appears. Widening the run to the
 * letter the mark sits on matches what iOS ends up showing.
 *
 * `runs` is `[{ text, ... }]`; `flagKey` names the boolean marking the run to
 * widen. Runs left empty by the move are dropped.
 */
export function widenMarkOnlyRuns(runs, flagKey = 'isPattern') {
  if (!Array.isArray(runs) || runs.length < 2) return runs;

  const widened = runs.map((run) => ({ ...run }));

  for (let i = 1; i < widened.length; i++) {
    const run = widened[i];
    if (!run[flagKey] || !run.text) continue;
    if (![...run.text].every((char) => DIACRITIC_RE.test(char))) continue;

    const prevChars = [...widened[i - 1].text];
    let base = prevChars.length - 1;
    while (base >= 0 && DIACRITIC_RE.test(prevChars[base])) base -= 1;
    if (base < 0) continue;

    run.text = prevChars.slice(base).join('') + run.text;
    widened[i - 1].text = prevChars.slice(0, base).join('');
  }

  return widened.filter((run) => run.text.length > 0);
}

const ZWJ = '\u200D';

// Letters that never connect to the letter that follows them (Unicode joining
// type R), plus hamza, which connects on neither side (type U).
const RIGHT_JOINING = new Set([
  '\u0622', // آ
  '\u0623', // أ
  '\u0624', // ؤ
  '\u0625', // إ
  '\u0627', // ا
  '\u0629', // ة
  '\u062F', // د
  '\u0630', // ذ
  '\u0631', // ر
  '\u0632', // ز
  '\u0648', // و
  '\u0671', // ٱ
]);
const NON_JOINING = new Set(['\u0621']); // ء

const ARABIC_LETTER_RE = /[\u0620-\u063F\u0641-\u064A\u066E-\u066F\u0671-\u06D3]/;

function lastBaseLetter(text) {
  const chars = [...text];
  for (let i = chars.length - 1; i >= 0; i--) {
    if (!DIACRITIC_RE.test(chars[i])) return chars[i];
  }
  return null;
}

function firstBaseLetter(text) {
  for (const char of text) {
    if (!DIACRITIC_RE.test(char)) return char;
  }
  return null;
}

function joinsForward(char) {
  return (
    char != null &&
    ARABIC_LETTER_RE.test(char) &&
    !RIGHT_JOINING.has(char) &&
    !NON_JOINING.has(char)
  );
}

function joinsBackward(char) {
  return (
    char != null && ARABIC_LETTER_RE.test(char) && !NON_JOINING.has(char)
  );
}

/**
 * Pad the seams between runs of one Arabic word with zero-width joiners.
 *
 * Splitting a word across sibling <Text> nodes makes Android shape each piece
 * on its own, so letters at a seam fall back to isolated/final forms — a medial
 * ي loses its connection and reads like ى. A ZWJ on both sides of the cut tells
 * the shaper the letter still has a neighbour, restoring the joined form.
 *
 * Only added where the letters would genuinely connect, since a ZWJ after a
 * non-connecting letter such as د would invent a join that does not exist.
 *
 * `runs` is `[{ text, ... }]`; the extra keys are preserved.
 */
export function joinRunsForShaping(runs) {
  if (!Array.isArray(runs) || runs.length < 2) return runs;

  return runs.map((run, i) => {
    const prev = i > 0 ? runs[i - 1] : null;
    const next = i < runs.length - 1 ? runs[i + 1] : null;

    const openSeam =
      prev != null &&
      joinsForward(lastBaseLetter(prev.text)) &&
      joinsBackward(firstBaseLetter(run.text));
    const closeSeam =
      next != null &&
      joinsForward(lastBaseLetter(run.text)) &&
      joinsBackward(firstBaseLetter(next.text));

    if (!openSeam && !closeSeam) return run;

    return {
      ...run,
      text: `${openSeam ? ZWJ : ''}${run.text}${closeSeam ? ZWJ : ''}`,
    };
  });
}
