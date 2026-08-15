import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@saahibi/beta_profile';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function isValidBetaProfile({ name, email }) {
  const trimmedName = String(name || '').trim();
  const normalizedEmail = normalizeEmail(email);
  return trimmedName.length > 0 && EMAIL_RE.test(normalizedEmail);
}

export async function loadBetaProfile() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidBetaProfile(parsed)) return null;
    return {
      name: String(parsed.name).trim(),
      email: normalizeEmail(parsed.email),
    };
  } catch {
    return null;
  }
}

export async function saveBetaProfile({ name, email }) {
  const profile = {
    name: String(name || '').trim(),
    email: normalizeEmail(email),
  };
  if (!isValidBetaProfile(profile)) {
    throw new Error('Invalid beta profile');
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

/** Attach the beta tester to PostHog so replays are contactable. */
export function identifyBetaUser(posthog, profile) {
  if (!posthog || !profile) return;
  const email = normalizeEmail(profile.email);
  const name = String(profile.name || '').trim();
  if (!email || !name) return;
  posthog.identify(email, {
    email,
    name,
    beta: true,
  });
}
