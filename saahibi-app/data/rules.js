/**
 * Ordered manifest of dynamic rule entries.
 *
 * The canonical copy lives on the server at
 * `saahibi-express-server/data/curriculum/rules.js` and is served over
 * `/api/curriculum`, so lesson content can change without an app release.
 * `curriculumSnapshot.json` is a build-time export of that manifest — it is
 * what renders on first launch and offline, until `utils/curriculum.js`
 * swaps in whatever the server is serving.
 *
 * Regenerate the snapshot with:
 *   npm run export-curriculum --prefix saahibi-express-server
 *
 * Each entry has:
 *   - key:          unique screen / list identifier
 *   - simpleTitle:  learner-facing main name (chapter-list / intro / header)
 *   - titleArabic:  Arabic technical name, shown beside `title`
 *   - title:        English technical name
 *   - rule:         short description text used in the intro card body
 *   - endpoint:    server path (relative; prefixed with the API base URL at
 *                  fetch time). Includes query string when applicable.
 *   - screenType:  'examples' (default; one word per example)
 *                  'mawsuf-sifah' (returns `patterns` with mawsuf+sifah)
 *   - status:      'available' (backend route exists) | 'pending'
 *   - ruleTtsKey:  optional override for the rule-tts cache key
 *   - intro:       curated lesson opener (ayah + pattern framing).
 */
import snapshot from './curriculumSnapshot.json';

export let RULES = snapshot.rules;

/**
 * Replace the in-memory manifest with a newer copy from the server. Ignores
 * anything that isn't a non-empty array, so a malformed response leaves the
 * bundled snapshot in place rather than emptying the curriculum.
 */
export function applyRules(nextRules) {
  if (!Array.isArray(nextRules) || nextRules.length === 0) return false;
  RULES = nextRules;
  return true;
}

/**
 * Look up a rule entry by its key. Returns `null` if not found.
 */
export function getRuleByKey(key) {
  return RULES.find((rule) => rule.key === key) ?? null;
}

/**
 * Curated lesson intro for a rule key, or `null` when none is set.
 */
export function getLessonIntro(key) {
  return getRuleByKey(key)?.intro ?? null;
}

/**
 * Spoken text for rule TTS. `variant` is `'summary'` (intro.noticeSummary when
 * set) or `'full'` (the rule explanation). Returns `null` when unknown / empty.
 */
export function getRuleTtsText(key, variant = 'full') {
  const rule = getRuleByKey(key);
  if (!rule) return null;

  if (variant === 'summary') {
    const summary = rule.intro?.noticeSummary;
    if (typeof summary === 'string' && summary.trim()) {
      return summary.trim();
    }
  }

  const text = rule.rule;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}

/** Rule keys that have spoken full-text explanations. */
export function getRuleTtsKeys() {
  return RULES.filter((r) => getRuleTtsText(r.key, 'full')).map((r) => r.key);
}

/**
 * Filter to only the rules whose backend route currently exists.
 */
export function getAvailableRules() {
  return RULES.filter((rule) => rule.status === 'available');
}
