import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADII, SPACING } from '../theme';
import CheatSheetPaper from './CheatSheetPaper';

/**
 * One-time explanation drawn inside the cheat-card window, over the sheet.
 * A second Modal cannot appear above the sheet's Modal on Android.
 */
export default function CheatCardIntro({ sheet, onDismiss }) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
          <Text style={styles.kicker}>Cheat cards</Text>
          <Text style={styles.copy}>
You unlocked your first cheat card! You’re going to need to refer back to your lessons a lot, and a cheat card puts the important ones in one summary view. Instead of flipping back and forth between lessons, just check your cheat card!        </Text>

          {sheet ? (
            <ScrollView
              style={styles.previewScroll}
              showsVerticalScrollIndicator={false}
            >
              <CheatSheetPaper sheet={sheet} compact />
            </ScrollView>
          ) : null}

          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Got it"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>Got it</Text>
          </Pressable>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    maxHeight: '86%',
  },
  kicker: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  copy: {
    color: COLORS.textPrimary,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: SPACING.md,
  },
  previewScroll: {
    maxHeight: 260,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.paperEdge,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
  },
  cta: {
    backgroundColor: COLORS.surfaceDeep,
    borderRadius: RADII.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
});
