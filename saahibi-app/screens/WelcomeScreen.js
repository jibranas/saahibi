import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PostHogMaskView } from 'posthog-react-native';

import { COLORS, RADII, SPACING, TYPE } from '../theme';
import { isValidBetaProfile } from '../utils/betaProfile';

export default function WelcomeScreen({ onContinue }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canContinue = isValidBetaProfile({ name, email }) && !submitting;

  const handleContinue = async () => {
    if (!isValidBetaProfile({ name, email }) || submitting) return;
    setSubmitting(true);
    try {
      await onContinue({ name, email });
    } catch (e) {
      console.warn('[welcome] continue failed:', e?.message || e);
      Alert.alert(
        'Could not continue',
        'Something went wrong saving your details. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.brand}>Saahibi</Text>
          <Text style={styles.headline}>
            Thank you for helping me make the app better
          </Text>
          <Text style={styles.note}>
            Share your name and email so I can follow up on your feedback.
          </Text>

          <View style={styles.fields}>
            <Text style={styles.label}>Name</Text>
            <PostHogMaskView>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                editable={!submitting}
                accessibilityLabel="ph-no-capture"
              />
            </PostHogMaskView>

            <Text style={[styles.label, styles.labelSpaced]}>Email</Text>
            <PostHogMaskView>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                editable={!submitting}
                accessibilityLabel="ph-no-capture"
              />
            </PostHogMaskView>
          </View>

          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.button,
              !canContinue && styles.buttonDisabled,
              pressed && canContinue && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {submitting ? 'Continuing…' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  brand: {
    fontSize: TYPE.title,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 32,
    marginBottom: SPACING.md,
  },
  note: {
    fontSize: TYPE.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  fields: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  labelSpaced: {
    marginTop: SPACING.lg,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  button: {
    backgroundColor: COLORS.surfaceDeep,
    borderRadius: RADII.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
