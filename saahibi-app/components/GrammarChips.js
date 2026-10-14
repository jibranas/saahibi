import { StyleSheet, Text, View } from 'react-native';

import { COLORS, RADII } from '../theme';
import { grammarChips } from '../utils/grammar';

/**
 * The four-attribute "Grammatical details" grid from the design mockups:
 * Jins (gender), Adad (number), I'raab (case), Wus'at (state).
 * Visibility is gated by `chapterKey` (see `isChipUnlocked` in chapters.js).
 */
export default function GrammarChips({
  grammar,
  chapterKey,
  showHeading = true,
  /** When true, chips use white surface so they contrast on surfaceAlt cards. */
  onSubtleCard = false,
  /** When true, chips invert for dark filled surfaces (e.g. Quran card back). */
  onDark = false,
  /** Value-only pills in a single wrapping row — for tight reference strips. */
  compact = false,
}) {
  const chips = grammarChips(grammar, { chapterKey });
  if (chips.length === 0) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {showHeading && !compact ? (
        <Text style={styles.heading}>Grammatical details</Text>
      ) : null}
      <View style={[styles.grid, compact && styles.gridCompact]}>
        {chips.map((chip) => (
          <View
            key={chip.label}
            style={[
              styles.chip,
              onSubtleCard && styles.chipOnSubtle,
              onDark && styles.chipOnDark,
              compact && styles.chipCompact,
            ]}
          >
            <Text
              style={[
                styles.chipValue,
                onDark && styles.chipValueOnDark,
                compact && styles.chipValueCompact,
              ]}
            >
              {chip.value}
            </Text>
            {!compact ? (
              <Text style={[styles.chipLabel, onDark && styles.chipLabelOnDark]}>
                {chip.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  wrapCompact: {
    marginTop: 0,
  },
  heading: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCompact: {
    justifyContent: 'center',
    gap: 4,
  },
  chip: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADII.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  chipOnSubtle: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipOnDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  chipCompact: {
    flexBasis: 'auto',
    flexGrow: 0,
    paddingVertical: 2,
    paddingHorizontal: 7,
    gap: 0,
  },
  chipValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  chipValueOnDark: {
    color: COLORS.onPrimary,
  },
  chipValueCompact: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  chipLabelOnDark: {
    color: COLORS.onPrimary,
    opacity: 0.65,
  },
});
