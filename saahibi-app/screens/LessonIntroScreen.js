import { useEffect } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getLessonIntro } from '../data/rules';
import { getLessonNumber } from '../data/chapters';
import { COLORS, FONTS, RADII } from '../theme';
import { forArabicDisplay } from '../utils/arabicDisplay';
import {
  joinRunsForShaping,
  splitByHighlights,
} from '../utils/arabicSegments';
import { prefetchRuleExamples } from '../utils/ruleExamples';
import { formatAyahReference } from '../utils/surahNames';
import CheatSheetsButton from '../components/CheatSheetsButton';
import CurriculumTitle from '../components/CurriculumTitle';
import PatternCard from '../components/PatternCard';

/** Render the ayah with the highlighted word(s) washed in gold. */
function HighlightedAyah({ arabic, highlight, highlights }) {
  const terms =
    highlights ?? (highlight != null && highlight !== '' ? [highlight] : []);
  const parts = splitByHighlights(arabic, terms);
  const display = forArabicDisplay(arabic) ?? arabic;

  if (!parts) {
    return <Text style={styles.ayah}>{display}</Text>;
  }

  // Nested Text backgroundColor is unreliable on Android (and can disturb
  // mark attachment on iOS). Paint the gold wash on an overlay layer instead,
  // matching PatternCard — base glyphs stay put; only the highlight run is lit.
  const isAndroid = Platform.OS === 'android';
  const runs = isAndroid ? joinRunsForShaping(parts) : parts;

  return (
    <View>
      <Text style={styles.ayah}>
        {isAndroid
          ? runs.map((run, i) => <Text key={i}>{run.text}</Text>)
          : display}
      </Text>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Text style={styles.ayah}>
          {runs.map((run, i) => (
            <Text
              key={i}
              style={
                run.highlighted ? styles.ayahHighlightLit : styles.ayahHighlightStatic
              }
            >
              {run.text}
            </Text>
          ))}
        </Text>
      </View>
    </View>
  );
}

function AyahCard({
  arabic,
  translation,
  reference,
  highlight,
  highlights,
  label,
  compact,
}) {
  return (
    <View style={[styles.ayahCard, compact && styles.ayahCardCompact]}>
      {label ? <Text style={styles.ayahLabel}>{label}</Text> : null}
      <HighlightedAyah
        arabic={arabic}
        highlight={highlight}
        highlights={highlights}
      />
      {translation ? (
        <Text
          style={[
            styles.ayahTranslation,
            compact && styles.ayahTranslationCompact,
          ]}
        >
          '{translation}'
        </Text>
      ) : null}
      {reference ? (
        <Text style={styles.ayahReference}>
          {formatAyahReference(reference.surahId, reference.ayahNo)}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Opens a lesson: a curated ayah with the lesson's pattern highlighted, its
 * translation, the pattern card, then an "Examples" button that leads to the
 * examples screen.
 *
 * Supports a single ayah (`arabic` / `reference` / …) or multiple via
 * `intro.ayahs[]` (e.g. three i'rab states of the same word).
 */
export default function LessonIntroScreen({
  rule,
  header,
  onStartLesson,
  onCheatSheets,
}) {
  const intro = getLessonIntro(rule.key);
  const lessonNumber = getLessonNumber(rule.key);

  // Load the examples while the intro is being read, so tapping "Examples →"
  // lands on a populated screen.
  useEffect(() => {
    if (rule.status === 'available' && rule.endpoint) {
      prefetchRuleExamples(rule.endpoint);
    }
  }, [rule.status, rule.endpoint]);

  const ayahEntries =
    Array.isArray(intro?.ayahs) && intro.ayahs.length > 0
      ? intro.ayahs
      : intro
        ? [
            {
              arabic: intro.arabic,
              translation: intro.translation,
              reference: intro.reference,
              highlight: intro.highlight,
              highlights: intro.highlights,
            },
          ]
        : [];
  const multiAyah = ayahEntries.length > 1;

  return (
    <View style={styles.body}>
      {header}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {lessonNumber ? (
          <Text style={styles.kicker}>Lesson {lessonNumber}</Text>
        ) : null}
        <View style={styles.titleBlock}>
          <CurriculumTitle
            simpleTitle={rule.simpleTitle}
            titleArabic={rule.titleArabic}
            title={rule.title}
          />
        </View>

        {intro ? (
          <>
            {ayahEntries.map((ayah, index) => (
              <AyahCard
                key={`${ayah.reference?.surahId ?? 'x'}-${ayah.reference?.ayahNo ?? index}-${ayah.highlight ?? index}`}
                arabic={ayah.arabic}
                translation={ayah.translation}
                reference={ayah.reference}
                highlight={ayah.highlight}
                highlights={ayah.highlights}
                label={ayah.label}
                compact={multiAyah}
              />
            ))}
            <View style={styles.ruleCardWrap}>
              <PatternCard
                intro={intro}
                body={rule.rule}
                ruleKey={rule.ruleTtsKey ?? rule.key}
                defaultExpanded
                autoPlay
              />
            </View>
          </>
        ) : (
          <PatternCard
            body={rule.rule}
            ruleKey={rule.ruleTtsKey ?? rule.key}
            defaultExpanded
            autoPlay
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={onStartLesson}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.startButtonPressed,
          ]}
        >
          <Text style={styles.startButtonText}>Examples →</Text>
        </Pressable>
        {onCheatSheets ? (
          <View style={styles.footerSide}>
            <CheatSheetsButton onPress={onCheatSheets} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 52,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  kicker: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  titleBlock: {
    marginBottom: 20,
  },
  ayahCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  ayahCardCompact: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  ayahLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 12,
  },
  ayah: {
    fontFamily: FONTS.arabic,
    color: COLORS.primary,
    fontSize: 32,
    lineHeight: 60,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  // Overlay styles for HighlightedAyah — lit paints the wash; static keeps
  // non-highlight glyphs invisible so the base layer shows through.
  ayahHighlightLit: {
    backgroundColor: COLORS.accentSoft,
  },
  ayahHighlightStatic: {
    color: 'transparent',
  },
  ayahTranslation: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 18,
  },
  ayahTranslationCompact: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  ayahReference: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  ruleCardWrap: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 8,
  },
  footerSide: {
    flexBasis: '38%',
    flexShrink: 0,
    justifyContent: 'center',
  },
  startButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceDeep,
    borderRadius: RADII.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  startButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  startButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
