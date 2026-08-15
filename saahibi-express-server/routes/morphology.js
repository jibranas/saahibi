import { Router } from 'express';

import { isDbConnected } from '../db.js';
import { Morphology } from '../models/Morphology.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const items = await Morphology.find()
      .sort({ Id: 1 })
      .limit(10)
      .lean();

    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

export default router;
