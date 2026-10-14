import {
  CHAPTERS,
  getChapterForRule,
  getRuleByKey,
} from './ruleCatalog.js';

const DEFAULT_API_HOST = 'https://us.posthog.com';
const NOTE_LIMIT = 100;

const FEEDBACK_QUERY = `
SELECT
  timestamp,
  distinct_id,
  properties.message AS message,
  properties.screen AS screen,
  properties.rule_key AS rule_key,
  properties.chapter_key AS chapter_key,
  person.properties.name AS name,
  person.properties.email AS email
FROM events
WHERE event = 'feedback_submitted'
ORDER BY timestamp DESC
LIMIT ${NOTE_LIMIT}
`.trim();

const NOT_CONFIGURED_MESSAGE =
  'PostHog is not configured. Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID on the server.';

function posthogConfig() {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim() || '';
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim() || '';
  const host = (process.env.POSTHOG_API_HOST || DEFAULT_API_HOST).replace(
    /\/+$/,
    ''
  );
  return {
    apiKey,
    projectId,
    host,
    configured: Boolean(apiKey && projectId),
  };
}

function asString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export function mapFeedbackRow(raw) {
  const ruleKey = asString(raw.rule_key);
  const explicitChapterKey = asString(raw.chapter_key);
  const rule = ruleKey ? getRuleByKey(ruleKey) : null;
  const explicitChapter = explicitChapterKey
    ? CHAPTERS.find((chapter) => chapter.key === explicitChapterKey) ?? null
    : null;
  const chapter =
    explicitChapter ?? (ruleKey ? getChapterForRule(ruleKey) : null);

  return {
    timestamp: raw.timestamp ?? null,
    message: asString(raw.message) ?? '',
    screen: asString(raw.screen),
    ruleKey,
    ruleTitle: rule?.title ?? null,
    chapterKey: chapter?.key ?? explicitChapterKey,
    chapterTitle: chapter?.simpleTitle ?? null,
    name: asString(raw.name),
    email: asString(raw.email),
    distinctId: asString(raw.distinct_id),
  };
}

function resultsToObjects(columns, results) {
  if (!Array.isArray(columns) || !Array.isArray(results)) return [];
  return results.map((row) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) return row;
    const obj = {};
    columns.forEach((column, index) => {
      obj[column] = Array.isArray(row) ? row[index] : null;
    });
    return obj;
  });
}

function posthogErrorMessage(data, status) {
  if (typeof data?.detail === 'string' && data.detail.trim()) {
    return data.detail.trim();
  }
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error.trim();
  }
  return `PostHog query failed (${status})`;
}

export async function listFeedbackNotes() {
  const { apiKey, projectId, host, configured } = posthogConfig();
  if (!configured) {
    return {
      configured: false,
      notes: [],
      message: NOT_CONFIGURED_MESSAGE,
    };
  }

  if (!/^\d+$/.test(projectId)) {
    const err = new Error(
      'POSTHOG_PROJECT_ID must be the numeric PostHog project id.'
    );
    err.status = 500;
    throw err;
  }

  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: { kind: 'HogQLQuery', query: FEEDBACK_QUERY },
      refresh: 'force_blocking',
      name: 'admin feedback',
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const err = new Error(posthogErrorMessage(data, response.status));
    err.status = 502;
    throw err;
  }

  const rows = resultsToObjects(data?.columns, data?.results);
  return {
    configured: true,
    notes: rows.map(mapFeedbackRow),
    limit: NOTE_LIMIT,
  };
}
