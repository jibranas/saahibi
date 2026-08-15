import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, FONTS, RADII } from '../theme';
import { forArabicDisplay } from '../utils/arabicDisplay';
import { playAyahAudio, stopAyahAudio } from '../utils/ayahAudio';
import { formatAyahReference } from '../utils/surahNames';

function occurrenceKey(occurrence) {
  return `${occurrence.surahId}:${occurrence.ayahNo}:${occurrence.startWordNo}`;
}

function PlayButton({ playing, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Stop recitation' : 'Play this ayah'}
      style={({ pressed }) => [
        styles.playButton,
        playing && styles.playButtonActive,
        pressed && styles.playButtonPressed,
      ]}
    >
      <Text style={styles.playGlyph}>{playing ? '■' : '▶'}</Text>
    </Pressable>
  );
}

/** The full verse, with the words that form the example highlighted. */
function AyahText({ words }) {
  return (
    <Text style={styles.ayah}>
      {words.map((word, i) => (
        <Text
          key={`${word.wordNo}-${i}`}
          style={word.matched ? styles.ayahWordMatched : styles.ayahWord}
        >
          {i > 0 ? ' ' : ''}
          {forArabicDisplay(word.text)}
        </Text>
      ))}
    </Text>
  );
}

function OccurrenceRow({ occurrence, playing, onTogglePlay }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <PlayButton playing={playing} onPress={onTogglePlay} />
        <Text style={styles.reference}>
          {formatAyahReference(occurrence.surahId, occurrence.ayahNo)}
        </Text>
      </View>

      <AyahText words={occurrence.words ?? []} />

      {occurrence.translation ? (
        <Text style={styles.translation}>{occurrence.translation}</Text>
      ) : null}
    </View>
  );
}

/**
 * The card's second back face: every ayah in the Quran containing the example
 * phrase, with the phrase highlighted in context and playable recitation.
 *
 * Occurrences are paged (`onLoadMore` fetches the next page), because a common
 * word can appear hundreds of times.
 */
export default function OccurrencesBack({
  occurrences,
  total,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onFlipBack,
}) {
  const [playingKey, setPlayingKey] = useState(null);

  const onTogglePlay = useCallback(
    (occurrence) => {
      const key = occurrenceKey(occurrence);
      if (playingKey === key) {
        stopAyahAudio();
        setPlayingKey(null);
        return;
      }
      setPlayingKey(key);
      playAyahAudio(occurrence).then(() => {
        // Only clear if this verse is still the one playing — a newer tap will
        // have already moved the highlight on.
        setPlayingKey((current) => (current === key ? null : current));
      });
    },
    [playingKey]
  );

  const countLabel =
    total === 1 ? 'Found once in the Quran' : `Found ${total} times in the Quran`;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>In the Quran</Text>
        </View>
        <Pressable
          onPress={onFlipBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Flip back"
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Text style={styles.backButtonText}>Done ↺</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.onPrimary} />
          <Text style={styles.centeredText}>Searching the Quran…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.centeredText}>{error}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.count}>{countLabel}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {occurrences.map((occurrence) => {
              const key = occurrenceKey(occurrence);
              return (
                <OccurrenceRow
                  key={key}
                  occurrence={occurrence}
                  playing={playingKey === key}
                  onTogglePlay={() => onTogglePlay(occurrence)}
                />
              );
            })}

            {hasMore ? (
              <Pressable
                onPress={onLoadMore}
                disabled={loadingMore}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.loadMore,
                  pressed && styles.loadMorePressed,
                ]}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={COLORS.onPrimary} />
                ) : (
                  <Text style={styles.loadMoreText}>
                    Load more · {occurrences.length} of {total}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.onPrimary,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeText: {
    color: COLORS.onPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  backButton: {
    borderRadius: RADII.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    color: COLORS.onPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  count: {
    color: COLORS.onPrimary,
    opacity: 0.75,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
    gap: 12,
  },
  row: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADII.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  reference: {
    flexShrink: 1,
    color: COLORS.onPrimary,
    opacity: 0.8,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  playButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: COLORS.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  playButtonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  playGlyph: {
    color: COLORS.onPrimary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  ayah: {
    fontFamily: FONTS.arabic,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: 22,
    lineHeight: 46,
  },
  ayahWord: {
    color: COLORS.onPrimary,
  },
  ayahWordMatched: {
    // Avoid backgroundColor on Text — on iOS it breaks Arabic mark attachment
    // and draws dotted-circle placeholders under tashkeel. Gold text + underline
    // marks the hit without disturbing shaping.
    color: COLORS.accentSoft,
    textDecorationLine: 'underline',
    textDecorationColor: COLORS.accent,
  },
  translation: {
    color: COLORS.onPrimary,
    opacity: 0.8,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
    marginTop: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  centeredText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
  loadMore: {
    alignSelf: 'center',
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    borderColor: COLORS.onPrimary,
    minWidth: 180,
    alignItems: 'center',
  },
  loadMorePressed: {
    opacity: 0.6,
  },
  loadMoreText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
