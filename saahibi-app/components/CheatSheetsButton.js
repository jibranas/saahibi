import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADII } from '../theme';

/**
 * Footer companion button that opens the cheat-card picker. Styled like a
 * small tilted paper sheet so it reads as "pull out a reference card".
 */
export default function CheatSheetsButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open cheat cards"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.pageIcon}>
        <View style={styles.pageLine} />
        <View style={styles.pageLine} />
        <View style={[styles.pageLine, styles.pageLineShort]} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        Cheat cards
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: RADII.md,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.paperEdge,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  pageIcon: {
    width: 15,
    height: 19,
    borderWidth: 1.6,
    borderColor: COLORS.primary,
    borderRadius: 2,
    paddingTop: 4,
    paddingHorizontal: 2.5,
    gap: 2.5,
    transform: [{ rotate: '-4deg' }],
    backgroundColor: COLORS.paperHighlight,
  },
  pageLine: {
    height: 1.4,
    borderRadius: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.85,
  },
  pageLineShort: {
    width: '55%',
  },
  label: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});
