/**
 * Writes the app's bundled curriculum snapshot from the server's canonical
 * manifests.
 *
 * The snapshot is what the app renders before (and without) a network call,
 * so it should be regenerated and committed whenever the curriculum changes
 * in a way that first-launch or offline users should see.
 *
 *   npm run export-curriculum --prefix saahibi-express-server
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { getCurriculumPayload } from '../lib/curriculumPayload.js';

const target = fileURLToPath(
  new URL('../../saahibi-app/data/curriculumSnapshot.json', import.meta.url)
);

const payload = getCurriculumPayload();
writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  `[curriculum] wrote snapshot ${payload.version} ` +
    `(${payload.rules.length} rules, ${payload.chapters.length} chapters) to ${target}`
);
