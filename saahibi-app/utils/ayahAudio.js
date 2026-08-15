import { playUrl, stopAudio } from './audioPlayer';

/**
 * Full-ayah recitation.
 *
 * Individual word audio is served from our own API, but a whole verse needs a
 * continuous recording, so it comes from the same CDN the HH Courses lessons
 * use. Playback shares the app's single player, so starting a verse stops any
 * word-by-word sequence already running.
 */

const AYAH_AUDIO_BASE = 'https://quranaudio.pages.dev/2';

function isValidAyahRef(ayahRef) {
  if (!ayahRef) return false;
  return [ayahRef.surahId, ayahRef.ayahNo].every((value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0;
  });
}

export function buildAyahAudioUrl(ayahRef) {
  if (!isValidAyahRef(ayahRef)) return null;
  const surahId = Number(ayahRef.surahId);
  const ayahNo = Number(ayahRef.ayahNo);
  return `${AYAH_AUDIO_BASE}/${surahId}_${ayahNo}.mp3`;
}

/** Resolves `true` once the verse finishes, `false` if it fails or is cut off. */
export function playAyahAudio(ayahRef) {
  const url = buildAyahAudioUrl(ayahRef);
  if (!url) return Promise.resolve(false);
  return playUrl(url);
}

export function stopAyahAudio() {
  stopAudio();
}
