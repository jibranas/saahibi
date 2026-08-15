import { Router } from 'express';

import { isDbConnected } from '../db.js';
import { Translation } from '../models/Translation.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const items = await Translation.find()
      .sort({ surah: 1, ayah: 1, word: 1 })
      .limit(10)
      .lean();

    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

export default router;
