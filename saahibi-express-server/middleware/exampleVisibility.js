import { getHiddenPhraseRefs } from '../lib/contentVisibility.js';
import { ruleKeyFromRequest } from '../lib/ruleCatalog.js';

/**
 * Drops examples/patterns whose phraseRef is on the denylist for the
 * matching curriculum rule. Runs after occurrence decoration has attached
 * phraseRef (see mount order in index.js).
 *
 * Pass `X-Saahibi-Admin: 1` (or `?includeHidden=1`) to skip filtering —
 * used by the admin panel so it can show and toggle hidden cards.
 */

function shouldProcess(res, body) {
  if (res.statusCode < 200 || res.statusCode >= 300) return false;
  if (!body || typeof body !== 'object') return false;
  return Array.isArray(body.examples) || Array.isArray(body.patterns);
}

function wantsIncludeHidden(req) {
  if (req.get('x-saahibi-admin') === '1') return true;
  const flag = req.query?.includeHidden ?? req.query?.adminIncludeHidden;
  return flag === '1' || flag === 'true';
}

function filterBody(body, hiddenRefs) {
  if (!hiddenRefs || hiddenRefs.size === 0) return body;

  const examples = Array.isArray(body.examples) ? body.examples : null;
  const patterns = Array.isArray(body.patterns) ? body.patterns : null;
  const length = Math.max(examples?.length ?? 0, patterns?.length ?? 0);
  if (length === 0) return body;

  const keptExamples = [];
  const keptPatterns = [];

  for (let i = 0; i < length; i += 1) {
    const example = examples?.[i];
    const pattern = patterns?.[i];
    const phraseRef = example?.phraseRef ?? pattern?.phraseRef;
    if (phraseRef && hiddenRefs.has(phraseRef)) continue;
    if (example) keptExamples.push(example);
    if (pattern) keptPatterns.push(pattern);
  }

  const next = { ...body };
  if (examples) next.examples = keptExamples;
  if (patterns) next.patterns = keptPatterns;
  next.count = examples ? keptExamples.length : keptPatterns.length;
  next.hiddenFiltered = length - (examples ? keptExamples.length : keptPatterns.length);
  return next;
}

export function exampleVisibility(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (!shouldProcess(res, body) || wantsIncludeHidden(req)) {
      return originalJson(body);
    }

    const ruleKey = ruleKeyFromRequest(req);
    if (!ruleKey) return originalJson(body);

    return getHiddenPhraseRefs(ruleKey)
      .then((hiddenRefs) => originalJson(filterBody(body, hiddenRefs)))
      .catch((err) => {
        console.warn(
          `[visibility] filter failed: ${err?.message ?? err}`
        );
        return originalJson(body);
      });
  };

  next();
}

export default exampleVisibility;
