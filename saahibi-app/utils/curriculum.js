/**
 * Keeps the lesson manifest in sync with the server.
 *
 * The app renders from the bundled snapshot immediately, so this never gates
 * first paint. It layers on top: the last curriculum we stored, then whatever
 * the server is currently serving. Every failure path leaves the previous
 * manifest in place, so a dead network means stale content, never no content.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { applyCurriculum } from '../data/chapters';
import snapshot from '../data/curriculumSnapshot.json';
import { getApiBaseUrl } from './api';

const STORAGE_KEY = 'saahibi.curriculum.v1';

let activeVersion = snapshot.version ?? null;
let inflight = null;

export function getCurriculumVersion() {
  return activeVersion;
}

/**
 * Apply the curriculum saved on the last run, so a launch with no network
 * still shows the newest content this device has seen rather than reverting
 * to whatever shipped in the binary.
 */
export async function loadStoredCurriculum() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const stored = JSON.parse(raw);
    if (!stored?.version || stored.version === activeVersion) return false;
    if (!applyCurriculum(stored)) return false;

    activeVersion = stored.version;
    return true;
  } catch (err) {
    console.warn(
      '[curriculum] stored copy unusable; keeping current:',
      err?.message || err
    );
    return false;
  }
}

/**
 * Fetch the server manifest and adopt it when it differs. Resolves to whether
 * anything actually changed, so callers can skip a re-render. Concurrent
 * callers share one request.
 */
export async function refreshCurriculum() {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/curriculum`, {
        headers: activeVersion
          ? { 'If-None-Match': `"${activeVersion}"` }
          : undefined,
      });

      if (res.status === 304) return false;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data?.version || data.version === activeVersion) return false;
      if (!applyCurriculum(data)) {
        throw new Error('payload missing rules or chapters');
      }

      activeVersion = data.version;
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: data.version,
          rules: data.rules,
          chapters: data.chapters,
        })
      );
      return true;
    } catch (err) {
      console.warn(
        '[curriculum] refresh failed; keeping current:',
        err?.message || err
      );
      return false;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Stored copy first (fast, offline-safe), then the server. Resolves to whether
 * the manifest changed at any point.
 */
export async function initCurriculum() {
  const fromStorage = await loadStoredCurriculum();
  const fromServer = await refreshCurriculum();
  return fromStorage || fromServer;
}
