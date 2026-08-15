import { Router } from 'express';

import {
  getHiddenChapterKeys,
  getHiddenPhraseRefs,
  getHiddenRuleKeys,
  setChapterHidden,
  setExampleHidden,
  setExamplesHidden,
  setRuleHidden,
} from '../lib/contentVisibility.js';
import {
  CHAPTERS,
  getRuleByKey,
  getRuleEndpoint,
  RULES,
} from '../lib/ruleCatalog.js';
import { ensureCorpus, getWordText } from '../lib/quranCorpus.js';
import { isDbConnected } from '../db.js';

const router = Router();

function requireAdminAuth(req, res, next) {
  const token = process.env.ADMIN_TOKEN?.trim();
  if (!token) {
    next();
    return;
  }
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match && match[1] === token) {
    next();
    return;
  }
  res.status(401).json({ error: 'Unauthorized' });
}

router.use(requireAdminAuth);

/** Resolve Arabic for a word ref, preferring payload text then the corpus. */
function wordLabel(surahId, ayahNo, word) {
  if (!word || typeof word !== 'object') return '';
  if (typeof word.text === 'string' && word.text) return word.text;
  if (surahId == null || ayahNo == null || word.wordNo == null) return '';
  return getWordText(surahId, ayahNo, word.wordNo) || '';
}

function cardText(example, pattern) {
  if (example?.text) return example.text;

  if (Array.isArray(example?.words) && example.words.length) {
    const parts = example.words
      .map((w) => wordLabel(example.surahId, example.ayahNo, w))
      .filter(Boolean);
    if (parts.length) return parts.join(' ');
  }

  if (pattern && typeof pattern === 'object') {
    const parts = [];
    for (const side of Object.values(pattern)) {
      if (!side || typeof side !== 'object' || Array.isArray(side)) continue;
      const label = wordLabel(side.surahId, side.ayahNo, side);
      if (label) parts.push(label);
    }
    if (parts.length) return parts.join(' ');
  }

  // Last resort: phraseRef like "2:4:7,2:4:8,2:4:9"
  const phraseRef = example?.phraseRef ?? pattern?.phraseRef;
  if (typeof phraseRef === 'string' && phraseRef) {
    const parts = phraseRef
      .split(',')
      .map((token) => {
        const [s, a, w] = token.trim().split(':').map(Number);
        if (![s, a, w].every(Number.isFinite)) return '';
        return getWordText(s, a, w) || '';
      })
      .filter(Boolean);
    if (parts.length) return parts.join(' ');
  }

  return '';
}

function summarizeCard(example, pattern) {
  const base = example ?? pattern ?? {};
  const phraseRef = example?.phraseRef ?? pattern?.phraseRef ?? null;
  const surahId = example?.surahId ?? pattern?.mawsuf?.surahId ?? pattern?.mudaf?.surahId ?? null;
  const ayahNo = example?.ayahNo ?? pattern?.mawsuf?.ayahNo ?? pattern?.mudaf?.ayahNo ?? null;

  // Fall back: first nested side with location
  let locSurah = surahId;
  let locAyah = ayahNo;
  if ((locSurah == null || locAyah == null) && pattern) {
    for (const side of Object.values(pattern)) {
      if (side && typeof side === 'object' && !Array.isArray(side)) {
        if (side.surahId != null && side.ayahNo != null) {
          locSurah = side.surahId;
          locAyah = side.ayahNo;
          break;
        }
      }
    }
  }

  return {
    phraseRef,
    surahId: locSurah,
    ayahNo: locAyah,
    text: cardText(example, pattern),
    occurrenceCount: example?.occurrenceCount ?? pattern?.occurrenceCount ?? null,
    translations: example?.translations ?? null,
  };
}

router.get('/rules', async (_req, res, next) => {
  try {
    const [hiddenRuleKeys, hiddenChapterKeys] = await Promise.all([
      getHiddenRuleKeys(),
      getHiddenChapterKeys(),
    ]);
    const hiddenRules = new Set(hiddenRuleKeys);
    const hiddenChapters = new Set(hiddenChapterKeys);
    const byKey = new Map(RULES.map((r) => [r.key, r]));

    const chapters = CHAPTERS.map((chapter) => ({
      key: chapter.key,
      simpleTitle: chapter.simpleTitle,
      title: chapter.title,
      titleArabic: chapter.titleArabic,
      hidden: hiddenChapters.has(chapter.key),
      rules: chapter.lessonKeys
        .map((key) => {
          const rule = byKey.get(key);
          if (!rule) return null;
          return {
            key: rule.key,
            title: rule.title,
            rule: rule.rule,
            endpoint: rule.endpoint,
            screenType: rule.screenType ?? 'examples',
            status: rule.status,
            hidden: hiddenRules.has(rule.key),
          };
        })
        .filter(Boolean),
    }));

    const assigned = new Set(CHAPTERS.flatMap((c) => c.lessonKeys));
    const unassigned = RULES.filter((r) => !assigned.has(r.key)).map((rule) => ({
      key: rule.key,
      title: rule.title,
      rule: rule.rule,
      endpoint: rule.endpoint,
      screenType: rule.screenType ?? 'examples',
      status: rule.status,
      hidden: hiddenRules.has(rule.key),
    }));

    res.json({
      chapters,
      unassigned,
      hiddenChapterCount: hiddenChapters.size,
      hiddenRuleCount: hiddenRules.size,
      ruleCount: RULES.length,
      chapterCount: CHAPTERS.length,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/chapters/:chapterKey', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const { chapterKey } = req.params;
    const chapter = CHAPTERS.find((c) => c.key === chapterKey);
    if (!chapter) {
      res.status(404).json({ error: `Unknown chapter: ${chapterKey}` });
      return;
    }

    const hidden = Boolean(req.body?.hidden);
    await setChapterHidden(chapterKey, hidden);
    res.json({ chapterKey, hidden });
  } catch (err) {
    next(err);
  }
});

router.put('/rules/:ruleKey', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const { ruleKey } = req.params;
    const rule = getRuleByKey(ruleKey);
    if (!rule) {
      res.status(404).json({ error: `Unknown rule: ${ruleKey}` });
      return;
    }

    const hidden = Boolean(req.body?.hidden);
    await setRuleHidden(ruleKey, hidden);
    res.json({ ruleKey, hidden });
  } catch (err) {
    next(err);
  }
});

router.get('/rules/:ruleKey/examples', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const { ruleKey } = req.params;
    const rule = getRuleByKey(ruleKey);
    const endpoint = getRuleEndpoint(ruleKey);
    if (!rule || !endpoint) {
      res.status(404).json({ error: `Unknown rule: ${ruleKey}` });
      return;
    }

    const port = Number(process.env.PORT) || 3000;
    const url = new URL(endpoint, `http://127.0.0.1:${port}`);
    url.searchParams.set('includeHidden', '1');

    const upstream = await fetch(url, {
      headers: { 'X-Saahibi-Admin': '1' },
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: data?.error || `Query failed (${upstream.status})`,
        details: data,
      });
      return;
    }

    // Many query routes return wordNos without Arabic; resolve from corpus.
    await ensureCorpus();

    const hiddenRefs = await getHiddenPhraseRefs(ruleKey);
    const examples = Array.isArray(data?.examples) ? data.examples : [];
    const patterns = Array.isArray(data?.patterns) ? data.patterns : [];
    const length = Math.max(examples.length, patterns.length);

    const cards = [];
    for (let i = 0; i < length; i += 1) {
      const example = examples[i];
      const pattern = patterns[i];
      const summary = summarizeCard(example, pattern);
      if (!summary.phraseRef) continue;
      cards.push({
        ...summary,
        hidden: hiddenRefs.has(summary.phraseRef),
      });
    }

    res.json({
      ruleKey,
      title: rule.title,
      endpoint: rule.endpoint,
      screenType: rule.screenType ?? 'examples',
      totalMatches: data?.totalMatches ?? data?.totalPatterns ?? cards.length,
      count: cards.length,
      hiddenCount: cards.filter((c) => c.hidden).length,
      examples: cards,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/rules/:ruleKey/examples', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const { ruleKey } = req.params;
    if (!getRuleByKey(ruleKey)) {
      res.status(404).json({ error: `Unknown rule: ${ruleKey}` });
      return;
    }

    const body = req.body ?? {};
    const hidden = Boolean(body.hidden);

    if (Array.isArray(body.phraseRefs)) {
      const result = await setExamplesHidden(ruleKey, body.phraseRefs, hidden);
      res.json({ ruleKey, hidden, ...result });
      return;
    }

    if (typeof body.phraseRef === 'string' && body.phraseRef) {
      await setExampleHidden(ruleKey, body.phraseRef, hidden);
      res.json({ ruleKey, phraseRef: body.phraseRef, hidden });
      return;
    }

    res.status(400).json({
      error: 'Provide phraseRef (string) or phraseRefs (array) and hidden (boolean)',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
