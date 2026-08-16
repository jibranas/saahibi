import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Router } from 'express';
import OpenAI from 'openai';

import { getRuleTtsKeys, getRuleTtsText } from '../lib/ruleCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serverless deploy bundles are read-only apart from /tmp, and that space is
// per-instance and ephemeral — a cold instance re-synthesizes rather than
// reusing a neighbour's MP3.
const CACHE_DIR = process.env.VERCEL
  ? path.join('/tmp', 'saahibi-rule-tts')
  : path.resolve(__dirname, '..', 'cache', 'rule-tts');
const MODEL = 'gpt-4o-mini-tts';
const VOICE = 'alloy';

let cacheDirReady = false;

/**
 * Created on demand rather than at import time: a failure here must not take
 * down the whole server, and on serverless /tmp starts empty per instance.
 */
function ensureCacheDir() {
  if (cacheDirReady) return true;
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    cacheDirReady = true;
  } catch (err) {
    console.warn('[rule-tts] cache dir unavailable:', err?.message || err);
  }
  return cacheDirReady;
}

let openaiClient = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function cacheKey(ruleKey, text) {
  return crypto
    .createHash('sha256')
    .update(`${MODEL}|${VOICE}|${ruleKey}|${text}`)
    .digest('hex');
}

/** Short content fingerprint for client URL cache-busting. */
function contentVersion(ruleKey, text) {
  return cacheKey(ruleKey, text).slice(0, 16);
}

function setMp3Headers(res, byteLength, hash) {
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Length', String(byteLength));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('ETag', `"${hash}"`);
}

function sendMp3(res, filePath, hash) {
  const stat = fs.statSync(filePath);
  setMp3Headers(res, stat.size, hash);
  fs.createReadStream(filePath).pipe(res);
}

function sendMp3Buffer(res, buffer, hash) {
  setMp3Headers(res, buffer.length, hash);
  res.end(buffer);
}

/** Cache the MP3 atomically. Returns whether the file is now on disk. */
function writeCachedMp3(filePath, buffer) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (err) {
    console.error('[rule-tts] Cache write failed:', err?.message || err);
    try {
      fs.rmSync(tmpPath, { force: true });
    } catch {}
    return false;
  }
}

const router = Router();

/**
 * Content versions keyed by rule. Clients append `?v=<version>` to the audio
 * URL so a script change produces a new URI and bypasses stale HTTP caches.
 */
router.get('/versions', (req, res) => {
  const versions = {};
  for (const key of getRuleTtsKeys()) {
    const full = getRuleTtsText(key, 'full');
    const summary = getRuleTtsText(key, 'summary');
    const entry = {};
    if (full) entry.full = contentVersion(key, full);
    if (summary && summary !== full) {
      entry.summary = contentVersion(key, summary);
    }
    if (Object.keys(entry).length) versions[key] = entry;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ versions });
});

router.get('/:ruleKey', async (req, res, next) => {
  try {
    const ruleKey = String(req.params.ruleKey || '');
    const variant = req.query.variant === 'summary' ? 'summary' : 'full';
    const text = getRuleTtsText(ruleKey, variant);
    if (!text) {
      res.status(404).json({ error: 'Rule TTS key not found' });
      return;
    }

    const hash = cacheKey(ruleKey, text);
    const version = contentVersion(ruleKey, text);
    // Reject stale cache-busted URLs so clients refetch /versions.
    if (req.query.v != null && String(req.query.v) !== version) {
      res.status(409).json({
        error: 'Rule TTS version mismatch',
        version,
      });
      return;
    }

    const cacheable = ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${hash}.mp3`);

    if (cacheable && fs.existsSync(filePath)) {
      sendMp3(res, filePath, hash);
      return;
    }

    let client;
    try {
      client = getClient();
    } catch (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    let buffer;
    try {
      const speech = await client.audio.speech.create({
        model: MODEL,
        voice: VOICE,
        input: text,
        response_format: 'mp3',
      });
      buffer = Buffer.from(await speech.arrayBuffer());
    } catch (err) {
      console.error('[rule-tts] OpenAI error:', err?.message || err);
      res.status(502).json({ error: 'Upstream rule TTS request failed' });
      return;
    }

    // Serving from the buffer keeps the request working when the cache is
    // unwritable; the caller just pays for synthesis again next time.
    if (cacheable && writeCachedMp3(filePath, buffer)) {
      sendMp3(res, filePath, hash);
      return;
    }

    sendMp3Buffer(res, buffer, hash);
  } catch (err) {
    next(err);
  }
});

export default router;
