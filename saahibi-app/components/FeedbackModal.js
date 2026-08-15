import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PostHogMaskView } from 'posthog-react-native';

import { COLORS, RADII, SPACING, TYPE } from '../theme';

export default function FeedbackModal({ visible, onClose, onSubmit }) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const trimmed = message.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const handleClose = () => {
    if (submitting) return;
    setMessage('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setMessage('');
      onClose();
      Alert.alert('Thank you', 'Your feedback was sent.');
    } catch (e) {
      console.warn('[feedback] submit failed:', e?.message || e);
      Alert.alert(
        'Could not send',
        'Something went wrong. Please try again in a moment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Send feedback</Text>
          <Text style={styles.hint}>
            What felt confusing, broken, or useful? I read every note.
          </Text>
          <PostHogMaskView>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Type your feedback…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
              editable={!submitting}
              autoFocus
              accessibilityLabel="ph-no-capture"
            />
          </PostHogMaskView>
          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              disabled={submitting}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                !canSubmit && styles.buttonDisabled,
                pressed && canSubmit && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Sending…' : 'Send'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.xl,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: TYPE.title,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  hint: {
    fontSize: TYPE.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  input: {
    minHeight: 140,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceDeep,
  },
  primaryButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
});
