import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, RADII, SPACING, TYPE } from '../theme';

/** Marker-ink blue — matches the hand-drawn arrow asset. */
const MARKER = '#3B6FE0';

export default function FeedbackCoachmark({ onDismiss }) {
  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.dim} />

      <View style={styles.spotlight} pointerEvents="none">
        <View style={styles.markerRing}>
          <View style={styles.feedbackChip}>
            <Text style={styles.feedbackChipText}>Feedback</Text>
          </View>
        </View>
      </View>

      <View style={styles.callout} pointerEvents="box-none">
        <Image
          source={require('../assets/marker-arrow.png')}
          style={styles.arrow}
          resizeMode="contain"
        />
        <Text style={styles.copy}>
          After you take the app for a spin, tap{' '}
          <Text style={styles.copyEmphasis}>Feedback</Text> up here and tell me
          how it felt — and how we can make it better. Send as much feedback as
          you want, anytime.
        </Text>
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.cta,
            pressed && styles.ctaPressed,
          ]}
        >
          <Text style={styles.ctaText}>Got it</Text>
        </Pressable>
      </View>
    </View>
  );
}

const FAB_TOP = Platform.OS === 'ios' ? 56 : 40;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  spotlight: {
    position: 'absolute',
    top: FAB_TOP - 14,
    right: 2,
    padding: 14,
  },
  markerRing: {
    borderWidth: 3.5,
    borderColor: MARKER,
    borderRadius: 40,
    paddingVertical: 10,
    paddingHorizontal: 12,
    transform: [{ rotate: '-3deg' }],
    backgroundColor: 'transparent',
  },
  feedbackChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceDeep,
  },
  feedbackChipText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  callout: {
    position: 'absolute',
    top: FAB_TOP + 78,
    left: SPACING.xl,
    right: SPACING.xl,
    alignItems: 'flex-start',
  },
  arrow: {
    width: 120,
    height: 120,
    marginLeft: 'auto',
    marginRight: 28,
    marginBottom: SPACING.md,
  },
  copy: {
    color: COLORS.onPrimary,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    marginBottom: SPACING.xl,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  copyEmphasis: {
    fontWeight: '800',
    color: '#dce7ff',
  },
  cta: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaText: {
    color: COLORS.primary,
    fontSize: TYPE.body + 1,
    fontWeight: '800',
  },
});
