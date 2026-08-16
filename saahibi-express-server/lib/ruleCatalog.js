/**
 * Single source of truth: the rule / chapter manifests. The server owns these
 * and serves them to the app over `/api/curriculum`, so lesson content can
 * change without an app release.
 */
import {
  RULES,
  getRuleByKey,
  getRuleTtsText,
  getRuleTtsKeys,
} from '../data/curriculum/rules.js';
import {
  CHAPTERS,
  getChapterForRule,
} from '../data/curriculum/chapters.js';

/**
 * Normalize a path+query so rule endpoints match request URLs even when
 * query param order differs or admin-only params (`limit`, etc.) are present.
 */
export function normalizeEndpoint(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';

  const trimmed = urlOrPath.trim();
  const u = new URL(trimmed, 'http://local');
  const ignore = new Set([
    'limit',
    'surah',
    'adminIncludeHidden',
    'includeHidden',
  ]);

  const params = [...u.searchParams.entries()]
    .filter(([key]) => !ignore.has(key))
    .sort((a, b) => {
      const keyCmp = a[0].localeCompare(b[0]);
      return keyCmp !== 0 ? keyCmp : a[1].localeCompare(b[1]);
    });

  const qs = new URLSearchParams(params).toString();
  return u.pathname + (qs ? `?${qs}` : '');
}

const endpointToRuleKey = new Map();
for (const rule of RULES) {
  if (!rule?.endpoint || !rule?.key) continue;
  endpointToRuleKey.set(normalizeEndpoint(rule.endpoint), rule.key);
}

/** Resolve which curriculum rule a `/api/queries/...` request belongs to. */
export function ruleKeyFromRequest(req) {
  const raw = req.originalUrl || req.url || '';
  const pathAndQuery = raw.split('#')[0];
  return endpointToRuleKey.get(normalizeEndpoint(pathAndQuery)) ?? null;
}

export function getRuleEndpoint(ruleKey) {
  const rule = getRuleByKey(ruleKey);
  return rule?.endpoint ?? null;
}

export { RULES, CHAPTERS, getRuleByKey, getChapterForRule, getRuleTtsText, getRuleTtsKeys };
