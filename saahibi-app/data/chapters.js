import { RULES, applyRules, getRuleByKey } from './rules';
import snapshot from './curriculumSnapshot.json';

/**
 * Chapters group the flat rule manifest into a beginner-friendly curriculum.
 * Each chapter lists its lessons by rule key, in teaching order (which mirrors
 * the original manifest order).
 *
 * Canonical copy lives on the server; see `./rules` for how the bundled
 * snapshot and the `/api/curriculum` payload relate.
 */
export let CHAPTERS = snapshot.chapters;

/**
 * Swap in a newer curriculum from the server. Rules and chapters move
 * together — chapter lesson lists reference rule keys, so applying one
 * without the other would produce empty chapters.
 */
export function applyCurriculum(next) {
  if (!Array.isArray(next?.chapters) || next.chapters.length === 0) {
    return false;
  }
  if (!applyRules(next.rules)) return false;
  CHAPTERS = next.chapters;
  return true;
}

export function getChapterByKey(key) {
  return CHAPTERS.find((chapter) => chapter.key === key) ?? null;
}

/** Chapter containing the given rule key, or null. */
export function getChapterForRule(ruleKey) {
  return (
    CHAPTERS.find((chapter) => chapter.lessonKeys.includes(ruleKey)) ?? null
  );
}

/**
 * Grammatical-detail chips unlock when the learner reaches these chapters
 * (stable keys — not chapter numbers). Cumulative: a chip stays available
 * for every later chapter in CHAPTERS order.
 */
const CHIP_UNLOCK_CHAPTER_KEY = {
  "I'RAAB": 'word-endings',
  JINS: 'feminine-nouns',
  ADAD: 'duals-plurals',
  "WUS'AT": 'definite-indefinite',
};

function chapterOrder(key) {
  if (!key) return -1;
  return CHAPTERS.findIndex((c) => c.key === key);
}

/** True when `label` (e.g. JINS) is unlocked for the given chapter key. */
export function isChipUnlocked(label, chapterKey) {
  const unlockKey = CHIP_UNLOCK_CHAPTER_KEY[label];
  if (!unlockKey) return true;
  const current = chapterOrder(chapterKey);
  const unlockAt = chapterOrder(unlockKey);
  if (current < 0 || unlockAt < 0) return false;
  return current >= unlockAt;
}

/**
 * Lesson number label like "3.2" (chapter index . lesson index, 1-based).
 * Returns null if the rule is not in any chapter.
 */
export function getLessonNumber(ruleKey) {
  for (let c = 0; c < CHAPTERS.length; c++) {
    const i = CHAPTERS[c].lessonKeys.indexOf(ruleKey);
    if (i !== -1) return `${c + 1}.${i + 1}`;
  }
  return null;
}

/**
 * Ordered rule entries for a chapter (skips unknown keys).
 * Pass `hiddenRuleKeys` (Set or array) to omit curated-hidden lessons.
 */
export function getLessonsForChapter(chapterKey, hiddenRuleKeys = null) {
  const chapter = getChapterByKey(chapterKey);
  if (!chapter) return [];
  const hidden = toHiddenSet(hiddenRuleKeys);
  return chapter.lessonKeys
    .map((key) => getRuleByKey(key))
    .filter(Boolean)
    .filter((rule) => !hidden.has(rule.key));
}

/**
 * Returns the rule key of the lesson that follows the given one in the
 * curriculum — the next lesson in the same chapter, or the first lesson of the
 * next chapter. Returns null if the rule is at the very end or not found.
 * Skips hidden rules and lessons inside hidden chapters when those sets are provided.
 */
export function getNextLessonKey(
  ruleKey,
  hiddenRuleKeys = null,
  hiddenChapterKeys = null
) {
  const hiddenRules = toHiddenSet(hiddenRuleKeys);
  const hiddenChapters = toHiddenSet(hiddenChapterKeys);
  const flat = [];
  for (const chapter of CHAPTERS) {
    if (hiddenChapters.has(chapter.key)) continue;
    for (const key of chapter.lessonKeys) flat.push(key);
  }
  const start = flat.indexOf(ruleKey);
  if (start === -1) return null;
  for (let i = start + 1; i < flat.length; i += 1) {
    const key = flat[i];
    if (!hiddenRules.has(key) && getRuleByKey(key)) return key;
  }
  return null;
}

function toHiddenSet(hiddenRuleKeys) {
  if (!hiddenRuleKeys) return new Set();
  if (hiddenRuleKeys instanceof Set) return hiddenRuleKeys;
  return new Set(hiddenRuleKeys);
}

/** Sanity helper: rule keys not assigned to any chapter. */
export function getUnassignedRuleKeys() {
  const assigned = new Set(CHAPTERS.flatMap((c) => c.lessonKeys));
  return RULES.filter((r) => !assigned.has(r.key)).map((r) => r.key);
}
