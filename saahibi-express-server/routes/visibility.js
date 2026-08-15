import { Router } from 'express';

import {
  getHiddenChapterKeys,
  getHiddenRuleKeys,
} from '../lib/contentVisibility.js';

const router = Router();

/**
 * Public read API for the app: which chapters/rules are currently hidden.
 * Examples are filtered server-side on `/api/queries/*`.
 */
router.get('/', async (_req, res, next) => {
  try {
    const [hiddenChapterKeys, hiddenRuleKeys] = await Promise.all([
      getHiddenChapterKeys(),
      getHiddenRuleKeys(),
    ]);
    res.json({ hiddenChapterKeys, hiddenRuleKeys });
  } catch (err) {
    next(err);
  }
});

export default router;
