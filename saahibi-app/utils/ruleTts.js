import { createAudioPlayer } from 'expo-audio';

import { getApiBaseUrl } from './api';
import { stopWordAudio } from './wordAudio';

const PLAYBACK_TIMEOUT_MS = 20000;

let sharedPlayer = null;
let playToken = 0;

function getPlayer() {
  if (!sharedPlayer) {
    sharedPlayer = createAudioPlayer(null);
  }
  return sharedPlayer;
}

async function fetchVersion(ruleKey, variant = 'full') {
  const res = await fetch(`${getApiBaseUrl()}/api/rule-tts/versions`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`rule-tts versions HTTP ${res.status}`);
  const data = await res.json();
  const entry = data?.versions?.[ruleKey];
  if (typeof entry === 'string') return entry;
  return entry?.[variant] ?? entry?.full ?? null;
}

export function buildRuleTtsUrl(ruleKey, version = null, variant = 'full') {
  if (!ruleKey) return null;
  const base = `${getApiBaseUrl()}/api/rule-tts/${encodeURIComponent(ruleKey)}`;
  const params = new URLSearchParams();
  if (version) params.set('v', version);
  if (variant === 'summary') params.set('variant', 'summary');
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function stopRuleTts() {
  playToken += 1;
  if (!sharedPlayer) return;
  try {
    sharedPlayer.pause();
  } catch {}
}

export async function playRuleTts(ruleKey, variant = 'full') {
  if (!ruleKey) return false;

  stopWordAudio();
  const token = ++playToken;

  let uri = buildRuleTtsUrl(ruleKey, null, variant);
  try {
    const version = await fetchVersion(ruleKey, variant);
    if (token !== playToken) return false;
    uri = buildRuleTtsUrl(ruleKey, version, variant);
  } catch (e) {
    console.warn('[rule-tts] versions fetch failed:', e?.message || e);
  }

  if (!uri) return false;

  return new Promise((resolve) => {
    try {
      const player = getPlayer();
      let settled = false;
      let subscription = null;

      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (subscription?.remove) subscription.remove();
        resolve(ok);
      };

      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (token !== playToken) {
          finish(false);
          return;
        }
        if (status.didJustFinish) {
          finish(true);
        }
      });

      setTimeout(() => finish(false), PLAYBACK_TIMEOUT_MS);

      try {
        player.pause();
      } catch {}
      try {
        player.seekTo(0);
      } catch {}

      player.replace({ uri });
      player.play();
    } catch (e) {
      console.warn('[rule-tts] playback failed:', e?.message || e);
      resolve(false);
    }
  });
}
