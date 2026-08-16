import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import { useFonts } from 'expo-font';
import { PostHogProvider, usePostHog } from 'posthog-react-native';

import CheatSheetPicker from './components/CheatSheetPicker';
import CheatSheetViewer from './components/CheatSheetViewer';
import FeedbackCoachmark from './components/FeedbackCoachmark';
import FeedbackModal from './components/FeedbackModal';
import HubTabBar from './components/HubTabBar';
import { getChapterForRule, getNextLessonKey } from './data/chapters';
import { CHEAT_SHEETS } from './data/cheatSheets';
import { getRuleByKey } from './data/rules';
import ChapterScreen from './screens/ChapterScreen';
import CheatSheetsScreen from './screens/CheatSheetsScreen';
import HomeScreen from './screens/HomeScreen';
import LessonIntroScreen from './screens/LessonIntroScreen';
import MawsufSifahScreen from './screens/MawsufSifahScreen';
import RuleExamplesScreen from './screens/RuleExamplesScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import { COLORS, FONTS, RADII } from './theme';
import { getApiBaseUrl } from './utils/api';
import {
  identifyBetaUser,
  loadBetaProfile,
  saveBetaProfile,
} from './utils/betaProfile';
import {
  getHiddenChapterKeys,
  getHiddenRuleKeys,
  refreshContentVisibility,
} from './utils/contentVisibility';
import { initCurriculum } from './utils/curriculum';
import {
  loadFeedbackCoachmarkSeen,
  saveFeedbackCoachmarkSeen,
} from './utils/feedbackCoachmark';
import {
  POSTHOG_API_KEY,
  posthogOptions,
  screenAnalytics,
} from './utils/posthog';
import { clearRuleExamplesCache } from './utils/ruleExamples';

export { getApiBaseUrl };

function sameKeys(a, b) {
  if (a.size !== b.size) return false;
  for (const key of a) if (!b.has(key)) return false;
  return true;
}

function HeaderButton({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerButton,
        pressed && styles.headerButtonPressed,
      ]}
      hitSlop={8}
    >
      <Text style={styles.headerButtonText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function AppHeader({ title, left, right }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{left}</View>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={[styles.headerSide, styles.headerSideRight]}>{right}</View>
    </View>
  );
}

function UnknownRuleScreen({ ruleKey, onBack }) {
  return (
    <View style={styles.screenBody}>
      <AppHeader
        title="Unknown lesson"
        left={<HeaderButton label="← Back" onPress={onBack} />}
      />
      <View style={styles.centered}>
        <Text style={styles.empty}>Lesson "{ruleKey}" not found.</Text>
      </View>
    </View>
  );
}

function PendingRuleScreen({ rule, onBack }) {
  return (
    <View style={styles.screenBody}>
      <AppHeader
        title={rule.simpleTitle ?? rule.title}
        left={<HeaderButton label="← Back" onPress={onBack} />}
      />
      <View style={styles.centered}>
        <Text style={styles.empty}>Coming soon.</Text>
        <Text style={styles.hint}>{rule.rule}</Text>
      </View>
    </View>
  );
}

/**
 * Navigation is a simple string state machine:
 *   'welcome' → 'home' | 'cheatsheets' → 'chapter:<chapterKey>' → 'lesson:<ruleKey>' → 'examples:<ruleKey>'
 */
function AppContent() {
  const posthog = usePostHog();
  const [profileReady, setProfileReady] = useState(false);
  const [betaProfile, setBetaProfile] = useState(null);
  const [coachmarkReady, setCoachmarkReady] = useState(false);
  const [showFeedbackCoachmark, setShowFeedbackCoachmark] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [screen, setScreen] = useState('welcome');
  const [libraryReturnScreen, setLibraryReturnScreen] = useState('home');
  const [openSheet, setOpenSheet] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hiddenRuleKeys, setHiddenRuleKeys] = useState(() => getHiddenRuleKeys());
  const [hiddenChapterKeys, setHiddenChapterKeys] = useState(() =>
    getHiddenChapterKeys()
  );
  const [curriculumVersion, setCurriculumVersion] = useState(0);
  const [fontsLoaded, fontError] = useFonts({
    [FONTS.arabic]: require('./assets/fonts/UthmanicHafs_V22.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      console.warn('[fonts] failed to load:', fontError?.message || fontError);
    }
  }, [fontError]);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((e) => {
      console.warn('[audio] setAudioModeAsync failed:', e?.message || e);
    });
  }, []);

  // The lesson manifest lives on the server so content can change without an
  // app release. Screens render from the bundled snapshot meanwhile, so this
  // only ever needs to trigger a re-render once a newer copy is in place.
  useEffect(() => {
    let cancelled = false;
    initCurriculum().then((changed) => {
      if (!cancelled && changed) setCurriculumVersion((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore a saved beta profile (or keep the welcome gate).
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadBetaProfile(), loadFeedbackCoachmarkSeen()]).then(
      ([profile, coachmarkSeen]) => {
        if (cancelled) return;
        if (profile) {
          setBetaProfile(profile);
          setScreen('home');
          setShowFeedbackCoachmark(!coachmarkSeen);
        }
        setCoachmarkReady(true);
        setProfileReady(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Tag every event so website vs app is easy to filter in the shared project.
  useEffect(() => {
    if (!posthog) return;
    posthog.register({ product: 'saahibi-app' });
  }, [posthog]);

  // Identify once PostHog is ready and we know who the tester is.
  useEffect(() => {
    if (!posthog || !betaProfile) return;
    identifyBetaUser(posthog, betaProfile);
  }, [posthog, betaProfile]);

  // Manual $screen events — this app doesn't use React Navigation.
  useEffect(() => {
    if (!posthog || !profileReady || !coachmarkReady) return;
    const analyticsScreen =
      showFeedbackCoachmark && screen === 'home'
        ? 'feedback-coachmark'
        : screen;
    const { name, properties } = screenAnalytics(analyticsScreen);
    posthog.screen(name, properties);
  }, [posthog, screen, profileReady, coachmarkReady, showFeedbackCoachmark]);

  useEffect(() => {
    if (!profileReady || !betaProfile) return;
    let cancelled = false;
    refreshContentVisibility().then(({ hiddenRuleKeys: rules, hiddenChapterKeys: chapters }) => {
      if (cancelled) return;
      // Reuse the existing Sets when nothing moved, so navigating between
      // screens doesn't hand every child a new identity.
      setHiddenRuleKeys((current) =>
        sameKeys(current, rules) ? current : new Set(rules)
      );
      setHiddenChapterKeys((current) =>
        sameKeys(current, chapters) ? current : new Set(chapters)
      );
    });
    return () => {
      cancelled = true;
    };
  }, [screen, profileReady, betaProfile]);

  // Cached lesson payloads were filtered with whatever denylist was in force
  // when they were fetched, so an admin change makes them stale. A new
  // curriculum can also repoint a lesson at a different endpoint.
  const visibilitySignature = `${curriculumVersion}|${[...hiddenRuleKeys]
    .sort()
    .join()}|${[...hiddenChapterKeys].sort().join()}`;
  useEffect(() => {
    clearRuleExamplesCache();
  }, [visibilitySignature]);

  const handleWelcomeContinue = useCallback(async ({ name, email }) => {
    try {
      const profile = await saveBetaProfile({ name, email });
      setBetaProfile(profile);
      setScreen('home');
      const coachmarkSeen = await loadFeedbackCoachmarkSeen();
      setShowFeedbackCoachmark(!coachmarkSeen);
    } catch (e) {
      console.warn('[welcome] saveBetaProfile failed:', e?.message || e);
      throw e;
    }
  }, []);

  const dismissFeedbackCoachmark = useCallback(async () => {
    try {
      await saveFeedbackCoachmarkSeen();
    } catch (e) {
      console.warn('[coachmark] save failed:', e?.message || e);
    }
    setShowFeedbackCoachmark(false);
  }, []);

  const submitFeedback = useCallback(
    async (message) => {
      if (!posthog) {
        throw new Error('Analytics unavailable');
      }
      const { name, properties } = screenAnalytics(screen);
      posthog.capture('feedback_submitted', {
        message,
        screen: name,
        ...(properties || {}),
      });
    },
    [posthog, screen]
  );

  const goHome = useCallback(() => setScreen('home'), []);
  const goToChapterOf = useCallback((ruleKey) => {
    const chapter = getChapterForRule(ruleKey);
    setScreen(chapter ? `chapter:${chapter.key}` : 'home');
  }, []);

  const openCheatSheets = useCallback(() => {
    setLibraryReturnScreen((current) =>
      screen === 'cheatsheets' ? current : screen
    );
    setScreen('cheatsheets');
  }, [screen]);

  const closeCheatSheets = useCallback(() => {
    setScreen(libraryReturnScreen || 'home');
  }, [libraryReturnScreen]);

  const expandSheet = useCallback((sheet) => {
    if (!sheet) return;
    setOpenSheet(sheet);
    setPickerOpen(false);
  }, []);

  const closeSheet = useCallback(() => {
    setOpenSheet(null);
  }, []);

  const openSheetPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  // Don't block the whole app on the Arabic font — if it fails or hangs on
  // Android, returning null leaves a permanent blank white screen. Welcome /
  // home don't need it; Arabic screens fall back until it loads.
  if (!profileReady || !coachmarkReady) {
    return (
      <View style={styles.appRoot}>
        <StatusBar style="dark" />
      </View>
    );
  }

  let body;

  if (!betaProfile) {
    body = <WelcomeScreen onContinue={handleWelcomeContinue} />;
  } else if (screen.startsWith('chapter:')) {
    const chapterKey = screen.slice('chapter:'.length);
    body = (
      <ChapterScreen
        chapterKey={chapterKey}
        hiddenRuleKeys={hiddenRuleKeys}
        onOpenLesson={(ruleKey) => setScreen(`lesson:${ruleKey}`)}
        header={
          <AppHeader
            title="Chapter"
            left={<HeaderButton label="← Home" onPress={goHome} />}
          />
        }
      />
    );
  } else if (screen.startsWith('lesson:')) {
    const ruleKey = screen.slice('lesson:'.length);
    const rule = getRuleByKey(ruleKey);
    const onBack = () => goToChapterOf(ruleKey);

    if (!rule) {
      body = (
        <UnknownRuleScreen
          ruleKey={ruleKey}
          onBack={goHome}
        />
      );
    } else {
      body = (
        <LessonIntroScreen
          rule={rule}
          onStartLesson={() => setScreen(`examples:${ruleKey}`)}
          onCheatSheets={openSheetPicker}
          header={
            <AppHeader
              title="Lesson"
              left={<HeaderButton label="← Back" onPress={onBack} />}
            />
          }
        />
      );
    }
  } else if (screen.startsWith('examples:')) {
    const ruleKey = screen.slice('examples:'.length);
    const rule = getRuleByKey(ruleKey);
    const onBack = () => goToChapterOf(ruleKey);

    if (!rule) {
      body = (
        <UnknownRuleScreen
          ruleKey={ruleKey}
          onBack={goHome}
        />
      );
    } else if (rule.status !== 'available') {
      body = (
        <PendingRuleScreen
          rule={rule}
          onBack={onBack}
        />
      );
    } else {
      const nextKey = getNextLessonKey(
        ruleKey,
        hiddenRuleKeys,
        hiddenChapterKeys
      );
      const onNextLesson = nextKey
        ? () => setScreen(`lesson:${nextKey}`)
        : null;
      const nextRule = nextKey ? getRuleByKey(nextKey) : null;
      const nextEndpoint =
        nextRule?.status === 'available' ? nextRule.endpoint : null;
      const header = (
        <AppHeader
          title={rule.simpleTitle ?? rule.title}
          left={<HeaderButton label="← Back" onPress={onBack} />}
        />
      );
      // Keyed by rule so moving between lessons starts a screen from scratch
      // instead of reusing the previous lesson's scroll and reveal position.
      body =
        rule.screenType === 'mawsuf-sifah' ? (
          <MawsufSifahScreen
            key={ruleKey}
            rule={rule}
            header={header}
            onNextLesson={onNextLesson}
            nextEndpoint={nextEndpoint}
            onCheatSheets={openSheetPicker}
          />
        ) : (
          <RuleExamplesScreen
            key={ruleKey}
            rule={rule}
            header={header}
            onNextLesson={onNextLesson}
            nextEndpoint={nextEndpoint}
            onCheatSheets={openSheetPicker}
          />
        );
    }
  } else if (screen === 'cheatsheets') {
    const fromHub = libraryReturnScreen === 'home';
    body = (
      <CheatSheetsScreen
        onBack={fromHub ? null : closeCheatSheets}
        onOpenSheet={expandSheet}
      />
    );
  } else {
    body = (
      <HomeScreen
        onNavigate={setScreen}
        hiddenRuleKeys={hiddenRuleKeys}
        hiddenChapterKeys={hiddenChapterKeys}
      />
    );
  }

  const coachmarkVisible =
    Boolean(betaProfile) && showFeedbackCoachmark && screen === 'home';

  const isHub = screen === 'home' || screen === 'cheatsheets';

  return (
    <View style={styles.appRoot}>
      <StatusBar style="dark" />
      <View style={styles.bodySlot}>{body}</View>
      {betaProfile && isHub ? (
        <HubTabBar
          active={screen === 'cheatsheets' ? 'cheatsheets' : 'home'}
          onChapters={goHome}
          onCheatSheets={openCheatSheets}
        />
      ) : null}
      {betaProfile && !coachmarkVisible ? (
        <Pressable
          onPress={() => setFeedbackOpen(true)}
          style={({ pressed }) => [
            styles.feedbackFab,
            pressed && styles.feedbackFabPressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Send feedback"
        >
          <Text style={styles.feedbackFabText}>Feedback</Text>
        </Pressable>
      ) : null}
      {betaProfile ? (
        <FeedbackModal
          visible={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          onSubmit={submitFeedback}
        />
      ) : null}
      {coachmarkVisible ? (
        <FeedbackCoachmark onDismiss={dismissFeedbackCoachmark} />
      ) : null}
      {betaProfile ? (
        <CheatSheetPicker
          visible={pickerOpen}
          sheets={CHEAT_SHEETS}
          onSelect={expandSheet}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
      <CheatSheetViewer
        sheet={openSheet}
        visible={Boolean(openSheet)}
        onClose={closeSheet}
      />
    </View>
  );
}

export default function App() {
  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={posthogOptions}
      autocapture={{
        // No React Navigation — screens are tracked manually in AppContent.
        captureScreens: false,
        captureTouches: false,
      }}
    >
      <AppContent />
    </PostHogProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bodySlot: {
    flex: 1,
  },
  feedbackFab: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 56 : 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceDeep,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 20,
  },
  feedbackFabPressed: {
    opacity: 0.85,
  },
  feedbackFabText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  screenBody: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 52,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerSide: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    minHeight: 36,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  headerTitleWrap: {
    flexShrink: 1,
    maxWidth: '52%',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  headerButtonPressed: {
    opacity: 0.65,
  },
  headerButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  empty: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
