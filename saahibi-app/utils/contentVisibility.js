import { getApiBaseUrl } from './api';

/** @type {Set<string>} */
let hiddenRuleKeys = new Set();

/** @type {Set<string>} */
let hiddenChapterKeys = new Set();

/** @type {Promise<{ hiddenRuleKeys: Set<string>, hiddenChapterKeys: Set<string> }> | null} */
let inflight = null;

export function getHiddenRuleKeys() {
  return hiddenRuleKeys;
}

export function getHiddenChapterKeys() {
  return hiddenChapterKeys;
}

export function isRuleHidden(ruleKey) {
  return hiddenRuleKeys.has(ruleKey);
}

export function isChapterHidden(chapterKey) {
  return hiddenChapterKeys.has(chapterKey);
}

/**
 * Fetch the server denylist. On failure, keeps the previous sets (or empty =
 * show all). Safe to call often; concurrent callers share one request.
 */
export async function refreshContentVisibility() {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/content-visibility`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const ruleKeys = Array.isArray(data?.hiddenRuleKeys)
        ? data.hiddenRuleKeys
        : [];
      const chapterKeys = Array.isArray(data?.hiddenChapterKeys)
        ? data.hiddenChapterKeys
        : [];
      hiddenRuleKeys = new Set(
        ruleKeys.filter((k) => typeof k === 'string' && k.length > 0)
      );
      hiddenChapterKeys = new Set(
        chapterKeys.filter((k) => typeof k === 'string' && k.length > 0)
      );
    } catch (err) {
      console.warn(
        '[visibility] failed to load; showing all content:',
        err?.message || err
      );
    } finally {
      inflight = null;
    }
    return { hiddenRuleKeys, hiddenChapterKeys };
  })();

  return inflight;
}
