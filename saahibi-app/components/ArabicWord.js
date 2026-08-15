import { Platform, StyleSheet, Text } from 'react-native';

import { COLORS, FONTS } from '../theme';
import { forArabicDisplay } from '../utils/arabicDisplay';
import { joinRunsForShaping, segmentByRoot } from '../utils/arabicSegments';

// POS codes rendered entirely in the particle color.
const PARTICLE_POS = new Set([
  'P',
  'CONJ',
  'DET',
  'NEG',
  'EMPH',
  'INTG',
  'VOC',
  'ACC',
  'AMD',
  'ANS',
  'AVR',
  'CAUS',
  'CERT',
  'COND',
  'EXP',
  'FUT',
  'INC',
  'PRO',
  'REM',
  'RES',
  'RSLT',
  'SUP',
]);

/**
 * One Arabic word with root letters colored. Particles render fully in the
 * particle color; words with a known root get their root letters tinted;
 * everything else uses the base color.
 */
export default function ArabicWord({
  text,
  root,
  partOfSpeech,
  fontSize = 32,
  color = COLORS.textPrimary,
  style,
}) {
  const display = forArabicDisplay(text);
  // Uthmani Hafs needs a tall line box for stacked tashkeel / dagger alif.
  const lineHeight = Math.round(fontSize * 1.85);
  const baseStyle = [styles.arabic, { fontSize, lineHeight, color }, style];

  if (PARTICLE_POS.has(String(partOfSpeech ?? ''))) {
    return (
      <Text style={[baseStyle, { color: COLORS.particle }]}>{display}</Text>
    );
  }

  const segments = root ? segmentByRoot(display, root) : null;
  if (!segments) {
    return <Text style={baseStyle}>{display}</Text>;
  }

  // Android shapes each nested Text separately, so the seams between colored
  // runs need explicit joiners to keep the cursive forms.
  const runs =
    Platform.OS === 'android' ? joinRunsForShaping(segments) : segments;

  return (
    <Text style={baseStyle}>
      {runs.map((run, i) => (
        <Text
          key={i}
          style={run.isRoot ? { color: COLORS.rootLetters } : null}
        >
          {run.text}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  arabic: {
    fontFamily: FONTS.arabic,
    writingDirection: 'rtl',
  },
});
