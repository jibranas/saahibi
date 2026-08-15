import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, FONTS, RADII } from '../theme';
import { forArabicDisplay } from '../utils/arabicDisplay';
import {
  joinRunsForShaping,
  splitByPatternPart,
  widenMarkOnlyRuns,
} from '../utils/arabicSegments';
import { playRuleTts, stopRuleTts } from '../utils/ruleTts';

const FADE_DURATION = 900;
const HOLD_DURATION = 500;

function resolvePatterns(intro, patternless) {
  if (patternless) return [];
  if (Array.isArray(intro?.patterns) && intro.patterns.length > 0) {
    return intro.patterns
      .map((entry) => {
        const highlight = forArabicDisplay(entry?.highlight ?? null);
        if (!highlight) return null;
        return {
          highlight,
          patternPart: forArabicDisplay(entry?.patternPart ?? null),
          label: entry?.label ?? null,
        };
      })
      .filter(Boolean);
  }
  const highlight = forArabicDisplay(intro?.highlight ?? null);
  if (!highlight) return [];
  return [
    {
      highlight,
      patternPart: forArabicDisplay(intro?.patternPart ?? null),
      label: null,
    },
  ];
}

function PulsedPatternRow({
  highlight,
  patternPart,
  label,
  pulse,
  compact,
  inline,
  onPress,
}) {
  const runs =
    splitByPatternPart(highlight, patternPart) ?? [
      { text: highlight, isPattern: true },
    ];
  // Android shapes each nested Text on its own, so both layers are built from
  // the same joiner-padded runs — otherwise the gold wash drifts off the
  // letters it is meant to sit behind.
  const isAndroid = Platform.OS === 'android';
  const shapedRuns = isAndroid
    ? joinRunsForShaping(widenMarkOnlyRuns(runs))
    : runs;

  const patternTextStyle = [
    styles.patternText,
    compact && styles.patternTextCollapsed,
    inline && styles.patternTextInline,
    inline && compact && styles.patternTextInlineCollapsed,
  ];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        label
          ? `${label} pattern ${highlight}`
          : `Pattern ${highlight}`
      }
      style={[
        styles.patternRow,
        compact && styles.patternRowCollapsed,
        inline && styles.patternRowInline,
      ]}
    >
      {label ? (
        <Text
          style={[
            styles.patternLabel,
            compact && styles.patternLabelCollapsed,
            inline && styles.patternLabelInline,
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View>
        <Text style={patternTextStyle} numberOfLines={1} adjustsFontSizeToFit>
          {isAndroid
            ? shapedRuns.map((run, i) => <Text key={i}>{run.text}</Text>)
            : highlight}
        </Text>

        {/* Same glyphs at the same size so the layers register exactly.
            The surrounding letters are drawn transparent, leaving the
            base layer below them untouched — only the gold behind the
            pattern fades in and out. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: pulse }]}
          pointerEvents="none"
        >
          <Text style={patternTextStyle} numberOfLines={1} adjustsFontSizeToFit>
            {shapedRuns.map((run, i) => (
              <Text
                key={i}
                style={run.isPattern ? styles.lit : styles.static}
              >
                {run.text}
              </Text>
            ))}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

/**
 * "Look for this pattern" card: a gold wash pulses behind the letters carrying
 * the rule while the rest of the word stays put. The animation stays visible
 * even when collapsed so learners can keep the pattern in view while scrolling
 * examples; expanding reveals the written explanation.
 *
 * When `overlayDetails` is true (example screens), the explanation floats over
 * the list below instead of growing the card — so example cards keep a stable
 * size. When false (lesson intro), expanding pushes content down as usual.
 *
 * Lessons whose rule is about the whole word rather than an ending have no
 * `patternPart`; the wash covers the entire word for those.
 *
 * Multi-pattern intros pass `intro.patterns[]`; otherwise a single
 * `highlight` / `patternPart` is used.
 *
 * Controlled mode: pass `expanded` + `onToggleExpanded` from the parent.
 * Uncontrolled mode: omit both — the card manages its own open state,
 * defaulting to `defaultExpanded` (false by default).
 */
export default function PatternCard({
  intro,
  body,
  ruleKey,
  expanded: expandedProp,
  onToggleExpanded,
  defaultExpanded = false,
  overlayDetails = false,
  autoPlay = false,
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = expandedProp !== undefined;
  const expanded = isControlled ? expandedProp : internalExpanded;

  // Overlay mode stays compact so the in-flow height never changes.
  const compact = overlayDetails || !expanded;

  const patternless = intro?.patternless === true;
  const noticeSummary = patternless ? intro?.noticeSummary ?? null : null;
  // Short summary is for the collapsed examples-screen card only, not lesson intro.
  const showNoticeSummary = Boolean(noticeSummary && overlayDetails && compact);
  const patterns = resolvePatterns(intro, patternless);
  const hasPatterns = patterns.length > 0;
  const patternsInline = patterns.length > 1;
  const pulse = useRef(new Animated.Value(0)).current;
  const autoPlayedRef = useRef(false);
  const statusRef = useRef('idle');

  useEffect(() => {
    if (!hasPatterns) return undefined;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.delay(HOLD_DURATION),
        Animated.timing(pulse, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.delay(HOLD_DURATION),
      ])
    );
    loop.start();

    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [hasPatterns, pulse]);

  const toggleExpanded = useCallback(() => {
    if (isControlled) {
      onToggleExpanded?.();
    } else {
      setInternalExpanded((e) => !e);
    }
  }, [isControlled, onToggleExpanded]);

  const [status, setStatus] = useState('idle');
  statusRef.current = status;

  const startPlayback = useCallback(async () => {
    if (!ruleKey || statusRef.current === 'playing') return;
    setStatus('playing');
    const variant = showNoticeSummary ? 'summary' : 'full';
    const ok = await playRuleTts(ruleKey, variant);
    setStatus(ok ? 'done' : 'unavailable');
  }, [ruleKey, showNoticeSummary]);

  const playIntro = useCallback(
    (e) => {
      e.stopPropagation?.();
      startPlayback();
    },
    [startPlayback]
  );

  useEffect(() => {
    if (!autoPlay || !ruleKey || autoPlayedRef.current) return undefined;
    autoPlayedRef.current = true;
    startPlayback();
    return () => {
      stopRuleTts();
    };
  }, [autoPlay, ruleKey, startPlayback]);

  const statusLabel =
    status === 'playing'
      ? 'Playing explanation…'
      : status === 'unavailable'
      ? 'Explanation audio unavailable'
      : 'Tap ▶ to hear the explanation';

  const details = expanded ? (
    <>
      <Text style={[styles.body, overlayDetails && styles.bodyOverlay]}>
        {body}
      </Text>
      <Text style={styles.status}>{statusLabel}</Text>
    </>
  ) : null;

  return (
    <View style={[styles.shell, overlayDetails && styles.shellOverlay]}>
      <View
        style={[
          styles.card,
          compact ? styles.cardCollapsed : styles.cardExpanded,
        ]}
      >
        <Pressable
          onPress={toggleExpanded}
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? 'Hide pattern explanation' : 'Show pattern explanation'
          }
          style={styles.header}
        >
          <Text style={styles.kicker}>
            {patternless ? 'What to notice' : 'Look for this pattern'}
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={playIntro}
              hitSlop={10}
              accessibilityLabel="Play pattern explanation"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.playButton,
                compact && styles.playButtonCollapsed,
                pressed && styles.playButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.playGlyph,
                  compact && styles.playGlyphCollapsed,
                ]}
              >
                ▶
              </Text>
            </Pressable>
            <View
              style={[
                styles.expandChip,
                compact && styles.expandChipCollapsed,
                expanded ? styles.expandChipOpen : styles.expandChipClosed,
              ]}
            >
              <Text
                style={[
                  styles.expandChipText,
                  expanded
                    ? styles.expandChipTextOpen
                    : styles.expandChipTextClosed,
                ]}
              >
                {expanded ? 'Hide' : 'Details'}
              </Text>
            </View>
          </View>
        </Pressable>

        {hasPatterns ? (
          <View
            style={[
              styles.patternsBlock,
              patternsInline && styles.patternsBlockInline,
            ]}
          >
            {patterns.map((entry, index) => (
              <PulsedPatternRow
                key={`${entry.label ?? 'p'}-${entry.highlight}-${index}`}
                highlight={entry.highlight}
                patternPart={entry.patternPart}
                label={entry.label}
                pulse={pulse}
                compact={compact}
                inline={patternsInline}
                onPress={toggleExpanded}
              />
            ))}
          </View>
        ) : showNoticeSummary ? (
          <Pressable
            onPress={toggleExpanded}
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'Hide pattern explanation' : 'Show pattern explanation'
            }
            style={[styles.noticeRow, compact && styles.noticeRowCollapsed]}
          >
            <Text
              style={[
                styles.noticeSummary,
                compact && styles.noticeSummaryCollapsed,
              ]}
            >
              {noticeSummary}
            </Text>
          </Pressable>
        ) : null}

        {!overlayDetails ? details : null}
      </View>

      {overlayDetails && expanded ? (
        <View style={styles.detailsPanel}>{details}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
  },
  shellOverlay: {
    zIndex: 20,
    elevation: 20,
  },
  card: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  cardCollapsed: {
    borderColor: COLORS.accent,
    borderWidth: 1.5,
  },
  cardExpanded: {
    borderRadius: RADII.lg,
    padding: 16,
    marginBottom: 14,
  },
  detailsPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    marginTop: -6,
    zIndex: 21,
    elevation: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kicker: {
    flex: 1,
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patternsBlock: {
    marginTop: 4,
  },
  patternsBlockInline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 8,
  },
  patternRow: {
    marginTop: 10,
    marginBottom: 0,
  },
  patternRowCollapsed: {
    marginTop: 6,
  },
  patternRowInline: {
    flex: 1,
    marginTop: 0,
    alignItems: 'center',
    minWidth: 0,
  },
  patternLabel: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 2,
  },
  patternLabelCollapsed: {
    fontSize: 9,
    marginBottom: 0,
  },
  patternLabelInline: {
    fontSize: 9,
    letterSpacing: 0.6,
    marginBottom: 0,
  },
  noticeRow: {
    marginTop: 10,
    marginBottom: 0,
  },
  noticeRowCollapsed: {
    marginTop: 2,
  },
  noticeSummary: {
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  noticeSummaryCollapsed: {
    fontSize: 13,
    lineHeight: 19,
  },
  patternText: {
    fontFamily: FONTS.arabic,
    color: COLORS.primary,
    fontSize: 28,
    lineHeight: 56,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  patternTextCollapsed: {
    fontSize: 22,
    lineHeight: 40,
  },
  patternTextInline: {
    fontSize: 22,
    lineHeight: 40,
  },
  patternTextInlineCollapsed: {
    fontSize: 18,
    lineHeight: 32,
  },
  lit: {
    backgroundColor: COLORS.accent,
  },
  // Holds the pattern's place in the line without repainting the base layer.
  static: {
    color: 'transparent',
  },
  body: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  bodyOverlay: {
    marginTop: 0,
  },
  status: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 10,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  playButtonCollapsed: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  playButtonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  playGlyph: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 14,
    marginLeft: 2,
  },
  playGlyphCollapsed: {
    fontSize: 11,
    lineHeight: 12,
  },
  expandChip: {
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  expandChipCollapsed: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  expandChipClosed: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  expandChipOpen: {
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
  },
  expandChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  expandChipTextClosed: {
    color: COLORS.textPrimary,
  },
  expandChipTextOpen: {
    color: COLORS.textSecondary,
  },
});
