import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, RADII } from '../theme';
import CheatSheetPaper from './CheatSheetPaper';

const REST_TILT = '-2.5deg';
const WAD_TILT = '24deg';
const OPEN_SPRING = { friction: 7, tension: 58, useNativeDriver: true };
const CLOSE_DURATION = 280;

function CrumpleOverlay({ opacity }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.crumple, { opacity }]}
    >
      <View style={[styles.fold, styles.foldA]} />
      <View style={[styles.fold, styles.foldB]} />
      <View style={[styles.fold, styles.foldC]} />
      <View style={[styles.fold, styles.foldD]} />
      <View style={styles.creaseH} />
      <View style={styles.creaseV} />
      <View style={styles.creaseD} />
    </Animated.View>
  );
}

/**
 * Full-screen overlay: a paper wad springs open into a slightly tilted sheet.
 */
export default function CheatSheetViewer({ sheet, visible, onClose }) {
  const progress = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [displayed, setDisplayed] = useState(null);

  useEffect(() => {
    if (visible && sheet) {
      mountedRef.current = true;
      setDisplayed(sheet);
      setMounted(true);
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, ...OPEN_SPRING }).start();
      return undefined;
    }
    if (!mountedRef.current) return undefined;
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      mountedRef.current = false;
      setMounted(false);
      setDisplayed(null);
    });
    return () => anim.stop();
  }, [visible, sheet, progress]);

  if (!mounted || !displayed) return null;

  const paperWidth = Math.min(Dimensions.get('window').width - 20, 420);
  const paperMaxHeight = Dimensions.get('window').height * 0.72;

  const scale = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0.14, 0.92, 1],
  });
  const scaleY = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.55, 0.97, 1],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [WAD_TILT, REST_TILT],
  });
  const crumpleOpacity = progress.interpolate({
    inputRange: [0, 0.35, 0.75, 1],
    outputRange: [0.95, 0.55, 0.12, 0],
  });
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.52],
  });

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.paperWrap,
            {
              width: paperWidth,
              maxHeight: paperMaxHeight,
              transform: [{ scale }, { scaleY }, { rotate }],
            },
          ]}
        >
          <View style={styles.shadow}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
            >
              <CheatSheetPaper sheet={displayed} />
            </ScrollView>
            <CrumpleOverlay opacity={crumpleOpacity} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: progress }}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.close,
              pressed && styles.closePressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close cheat sheet"
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 48,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.shadow,
  },
  paperWrap: {
    maxHeight: '86%',
  },
  shadow: {
    borderRadius: RADII.sm,
    backgroundColor: COLORS.paper,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 2, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  scroll: {
    maxHeight: '100%',
  },
  scrollContent: {
    flexGrow: 1,
  },
  crumple: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.paperFold,
  },
  fold: {
    position: 'absolute',
    backgroundColor: COLORS.paper,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  foldA: {
    top: '8%',
    left: '6%',
    width: '58%',
    height: '42%',
    transform: [{ rotate: '-11deg' }],
    opacity: 0.7,
  },
  foldB: {
    top: '28%',
    right: '4%',
    width: '50%',
    height: '38%',
    transform: [{ rotate: '16deg' }],
    opacity: 0.65,
  },
  foldC: {
    bottom: '10%',
    left: '14%',
    width: '70%',
    height: '32%',
    transform: [{ rotate: '8deg' }],
    opacity: 0.6,
  },
  foldD: {
    top: '40%',
    left: '22%',
    width: '46%',
    height: '28%',
    transform: [{ rotate: '-19deg' }],
    opacity: 0.55,
  },
  creaseH: {
    position: 'absolute',
    top: '48%',
    left: '8%',
    right: '8%',
    height: 2,
    backgroundColor: COLORS.borderStrong,
    opacity: 0.55,
    transform: [{ rotate: '-4deg' }],
  },
  creaseV: {
    position: 'absolute',
    top: '12%',
    bottom: '12%',
    left: '46%',
    width: 2,
    backgroundColor: COLORS.borderStrong,
    opacity: 0.4,
    transform: [{ rotate: '7deg' }],
  },
  creaseD: {
    position: 'absolute',
    top: '18%',
    left: '18%',
    width: '64%',
    height: 2,
    backgroundColor: COLORS.border,
    opacity: 0.7,
    transform: [{ rotate: '28deg' }],
  },
  close: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    zIndex: 2,
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
