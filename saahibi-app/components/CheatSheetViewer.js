import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, RADII } from '../theme';
import { useEdgeBackPanResponder } from '../utils/edgeBackSwipe';
import CheatSheetPaper from './CheatSheetPaper';

const REST_TILT = '-2.5deg';
const WAD_TILT = '24deg';
const OPEN_SPRING = { friction: 7, tension: 58, useNativeDriver: true };
const CLOSE_DURATION = 280;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const NATIVE_PINCH_ZOOM = Platform.OS === 'ios';

function touchDistance(touches) {
  if (!touches || touches.length < 2) return 0;
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.hypot(dx, dy);
}

function touchMidpoint(touches) {
  return {
    x: (touches[0].pageX + touches[1].pageX) / 2,
    y: (touches[0].pageY + touches[1].pageY) / 2,
  };
}

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
export default function CheatSheetViewer({ sheet, visible, onClose, children }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const pinchTx = useRef(new Animated.Value(0)).current;
  const pinchTy = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [displayed, setDisplayed] = useState(null);
  const [zoomed, setZoomed] = useState(false);

  const pinch = useRef({
    scale: 1,
    tx: 0,
    ty: 0,
    startDist: 0,
    startScale: 1,
    startTx: 0,
    startTy: 0,
    startMidX: 0,
    startMidY: 0,
  }).current;

  const resetPinch = () => {
    pinch.scale = 1;
    pinch.tx = 0;
    pinch.ty = 0;
    pinchScale.setValue(1);
    pinchTx.setValue(0);
    pinchTy.setValue(0);
    setZoomed(false);
  };

  const edgeBackHandlers = useEdgeBackPanResponder(onClose);

  const pinchResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (e) =>
          e.nativeEvent.touches.length >= 2 || pinch.scale > 1.02,
        onMoveShouldSetPanResponder: (e, g) =>
          e.nativeEvent.touches.length >= 2 ||
          (pinch.scale > 1.02 && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4)),
        onStartShouldSetPanResponderCapture: (e) =>
          e.nativeEvent.touches.length >= 2,
        onMoveShouldSetPanResponderCapture: (e) =>
          e.nativeEvent.touches.length >= 2,
        onPanResponderTerminationRequest: () => pinch.scale <= 1.02,
        onPanResponderGrant: (e) => {
          const touches = e.nativeEvent.touches;
          pinch.startScale = pinch.scale;
          pinch.startTx = pinch.tx;
          pinch.startTy = pinch.ty;
          if (touches.length >= 2) {
            pinch.startDist = touchDistance(touches) || 1;
            const mid = touchMidpoint(touches);
            pinch.startMidX = mid.x;
            pinch.startMidY = mid.y;
            setZoomed(true);
          }
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          if (touches.length >= 2) {
            const dist = touchDistance(touches);
            if (!pinch.startDist) {
              pinch.startDist = dist || 1;
              pinch.startScale = pinch.scale;
              const mid = touchMidpoint(touches);
              pinch.startMidX = mid.x;
              pinch.startMidY = mid.y;
            }
            const nextScale = Math.min(
              MAX_SCALE,
              Math.max(MIN_SCALE * 0.85, pinch.startScale * (dist / pinch.startDist))
            );
            const mid = touchMidpoint(touches);
            pinch.scale = nextScale;
            pinch.tx = pinch.startTx + (mid.x - pinch.startMidX);
            pinch.ty = pinch.startTy + (mid.y - pinch.startMidY);
            pinchScale.setValue(nextScale);
            pinchTx.setValue(pinch.tx);
            pinchTy.setValue(pinch.ty);
          } else if (pinch.scale > 1.02) {
            pinch.tx = pinch.startTx + g.dx;
            pinch.ty = pinch.startTy + g.dy;
            pinchTx.setValue(pinch.tx);
            pinchTy.setValue(pinch.ty);
          }
        },
        onPanResponderRelease: () => {
          pinch.startDist = 0;
          if (pinch.scale <= 1.02) {
            pinch.scale = 1;
            pinch.tx = 0;
            pinch.ty = 0;
            Animated.parallel([
              Animated.spring(pinchScale, {
                toValue: 1,
                useNativeDriver: true,
                friction: 7,
                tension: 80,
              }),
              Animated.spring(pinchTx, {
                toValue: 0,
                useNativeDriver: true,
                friction: 7,
                tension: 80,
              }),
              Animated.spring(pinchTy, {
                toValue: 0,
                useNativeDriver: true,
                friction: 7,
                tension: 80,
              }),
            ]).start();
            setZoomed(false);
          } else {
            setZoomed(true);
          }
        },
        onPanResponderTerminate: () => {
          pinch.startDist = 0;
        },
      }),
    [pinch, pinchScale, pinchTx, pinchTy]
  );

  useEffect(() => {
    if (visible && sheet) {
      mountedRef.current = true;
      setDisplayed(sheet);
      setMounted(true);
      resetPinch();
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, ...OPEN_SPRING }).start();
      return undefined;
    }
    if (!mountedRef.current) return undefined;
    resetPinch();
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
  const composedScale = Animated.multiply(scale, pinchScale);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root} {...(edgeBackHandlers ?? {})}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          {...(NATIVE_PINCH_ZOOM ? {} : pinchResponder.panHandlers)}
          style={[
            styles.paperWrap,
            {
              width: paperWidth,
              maxHeight: paperMaxHeight,
              transform: [
                { scale: composedScale },
                { scaleY },
                { rotate },
                { translateX: pinchTx },
                { translateY: pinchTy },
              ],
            },
          ]}
        >
          <View style={styles.shadow}>
            <ScrollView
              key={displayed.key}
              bounces={false}
              scrollEnabled={NATIVE_PINCH_ZOOM || !zoomed}
              minimumZoomScale={1}
              maximumZoomScale={NATIVE_PINCH_ZOOM ? MAX_SCALE : 1}
              pinchGestureEnabled={NATIVE_PINCH_ZOOM}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
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
        {children}
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
    overflow: 'visible',
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
