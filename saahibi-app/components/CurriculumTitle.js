import { StyleSheet, Text, View } from 'react-native';

import { COLORS, FONTS } from '../theme';

/**
 * Main name + technical line (Arabic · English), matching chapter cards.
 * `large` = chapter / lesson intro. `compact` = lesson rows. `card` = home cards.
 */
export default function CurriculumTitle({
  simpleTitle,
  titleArabic,
  title,
  size = 'large',
}) {
  const main = simpleTitle || title;
  const compact = size === 'compact';
  const card = size === 'card';

  return (
    <View>
      {main ? (
        <Text
          style={[
            styles.main,
            compact && styles.mainCompact,
            card && styles.mainCard,
          ]}
        >
          {main}
        </Text>
      ) : null}
      {titleArabic || title ? (
        <View style={[styles.technicalRow, compact && styles.technicalRowCompact]}>
          {titleArabic ? (
            <Text
              style={[
                styles.technicalArabic,
                compact && styles.technicalArabicCompact,
                card && styles.technicalArabicCard,
              ]}
            >
              {titleArabic}
            </Text>
          ) : null}
          {titleArabic && title ? (
            <Text style={styles.technicalDot}>·</Text>
          ) : null}
          {title ? (
            <Text
              style={[
                styles.technicalEnglish,
                compact && styles.technicalEnglishCompact,
                card && styles.technicalEnglishCard,
              ]}
            >
              {title}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  mainCard: {
    fontSize: 22,
    marginTop: 10,
  },
  mainCompact: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 0,
  },
  technicalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  technicalRowCompact: {
    marginTop: 4,
    gap: 6,
  },
  technicalArabic: {
    fontFamily: FONTS.arabic,
    color: COLORS.primary,
    fontSize: 19,
    lineHeight: 38,
    writingDirection: 'rtl',
  },
  technicalArabicCard: {
    fontSize: 17,
    lineHeight: 34,
  },
  technicalArabicCompact: {
    fontSize: 16,
    lineHeight: 28,
  },
  technicalDot: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  technicalEnglish: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  technicalEnglishCard: {
    fontSize: 14,
  },
  technicalEnglishCompact: {
    fontSize: 13,
    fontWeight: '600',
  },
});
