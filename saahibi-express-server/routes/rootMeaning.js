import { Router } from 'express';

import { isDbConnected } from '../db.js';
import {
  fetchRootMeaningByCompactRoot,
  fetchRootMeaningForWord,
} from '../lib/rootMeanings.js';

const router = Router();

router.get('/by-word', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const surah = Number(req.query.surah);
    const ayah = Number(req.query.ayah);
    const word = Number(req.query.word);

    if (!Number.isFinite(surah) || !Number.isFinite(ayah) || !Number.isFinite(word)) {
      res.status(400).json({ error: 'surah, ayah, and word are required numbers' });
      return;
    }

    const payload = await fetchRootMeaningForWord({
      surahId: surah,
      ayahNo: ayah,
      wordNo: word,
    });

    if (!payload) {
      res.status(404).json({ error: 'not found' });
      return;
    }

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

router.get('/by-root', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const root = String(req.query.root ?? '').trim();
    if (!root) {
      res.status(400).json({ error: 'root is required' });
      return;
    }

    const payload = await fetchRootMeaningByCompactRoot(root);
    if (!payload) {
      res.status(404).json({ error: 'not found' });
      return;
    }

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
