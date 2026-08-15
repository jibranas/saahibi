import { Router } from 'express';

import { isDbConnected } from '../db.js';
import { WordAudio } from '../models/WordAudio.js';

const router = Router();
const MAX_SEQUENCE_WORDS = 20;

function parseWordRef(params) {
  const surahId = Number(params.surahId);
  const ayahNo = Number(params.ayahNo);
  const wordNo = Number(params.wordNo);

  if (
    !Number.isInteger(surahId) ||
    !Number.isInteger(ayahNo) ||
    !Number.isInteger(wordNo) ||
    surahId <= 0 ||
    ayahNo <= 0 ||
    wordNo <= 0
  ) {
    return null;
  }

  return { surahId, ayahNo, wordNo };
}

function wordRefKey(word) {
  return `${word.surahId}:${word.ayahNo}:${word.wordNo}`;
}

function toAudioResponse(doc) {
  return {
    surahId: doc.surahId,
    ayahNo: doc.ayahNo,
    wordNo: doc.wordNo,
    wordId: doc.wordId,
    wordAr: doc.wordAr,
    wordEn: doc.wordEn,
    wordTr: doc.wordTr,
    audioPath: doc.audioPath,
    url: doc.audioPath,
  };
}

router.get('/:surahId/:ayahNo/:wordNo', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const ref = parseWordRef(req.params);
    if (!ref) {
      res.status(400).json({ error: 'Invalid word reference' });
      return;
    }

    const audio = await WordAudio.findOne(ref).lean();
    if (!audio?.audioPath) {
      res.status(404).json({ error: 'Word audio not found' });
      return;
    }

    res.redirect(302, audio.audioPath);
  } catch (err) {
    next(err);
  }
});

router.post('/resolve-sequence', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const words = Array.isArray(req.body?.words) ? req.body.words : [];
    if (words.length === 0) {
      res.status(400).json({ error: 'Expected words array' });
      return;
    }
    if (words.length > MAX_SEQUENCE_WORDS) {
      res.status(400).json({
        error: `words array cannot exceed ${MAX_SEQUENCE_WORDS} entries`,
      });
      return;
    }

    const refs = words.map(parseWordRef);
    if (refs.some((ref) => ref == null)) {
      res.status(400).json({ error: 'Invalid word reference in sequence' });
      return;
    }

    const docs = await WordAudio.find({
      $or: refs.map((ref) => ({
        surahId: ref.surahId,
        ayahNo: ref.ayahNo,
        wordNo: ref.wordNo,
      })),
    }).lean();
    const byKey = new Map(docs.map((doc) => [wordRefKey(doc), doc]));

    const items = refs.map((ref) => {
      const doc = byKey.get(wordRefKey(ref));
      return doc ? toAudioResponse(doc) : { ...ref, missing: true };
    });

    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

export default router;
