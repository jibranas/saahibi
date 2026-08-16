/**
 * The curriculum as the app consumes it: the raw manifests plus a content
 * hash. The app ships a build-time snapshot of this same shape and swaps in
 * the server copy at launch, so `version` is what lets it skip a redundant
 * write when nothing has changed.
 *
 * Visibility is deliberately not applied here — the app overlays hidden keys
 * from `/api/content-visibility` separately.
 */
import { createHash } from 'node:crypto';

import { CHAPTERS, RULES } from './ruleCatalog.js';

let cached = null;

export function getCurriculumPayload() {
  if (cached) return cached;

  const body = { rules: RULES, chapters: CHAPTERS };
  const version = createHash('sha256')
    .update(JSON.stringify(body))
    .digest('hex')
    .slice(0, 16);

  cached = { version, ...body };
  return cached;
}
