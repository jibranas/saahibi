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
}) {
  const chips = grammarChips(grammar, { chapterKey });
  if (chips.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {showHeading ? (
        <Text style={styles.heading}>Grammatical details</Text>
      ) : null}
      <View style={styles.grid}>
        {chips.map((chip) => (
          <View
            key={chip.label}
            style={[styles.chip, onSubtleCard && styles.chipOnSubtle]}
          >
            <Text style={styles.chipValue}>{chip.value}</Text>
            <Text style={styles.chipLabel}>{chip.label}</Text>
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
  chipValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  chipLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
