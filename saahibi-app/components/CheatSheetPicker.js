import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, RADII } from '../theme';
import CheatSheetPaper from './CheatSheetPaper';

const OPEN_SPRING = { friction: 9, tension: 60, useNativeDriver: true };
const CLOSE_DURATION = 200;
const SLIDE_DISTANCE = 480;

function SheetCard({ sheet, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${sheet.title}`}
    >
      <View style={styles.page} pointerEvents="none">
        <View style={styles.pageInner}>
          <CheatSheetPaper sheet={sheet} compact />
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {sheet.title}
      </Text>
    </Pressable>
  );
}

/**
 * Bottom-sheet picker of all cheat cards, shown over the current lesson so
 * the user's place in the examples is never lost. Scroll, tap a card to open.
 *
 * Deliberately NOT a react-native Modal: the cheat-sheet viewer is a Modal,
 * and opening it while this one dismisses freezes touch handling on iOS.
 * Rendering as an absolute overlay keeps only one native Modal in play.
 */
export default function CheatSheetPicker({ visible, sheets, onSelect, onClose }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(progress, { toValue: 1, ...OPEN_SPRING }).start();
      return undefined;
    }
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return () => anim.stop();
  }, [visible, progress]);

  // Android hardware back closes the picker (Modal used to handle this).
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!mounted) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SLIDE_DISTANCE, 0],
  });
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.42],
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Cheat cards</Text>
        <Text style={styles.tag}>Tap a card to open it next to your lesson</Text>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {sheets.map((sheet) => (
            <SheetCard
              key={sheet.key}
              sheet={sheet}
              onPress={() => onSelect(sheet)}
            />
          ))}
        </ScrollView>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.close,
            pressed && styles.closePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close cheat cards"
        >
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 60,
    // Android stacks by elevation, not zIndex — footer buttons (elevation 2–3)
    // otherwise draw on top of this overlay.
    elevation: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.shadow,
  },
  panel: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 26,
    maxHeight: '78%',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 25,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
    marginBottom: 14,
  },
  title: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  tag: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 18,
    paddingBottom: 12,
  },
  card: {
    alignItems: 'center',
    width: 156,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  page: {
    width: 150,
    height: 212,
    backgroundColor: COLORS.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.paperEdge,
    transform: [{ rotate: '-2deg' }],
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 2, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    paddingTop: 13,
    paddingHorizontal: 10,
  },
  pageInner: {
    transform: [{ scale: 0.52 }],
    width: '192%',
    marginLeft: '-46%',
  },
  cardTitle: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  close: {
    marginTop: 6,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closePressed: {
    opacity: 0.85,
  },
  closeText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
});
