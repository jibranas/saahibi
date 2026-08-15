import { useEffect, useRef } from 'react';

import { getApiBaseUrl } from './api';
import {
  acquireToken,
  isCurrentToken,
  playUrlWithToken,
  stopAudio,
} from './audioPlayer';

const SEQUENCE_GAP_MS = 250;

function isValidWordRef(wordRef) {
  if (!wordRef) return false;
  return [wordRef.surahId, wordRef.ayahNo, wordRef.wordNo].every((value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0;
  });
}

function normalizeWordRef(wordRef) {
  return {
    surahId: Number(wordRef.surahId),
    ayahNo: Number(wordRef.ayahNo),
    wordNo: Number(wordRef.wordNo),
  };
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function buildWordAudioUrl(wordRef) {
  if (!isValidWordRef(wordRef)) return null;
  const { surahId, ayahNo, wordNo } = normalizeWordRef(wordRef);
  return `${getApiBaseUrl()}/api/word-audio/${surahId}/${ayahNo}/${wordNo}`;
}

export function stopWordAudio() {
  stopAudio();
}

export function playWordAudio(wordRef) {
  return playUrlWithToken(buildWordAudioUrl(wordRef), acquireToken());
}

export async function playWordAudioSequence(wordRefs) {
  const refs = Array.isArray(wordRefs) ? wordRefs.filter(isValidWordRef) : [];
  if (refs.length === 0) return;

  const sequenceToken = acquireToken();
  for (const ref of refs) {
    if (!isCurrentToken(sequenceToken)) return;
    await playUrlWithToken(buildWordAudioUrl(ref), sequenceToken);
    if (!isCurrentToken(sequenceToken)) return;
    await wait(SEQUENCE_GAP_MS);
  }
}

export function useAutoPlayWordAudio(wordRef, enabled = true) {
  const playedKeyRef = useRef(null);
  const key = isValidWordRef(wordRef)
    ? `${Number(wordRef.surahId)}:${Number(wordRef.ayahNo)}:${Number(wordRef.wordNo)}`
    : null;

  useEffect(() => {
    if (!enabled || !key || playedKeyRef.current === key) return;
    playedKeyRef.current = key;
    playWordAudio(wordRef);
  }, [enabled, key, wordRef]);
}
