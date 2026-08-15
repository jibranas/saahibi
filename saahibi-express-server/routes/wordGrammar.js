import { Router } from 'express';

import { isDbConnected } from '../db.js';
import { Morphology } from '../models/Morphology.js';

const router = Router();

const MAX_REFS = 40;

/** POS codes that can carry the word's "main" grammatical identity. */
const STEM_POS = new Set(['N', 'PN', 'ADJ', 'PRON', 'DEM', 'REL', 'V', 'IMPN']);

function parseRefs(raw) {
  if (!raw) return null;
  const parts = String(raw)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_REFS) return null;

  const refs = [];
  for (const part of parts) {
    const bits = part.split(':').map(Number);
    if (bits.length !== 3 || bits.some((n) => !Number.isFinite(n))) return null;
    refs.push({ surahId: bits[0], ayahNo: bits[1], wordNo: bits[2] });
  }
  return refs;
}

/**
 * Pick the segment that best represents the word: prefer one with a root,
 * then one with a nominal case, then any stem POS, then the last segment.
 */
function pickMainSegment(segments) {
  return (
    segments.find((s) => s.Root && String(s.Root).trim() !== '') ??
    segments.find((s) => s.NominalCase && String(s.NominalCase).trim() !== '') ??
    segments.find((s) => STEM_POS.has(String(s.PartOfSpeech))) ??
    segments[segments.length - 1] ??
    null
  );
}

function toWordPayload(ref, segments) {
  if (segments.length === 0) return { ...ref, found: false };

  const main = pickMainSegment(segments);
  // The corpus often leaves NominalState empty for ال-definite nouns —
  // derive definiteness from the DET prefix so the app can still show it.
  const hasDetPrefix = segments.some((s) => s.PrefixType === 'DET');
  const nominalState =
    main?.NominalState || (hasDetPrefix ? 'DEF' : null);
  return {
    ...ref,
    found: true,
    text: segments.map((s) => s.Text ?? '').join(''),
    segments: segments.map((s) => ({
      text: s.Text ?? '',
      partOfSpeech: s.PartOfSpeech ?? null,
      prefixType: s.PrefixType || null,
      suffixType: s.SuffixType || null,
      root: s.Root || null,
    })),
    partOfSpeech: main?.PartOfSpeech ?? null,
    root: main?.Root || null,
    lemma: main?.Lemma || null,
    gender: main?.Gender ?? null,
    number: main?.Number ?? null,
    nominalCase: main?.NominalCase || null,
    nominalState,
    nominalDerivation: main?.NominalDerivation || null,
  };
}

/**
 * GET /api/word-grammar?refs=2:255:3,2:255:4
 *
 * Batch lookup of word-level grammar. Each ref is `surah:ayah:word`.
 * Returns `{ words: [...] }` in the same order as the request.
 */
router.get('/', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const refs = parseRefs(req.query.refs);
    if (!refs) {
      res.status(400).json({
        error: `refs is required: comma-separated surah:ayah:word triples (max ${MAX_REFS})`,
      });
      return;
    }

    const records = await Morphology.find({
      $or: refs.map((r) => ({
        SurahId: r.surahId,
        AyahNo: r.ayahNo,
        WordNo: r.wordNo,
      })),
    })
      .sort({ SurahId: 1, AyahNo: 1, WordNo: 1, SegmentNo: 1 })
      .lean();

    const byWord = new Map();
    for (const rec of records) {
      const key = `${rec.SurahId}-${rec.AyahNo}-${rec.WordNo}`;
      if (!byWord.has(key)) byWord.set(key, []);
      byWord.get(key).push(rec);
    }

    const words = refs.map((ref) =>
      toWordPayload(ref, byWord.get(`${ref.surahId}-${ref.ayahNo}-${ref.wordNo}`) ?? [])
    );

    res.json({ words });
  } catch (err) {
    next(err);
  }
});

export default router;
