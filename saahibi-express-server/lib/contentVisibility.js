import { isDbConnected } from '../db.js';
import { HiddenChapter } from '../models/HiddenChapter.js';
import { HiddenExample } from '../models/HiddenExample.js';
import { HiddenRule } from '../models/HiddenRule.js';
import { invalidateQueryCache } from './queryCache.js';

/**
 * @type {{
 *   hiddenChapters: Set<string>,
 *   hiddenRules: Set<string>,
 *   hiddenExamplesByRule: Map<string, Set<string>>,
 *   loadedAt: number,
 * } | null}
 */
let cache = null;

function emptyState() {
  return {
    hiddenChapters: new Set(),
    hiddenRules: new Set(),
    hiddenExamplesByRule: new Map(),
    loadedAt: Date.now(),
  };
}

export function invalidateVisibilityCache() {
  cache = null;
  // Cached lesson payloads already have the old denylist applied to them.
  invalidateQueryCache();
}

async function loadVisibility() {
  if (!isDbConnected()) return emptyState();

  const [chapters, rules, examples] = await Promise.all([
    HiddenChapter.find({}).select('chapterKey').lean(),
    HiddenRule.find({}).select('ruleKey').lean(),
    HiddenExample.find({}).select('ruleKey phraseRef').lean(),
  ]);

  const hiddenChapters = new Set(
    chapters.map((c) => c.chapterKey).filter((k) => typeof k === 'string' && k)
  );

  const hiddenRules = new Set(
    rules.map((r) => r.ruleKey).filter((k) => typeof k === 'string' && k)
  );

  const hiddenExamplesByRule = new Map();
  for (const row of examples) {
    if (!row?.ruleKey || !row?.phraseRef) continue;
    let set = hiddenExamplesByRule.get(row.ruleKey);
    if (!set) {
      set = new Set();
      hiddenExamplesByRule.set(row.ruleKey, set);
    }
    set.add(row.phraseRef);
  }

  return {
    hiddenChapters,
    hiddenRules,
    hiddenExamplesByRule,
    loadedAt: Date.now(),
  };
}

export async function getVisibility() {
  if (cache) return cache;
  cache = await loadVisibility();
  return cache;
}

export async function getHiddenChapterKeys() {
  const { hiddenChapters } = await getVisibility();
  return [...hiddenChapters];
}

export async function getHiddenRuleKeys() {
  const { hiddenRules } = await getVisibility();
  return [...hiddenRules];
}

export async function isChapterHidden(chapterKey) {
  if (!chapterKey) return false;
  const { hiddenChapters } = await getVisibility();
  return hiddenChapters.has(chapterKey);
}

export async function isRuleHidden(ruleKey) {
  if (!ruleKey) return false;
  const { hiddenRules } = await getVisibility();
  return hiddenRules.has(ruleKey);
}

export async function isExampleHidden(ruleKey, phraseRef) {
  if (!ruleKey || !phraseRef) return false;
  const { hiddenExamplesByRule } = await getVisibility();
  return hiddenExamplesByRule.get(ruleKey)?.has(phraseRef) ?? false;
}

export async function getHiddenPhraseRefs(ruleKey) {
  if (!ruleKey) return new Set();
  const { hiddenExamplesByRule } = await getVisibility();
  return new Set(hiddenExamplesByRule.get(ruleKey) ?? []);
}

export async function setChapterHidden(chapterKey, hidden) {
  if (!chapterKey || typeof chapterKey !== 'string') {
    throw new Error('chapterKey is required');
  }
  if (!isDbConnected()) {
    throw new Error('Database not connected');
  }

  if (hidden) {
    await HiddenChapter.updateOne(
      { chapterKey },
      { $setOnInsert: { chapterKey } },
      { upsert: true }
    );
  } else {
    await HiddenChapter.deleteOne({ chapterKey });
  }
  invalidateVisibilityCache();
}

export async function setRuleHidden(ruleKey, hidden) {
  if (!ruleKey || typeof ruleKey !== 'string') {
    throw new Error('ruleKey is required');
  }
  if (!isDbConnected()) {
    throw new Error('Database not connected');
  }

  if (hidden) {
    await HiddenRule.updateOne(
      { ruleKey },
      { $setOnInsert: { ruleKey } },
      { upsert: true }
    );
  } else {
    await HiddenRule.deleteOne({ ruleKey });
  }
  invalidateVisibilityCache();
}

export async function setExampleHidden(ruleKey, phraseRef, hidden) {
  if (!ruleKey || !phraseRef) {
    throw new Error('ruleKey and phraseRef are required');
  }
  if (!isDbConnected()) {
    throw new Error('Database not connected');
  }

  if (hidden) {
    await HiddenExample.updateOne(
      { ruleKey, phraseRef },
      { $setOnInsert: { ruleKey, phraseRef } },
      { upsert: true }
    );
  } else {
    await HiddenExample.deleteOne({ ruleKey, phraseRef });
  }
  invalidateVisibilityCache();
}

export async function setExamplesHidden(ruleKey, phraseRefs, hidden) {
  if (!ruleKey || !Array.isArray(phraseRefs)) {
    throw new Error('ruleKey and phraseRefs[] are required');
  }
  if (!isDbConnected()) {
    throw new Error('Database not connected');
  }

  const refs = [
    ...new Set(
      phraseRefs.filter((r) => typeof r === 'string' && r.trim()).map((r) => r.trim())
    ),
  ];
  if (refs.length === 0) {
    invalidateVisibilityCache();
    return { updated: 0 };
  }

  if (hidden) {
    await HiddenExample.bulkWrite(
      refs.map((phraseRef) => ({
        updateOne: {
          filter: { ruleKey, phraseRef },
          update: { $setOnInsert: { ruleKey, phraseRef } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  } else {
    await HiddenExample.deleteMany({ ruleKey, phraseRef: { $in: refs } });
  }
  invalidateVisibilityCache();
  return { updated: refs.length };
}
