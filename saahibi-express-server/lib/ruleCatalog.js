/**
 * Single source of truth: the app's rule / chapter manifests.
 * Mirrored into cache/*.mjs at startup so Node can load the app's ESM
 * syntax without requiring `"type": "module"` in saahibi-app.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rulesPath = join(here, '../../saahibi-app/data/rules.js');
const chaptersPath = join(here, '../../saahibi-app/data/chapters.js');
const cacheDir = join(here, '../cache/curriculum');

mkdirSync(cacheDir, { recursive: true });

function writeIfChanged(path, contents) {
  if (existsSync(path) && readFileSync(path, 'utf8') === contents) return false;
  writeFileSync(path, contents);
  return true;
}

const rulesSource = readFileSync(rulesPath, 'utf8');
writeIfChanged(join(cacheDir, 'rules.mjs'), rulesSource);

let chaptersSource = readFileSync(chaptersPath, 'utf8');
chaptersSource = chaptersSource.replace(
  /import\s*\{\s*RULES\s*,\s*getRuleByKey\s*\}\s*from\s*['"]\.\/rules(?:\.js)?['"]\s*;?/,
  `import { RULES, getRuleByKey } from './rules.mjs';`
);
writeIfChanged(join(cacheDir, 'chapters.mjs'), chaptersSource);

const { RULES, getRuleByKey, getRuleTtsText, getRuleTtsKeys } = await import(
  pathToFileURL(join(cacheDir, 'rules.mjs')).href
);
const { CHAPTERS, getChapterForRule } = await import(
  pathToFileURL(join(cacheDir, 'chapters.mjs')).href
);

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
