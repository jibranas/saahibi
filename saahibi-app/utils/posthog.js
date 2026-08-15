/**
 * PostHog config shared with saahibi-website (same project token/host).
 * Set EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN and EXPO_PUBLIC_POSTHOG_HOST in .env
 */
export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN || '';
export const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export const posthogOptions = {
  host: POSTHOG_HOST,
  debug: __DEV__,
  // Skip capture when the project token is missing (local misconfig).
  disabled: !POSTHOG_API_KEY,
  // Requires @posthog/react-native-plugin + a native/dev build (not Expo Go).
  // Also enable "Record user sessions" in PostHog project settings.
  enableSessionReplay: true,
  sessionReplayConfig: {
    // Lesson UI must be readable in Android replays. RN treats this as
    // "mask all Text", not just TextInputs — Welcome/Feedback fields are
    // masked separately with PostHogMaskView.
    maskAllTextInputs: false,
    maskAllImages: true,
    captureLog: true,
    captureNetworkTelemetry: true,
    // Record all sessions while validating; dial sampleRate down later if needed.
    sampleRate: undefined,
    throttleDelayMs: 1000,
  },
};

/**
 * Map the app's string navigation state to a PostHog screen name + props.
 * Navigation is a simple state machine, not React Navigation, so screens
 * are tracked manually via posthog.screen().
 */
export function screenAnalytics(screen) {
  if (screen === 'welcome') {
    return { name: 'Welcome', properties: undefined };
  }
  if (screen === 'feedback-coachmark') {
    return { name: 'FeedbackCoachmark', properties: undefined };
  }
  if (screen === 'home') {
    return { name: 'Home', properties: undefined };
  }
  if (screen === 'cheatsheets') {
    return { name: 'CheatSheets', properties: undefined };
  }
  if (screen.startsWith('chapter:')) {
    return {
      name: 'Chapter',
      properties: { chapter_key: screen.slice('chapter:'.length) },
    };
  }
  if (screen.startsWith('lesson:')) {
    return {
      name: 'LessonIntro',
      properties: { rule_key: screen.slice('lesson:'.length) },
    };
  }
  if (screen.startsWith('examples:')) {
    return {
      name: 'RuleExamples',
      properties: { rule_key: screen.slice('examples:'.length) },
    };
  }
  return { name: screen, properties: undefined };
}
