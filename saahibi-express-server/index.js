/**
 * Long-running entry point (local dev and always-on hosts).
 *
 * Serverless deployments import `app.js` directly via `api/index.js` — they
 * have no persistent process to listen on and no boot phase to warm, so
 * everything below is deliberately outside the app itself.
 */
import 'dotenv/config';

import app from './app.js';
import { connectDb, isDbConnected } from './db.js';
import { ensureMorphologyStore } from './lib/morphologyStore.js';
import { ensureCorpus } from './lib/quranCorpus.js';
import { RULES } from './lib/ruleCatalog.js';
import { ensureTranslationStore } from './lib/translations.js';

const PORT = Number(process.env.PORT) || 3000;

async function warmCaches() {
  const startedAt = Date.now();
  await Promise.all([ensureMorphologyStore(), ensureTranslationStore()]);
  // The phrase index folds the segment store into words, so it goes second.
  await ensureCorpus();
  console.log(`[warmup] caches ready in ${Date.now() - startedAt}ms`);
}

/**
 * Compute every lesson once so no reader is the one who pays for it. Goes
 * through the HTTP stack rather than calling routes directly, so the payloads
 * land in the response cache exactly as a client would receive them.
 *
 * Off by default in development, where nodemon restarts constantly; set
 * WARM_LESSON_CACHE=1 to force it either way.
 */
async function warmLessonCache() {
  const endpoints = RULES.filter(
    (rule) => rule.status === 'available' && rule.endpoint
  ).map((rule) => rule.endpoint);

  const startedAt = Date.now();
  let warmed = 0;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}${endpoint}`);
      await res.arrayBuffer();
      if (res.ok) warmed += 1;
    } catch {
      // A lesson that fails to warm is simply a cache miss for its first reader.
    }
  }

  console.log(
    `[warmup] precomputed ${warmed}/${endpoints.length} lessons in ` +
      `${Date.now() - startedAt}ms`
  );
}

function shouldWarmLessons() {
  if (process.env.WARM_LESSON_CACHE === '1') return true;
  if (process.env.WARM_LESSON_CACHE === '0') return false;
  return process.env.NODE_ENV === 'production';
}

async function main() {
  try {
    await connectDb();
  } catch (err) {
    console.error('[db] Failed to connect:', err.message);
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Saahibi API listening on http://localhost:${PORT}`);

    // Warm the in-memory corpus, translations and word/phrase index so the
    // first lesson request doesn't pay for them. Requests that arrive during
    // the load wait on the same promises.
    if (!isDbConnected()) return;
    warmCaches()
      .then(() => (shouldWarmLessons() ? warmLessonCache() : undefined))
      .catch((err) => {
        console.error('[warmup] Failed:', err.message);
      });
  });
}

main();
