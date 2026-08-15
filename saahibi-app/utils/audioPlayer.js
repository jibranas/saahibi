import { createAudioPlayer } from 'expo-audio';

/**
 * One shared audio player for the whole app.
 *
 * Word-by-word playback and full-ayah recitation go through here so starting
 * either one cancels whatever was already playing, instead of the two talking
 * over each other.
 *
 * Every play acquires a token; a sequence keeps its token across items so it
 * can tell whether something newer has taken over and bail out.
 */

const PLAYBACK_TIMEOUT_MS = 30000;

let sharedPlayer = null;
let playToken = 0;

function getPlayer() {
  if (!sharedPlayer) {
    sharedPlayer = createAudioPlayer(null);
  }
  return sharedPlayer;
}

/** Claim playback, invalidating any in-flight play or sequence. */
export function acquireToken() {
  playToken += 1;
  return playToken;
}

export function isCurrentToken(token) {
  return token === playToken;
}

/** Stop whatever is playing and invalidate any running sequence. */
export function stopAudio() {
  playToken += 1;
  if (!sharedPlayer) return;
  try {
    sharedPlayer.pause();
  } catch {}
}

/**
 * Play one URL, resolving `true` when it finishes and `false` if it fails,
 * times out, or is superseded by a newer play.
 */
export function playUrlWithToken(uri, token) {
  if (!uri) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      const player = getPlayer();
      let settled = false;
      let subscription = null;
      let timer = null;

      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (subscription?.remove) subscription.remove();
        resolve(ok);
      };

      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (!isCurrentToken(token)) {
          finish(false);
          return;
        }
        if (status.didJustFinish) {
          finish(true);
        }
      });

      timer = setTimeout(() => finish(false), PLAYBACK_TIMEOUT_MS);

      try {
        player.pause();
      } catch {}
      try {
        player.seekTo(0);
      } catch {}

      player.replace({ uri });
      player.play();
    } catch (e) {
      console.warn('[audio] playback failed:', e?.message || e);
      resolve(false);
    }
  });
}

/** Play one URL, taking over from anything already playing. */
export function playUrl(uri) {
  return playUrlWithToken(uri, acquireToken());
}
