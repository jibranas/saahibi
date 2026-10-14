import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getChapterForRule } from '../data/chapters';
import { CLOUD_PALETTE, COLORS, FONTS, RADII } from '../theme';
import { fetchRootMeaning } from '../utils/rootMeaning';
import { fetchWordGrammar, wordGrammarKey } from '../utils/wordGrammar';
import { grammarChips, roleFromPartOfSpeech } from '../utils/grammar';
import { fetchPhraseOccurrences, PAGE_SIZE } from '../utils/phraseOccurrences';
import { playWordAudioSequence } from '../utils/wordAudio';
import ArabicWord from './ArabicWord';
import GrammarChips from './GrammarChips';
import OccurrencesBack from './OccurrencesBack';

const FLIP_DURATION_MS = 350;

function pickTranslationText(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.en) return value.en;
  const first = Object.values(value).find((v) => v != null && v !== '');
  return first ?? null;
}

/** Phrase translation from an object (whole phrase) or array (per word). */
function pickPhraseTranslation(translations) {
  if (Array.isArray(translations)) {
    const parts = translations
      .map((t) => pickTranslationText(t))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  }
  return pickTranslationText(translations);
}

function SpeakerButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityLabel="Play audio"
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.speakerButton,
        pressed && styles.speakerButtonPressed,
      ]}
    >
      <Text style={styles.speakerGlyph}>▶</Text>
    </Pressable>
  );
}

function WordGrammarBlock({
  word,
  isOnly,
  chapterKey,
  ruleKey,
  onSubtleCard = false,
}) {
  const [expanded, setExpanded] = useState(isOnly);
  const grammar = word.grammar;
  const role =
    word.role ??
    (grammar
      ? roleFromPartOfSpeech(grammar.partOfSpeech, { ruleKey })
      : null);
  const hasChips = grammarChips(grammar, { chapterKey }).length > 0;

  // A single noun renders its chips inline without the collapsible shell.
  if (isOnly) {
    return hasChips ? (
      <View style={styles.singleGrammar}>
        <GrammarChips
          grammar={grammar}
          chapterKey={chapterKey}
          onSubtleCard={onSubtleCard}
        />
      </View>
    ) : null;
  }

  if (!grammar && !role) return null;

  return (
    <Pressable
      onPress={hasChips ? () => setExpanded((e) => !e) : undefined}
      style={styles.wordBlock}
      accessibilityRole={hasChips ? 'button' : undefined}
    >
      <View style={styles.wordBlockHeader}>
        <View style={styles.wordBlockTitle}>
          <ArabicWord
            text={word.text}
            root={grammar?.root}
            partOfSpeech={grammar?.partOfSpeech}
            fontSize={20}
          />
          {role ? <Text style={styles.wordRole}>{role}</Text> : null}
        </View>
        {hasChips ? (
          <Text style={styles.wordBlockToggle}>{expanded ? '−' : '+'}</Text>
        ) : null}
      </View>
      {expanded && hasChips ? (
        <View style={styles.wordBlockBody}>
          <GrammarChips
            grammar={grammar}
            chapterKey={chapterKey}
            showHeading={false}
            onSubtleCard={onSubtleCard}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

const CLOUD_MIN_SIZE = 13;
const CLOUD_MAX_SIZE = 28;

/** Same gloss always gets the same color, wherever it appears. */
function cloudColor(text) {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CLOUD_PALETTE[hash % CLOUD_PALETTE.length];
}

/** 0 for the rarest gloss, 1 for the most common; square root keeps small ones readable. */
function cloudWeight(count, minCount, maxCount) {
  if (maxCount <= minCount) return 0.4;
  const span = Math.sqrt(maxCount) - Math.sqrt(minCount);
  return (Math.sqrt(count) - Math.sqrt(minCount)) / span;
}

function CloudWord({ text, weight }) {
  const size = Math.round(
    CLOUD_MIN_SIZE + weight * (CLOUD_MAX_SIZE - CLOUD_MIN_SIZE)
  );
  const color = cloudColor(text);
  const top = weight >= 0.75;
  return (
    <View
      style={[
        styles.cloudPill,
        {
          backgroundColor: top ? color.solid : color.soft,
          paddingHorizontal: Math.round(size * 0.55),
          paddingVertical: Math.round(size * 0.18),
          borderRadius: size,
        },
      ]}
    >
      <Text
        style={[
          styles.cloudWord,
          {
            color: top ? COLORS.surface : color.text,
            fontSize: size,
            lineHeight: Math.round(size * 1.2),
            fontWeight: weight >= 0.35 ? '800' : '700',
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function MeaningCloud({ cloud }) {
  const counts = cloud.map((item) => item.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  return (
    <View style={styles.cloudPanel}>
      <Text style={styles.cloudTitle}>Meanings in the Quran</Text>
      <Text style={styles.cloudHint}>
        The bigger the word, the more often it is used in the Quran
      </Text>
      <View style={styles.cloud}>
        {[...cloud].sort((a, b) => b.count - a.count).map((item, index) => (
          <CloudWord
            key={`${item.text}-${index}`}
            text={item.text}
            weight={cloudWeight(item.count, minCount, maxCount)}
          />
        ))}
      </View>
    </View>
  );
}

function CardBack({ roots, loading, onFlipBack }) {
  return (
    <View style={styles.backInner}>
      <View style={styles.backHeader}>
        <View style={styles.backBadge}>
          <Text style={styles.backBadgeText}>Root meaning</Text>
        </View>
        <Pressable
          onPress={onFlipBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Flip back"
          style={({ pressed }) => [
            styles.backDoneButton,
            pressed && styles.backDoneButtonPressed,
          ]}
        >
          <Text style={styles.backDoneButtonText}>Done ↺</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.backLoading}>
          <ActivityIndicator size="small" color={COLORS.onRoot} />
          <Text style={styles.backLoadingText}>Loading…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.backScroll}
          contentContainerStyle={styles.backScrollContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {roots.length > 0 ? (
            roots.map((entry, i) => (
              <View key={`${entry.letters}-${i}`} style={styles.backRootBlock}>
                <Text style={styles.rootLetters}>
                  {[...String(entry.letters ?? '').replace(/\s/g, '')].join(' ')}
                </Text>
                {entry.transliteration ? (
                  <Text style={styles.rootTransliteration}>
                    {entry.transliteration}
                  </Text>
                ) : null}
                {entry.cloud?.length > 0 ? (
                  <MeaningCloud cloud={entry.cloud} />
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.backEmpty}>
              No root meaning available for this example.
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * The lesson example card.
 *
 * Front: the Arabic phrase (root letters colored), audio button, translation,
 * and a grammatical-details section — inline chips for a single noun, or
 * per-word expandable blocks when the example has several words. The card
 * stands for a *phrase* rather than one location, so no ayah reference is
 * shown here; every place it occurs lives on the occurrences face.
 *
 * Back (flip), either:
 *  - the root letters and meanings of every word with a root, or
 *  - every ayah containing the phrase, with recitation
 *
 * `words`: ordered `[{ wordNo, text?, role?, grammar? }]`. Grammar not
 * supplied is fetched in batch from `/api/word-grammar`.
 */
export default function ExampleCard({
  surahId,
  ayahNo,
  words: wordsProp,
  translations,
  autoPlay = false,
  title,
  occurrenceCount,
  phraseRef,
  chapterKey: chapterKeyProp,
  ruleKey,
  noQuranExample = false,
  disableAudio = false,
}) {
  const chapterKey =
    chapterKeyProp ?? getChapterForRule(ruleKey)?.key ?? null;
  const [fetchedGrammar, setFetchedGrammar] = useState(null);

  useEffect(() => {
    if (noQuranExample) {
      setFetchedGrammar(new Map());
      return undefined;
    }
    let cancelled = false;
    const missing = (wordsProp ?? []).filter(
      (w) => !w.grammar && w.wordNo != null
    );
    if (missing.length === 0) {
      setFetchedGrammar(new Map());
      return undefined;
    }
    const refs = missing.map((w) => ({ surahId, ayahNo, wordNo: w.wordNo }));
    fetchWordGrammar(refs).then((map) => {
      if (!cancelled) setFetchedGrammar(map);
    });
    return () => {
      cancelled = true;
    };
  }, [surahId, ayahNo, wordsProp, noQuranExample]);

  const words = useMemo(() => {
    return (wordsProp ?? []).map((w) => {
      if (w.grammar || noQuranExample) {
        return { ...w, text: w.text ?? '…', grammar: w.grammar ?? null };
      }
      const fetched = fetchedGrammar?.get(
        wordGrammarKey({ surahId, ayahNo, wordNo: w.wordNo })
      );
      return {
        ...w,
        text: w.text ?? fetched?.text ?? '…',
        grammar: fetched ?? null,
      };
    });
  }, [wordsProp, fetchedGrammar, surahId, ayahNo, noQuranExample]);

  const audioRefs = useMemo(
    () =>
      noQuranExample || disableAudio
        ? []
        : words
            .filter((w) => w.wordNo != null)
            .map((w) => ({ surahId, ayahNo, wordNo: w.wordNo })),
    [words, surahId, ayahNo, noQuranExample, disableAudio]
  );

  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (!autoPlay || autoPlayedRef.current || audioRefs.length === 0) return;
    autoPlayedRef.current = true;
    playWordAudioSequence(audioRefs);
  }, [autoPlay, audioRefs]);

  const onPressSpeaker = useCallback(() => {
    if (audioRefs.length > 0) playWordAudioSequence(audioRefs);
  }, [audioRefs]);

  // ----- flip state -----
  // One flip animation serves both back faces; `backMode` decides which one
  // is rendered on the reverse side.
  const [flipped, setFlipped] = useState(false);
  // While true, faces keep a native rotateY transform. Android cannot scroll
  // (or reliably receive touches) inside a view that still has that transform,
  // so we drop it once the flip animation settles.
  const [flipAnimating, setFlipAnimating] = useState(false);
  const [backMode, setBackMode] = useState('roots');
  const [roots, setRoots] = useState(undefined);
  const [loadingRoots, setLoadingRoots] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const rootsAvailable = words.some(
    (w) => w.grammar?.root && String(w.grammar.root).trim() !== ''
  );

  const animateFlip = useCallback(
    (toBack) => {
      setFlipAnimating(true);
      Animated.timing(flipAnim, {
        toValue: toBack ? 180 : 0,
        duration: FLIP_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setFlipped(toBack);
        setFlipAnimating(false);
      });
    },
    [flipAnim]
  );

  const loadRoots = useCallback(async () => {
    if (roots !== undefined) return;
    setLoadingRoots(true);
    try {
      const uniqueRoots = [
        ...new Set(
          words
            .map((w) => w.grammar?.root)
            .filter((r) => r && String(r).trim() !== '')
        ),
      ];
      const results = await Promise.all(
        uniqueRoots.map((root) => fetchRootMeaning({ root }))
      );
      setRoots(results.filter(Boolean));
    } finally {
      setLoadingRoots(false);
    }
  }, [roots, words]);

  // ----- occurrences -----
  const [occurrences, setOccurrences] = useState([]);
  const [occurrenceTotal, setOccurrenceTotal] = useState(occurrenceCount ?? 0);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [loadingMoreOccurrences, setLoadingMoreOccurrences] = useState(false);
  const [occurrencesError, setOccurrencesError] = useState(null);
  const occurrencesLoadedRef = useRef(false);

  const loadOccurrences = useCallback(async () => {
    if (occurrencesLoadedRef.current || !phraseRef) return;
    occurrencesLoadedRef.current = true;
    setLoadingOccurrences(true);
    setOccurrencesError(null);
    const data = await fetchPhraseOccurrences(phraseRef, { offset: 0 });
    if (data) {
      setOccurrences(data.occurrences ?? []);
      setOccurrenceTotal(data.total ?? 0);
    } else {
      // Allow a retry on the next flip.
      occurrencesLoadedRef.current = false;
      setOccurrencesError("Couldn't load occurrences.");
    }
    setLoadingOccurrences(false);
  }, [phraseRef]);

  const onLoadMoreOccurrences = useCallback(async () => {
    if (loadingMoreOccurrences || !phraseRef) return;
    setLoadingMoreOccurrences(true);
    const data = await fetchPhraseOccurrences(phraseRef, {
      offset: occurrences.length,
      limit: PAGE_SIZE,
    });
    if (data?.occurrences?.length) {
      setOccurrences((current) => [...current, ...data.occurrences]);
      setOccurrenceTotal(data.total ?? occurrenceTotal);
    } else {
      // Nothing came back — settle the total to what we have so the button
      // doesn't invite an endless retry.
      setOccurrenceTotal(occurrences.length);
    }
    setLoadingMoreOccurrences(false);
  }, [loadingMoreOccurrences, phraseRef, occurrences.length, occurrenceTotal]);

  const onShowRoots = useCallback(() => {
    if (!rootsAvailable) return;
    setBackMode('roots');
    animateFlip(true);
    loadRoots();
  }, [rootsAvailable, animateFlip, loadRoots]);

  const onShowOccurrences = useCallback(() => {
    if (!phraseRef) return;
    setBackMode('occurrences');
    animateFlip(true);
    loadOccurrences();
  }, [phraseRef, animateFlip, loadOccurrences]);

  const onFlipBack = useCallback(() => {
    animateFlip(false);
  }, [animateFlip]);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [0, 0, 1, 1],
  });

  // Settled faces use plain opacity (no rotateY) so nested ScrollViews work on
  // Android. During the flip we keep the animated 3D transform.
  const frontFaceStyle = flipAnimating
    ? {
        opacity: frontOpacity,
        transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
      }
    : { opacity: flipped ? 0 : 1 };
  const backFaceStyle = flipAnimating
    ? {
        opacity: backOpacity,
        transform: [{ perspective: 1200 }, { rotateY: backRotate }],
      }
    : { opacity: flipped ? 1 : 0 };

  const translation = pickPhraseTranslation(translations);
  const isSingleWord = words.length === 1;
  const occurrencesAvailable = Boolean(phraseRef);

  return (
    <View style={styles.outer}>
      <View style={styles.flipInner}>
        <Animated.View
          style={[
            styles.card,
            noQuranExample && styles.cardForged,
            frontFaceStyle,
          ]}
          pointerEvents={flipped ? 'none' : 'auto'}
        >
          <View style={styles.header}>
            {audioRefs.length > 0 ? (
              <SpeakerButton onPress={onPressSpeaker} />
            ) : (
              <View />
            )}
            {title ? (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
          </View>

          <Text style={styles.phrase}>
            {words.map((w, i) => (
              <Text key={`${w.wordNo}-${i}`}>
                {i > 0 ? ' ' : ''}
                <ArabicWord
                  text={w.text}
                  root={w.grammar?.root}
                  partOfSpeech={w.grammar?.partOfSpeech}
                  fontSize={isSingleWord ? 46 : 38}
                />
              </Text>
            ))}
          </Text>

          <View style={styles.divider} />

          {noQuranExample ? (
            <Text style={styles.noQuranNote}>No example in the Quran</Text>
          ) : translation ? (
            <Text style={styles.translation}>“{translation}”</Text>
          ) : (
            <Text style={styles.translationMissing}>
              No translation available
            </Text>
          )}

          {isSingleWord ? (
            <WordGrammarBlock
              word={words[0]}
              isOnly
              chapterKey={chapterKey}
              ruleKey={ruleKey}
              onSubtleCard={noQuranExample}
            />
          ) : ruleKey === 'ayahs-with-vpn' ? null : (
            <View style={styles.wordBlocks}>
              {words.map((w, i) => (
                <WordGrammarBlock
                  key={`${w.wordNo ?? w.text}-${i}`}
                  word={w}
                  chapterKey={chapterKey}
                  ruleKey={ruleKey}
                  onSubtleCard={noQuranExample}
                />
              ))}
            </View>
          )}

          {!noQuranExample ? (
            <View style={styles.flipButtons}>
              {rootsAvailable ? (
                <Pressable
                  onPress={onShowRoots}
                  accessibilityRole="button"
                  accessibilityLabel="Show root meaning"
                  style={({ pressed }) => [
                    styles.flipButton,
                    pressed && styles.flipButtonPressed,
                  ]}
                >
                  <Text style={styles.flipButtonText}>Root meaning ↺</Text>
                </Pressable>
              ) : null}

              {occurrencesAvailable ? (
                <Pressable
                  onPress={onShowOccurrences}
                  accessibilityRole="button"
                  accessibilityLabel="Show where this occurs in the Quran"
                  style={({ pressed }) => [
                    styles.occurrencesButton,
                    pressed && styles.flipButtonPressed,
                  ]}
                >
                  <Text style={styles.occurrencesButtonText}>
                    {occurrenceTotal > 0
                      ? `In the Quran · ${occurrenceTotal} ↺`
                      : 'In the Quran ↺'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            backMode === 'occurrences' && styles.cardBackOccurrences,
            backFaceStyle,
          ]}
          pointerEvents={flipped ? 'auto' : 'none'}
        >
          {backMode === 'occurrences' ? (
            <OccurrencesBack
              words={words}
              translation={translation}
              chapterKey={chapterKey}
              occurrences={occurrences}
              total={occurrenceTotal}
              loading={loadingOccurrences}
              loadingMore={loadingMoreOccurrences}
              error={occurrencesError}
              hasMore={occurrences.length < occurrenceTotal}
              onLoadMore={onLoadMoreOccurrences}
              onFlipBack={onFlipBack}
            />
          ) : (
            <CardBack
              roots={roots ?? []}
              loading={loadingRoots}
              onFlipBack={onFlipBack}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  flipInner: {
    flex: 1,
    minHeight: 120,
  },
  card: {
    flex: 1,
    backfaceVisibility: 'hidden',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardForged: {
    backgroundColor: COLORS.surfaceAlt,
    shadowOpacity: 0.03,
    elevation: 0,
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.root,
    borderColor: COLORS.root,
  },
  cardBackOccurrences: {
    backgroundColor: COLORS.surfaceDeep,
    borderColor: COLORS.surfaceDeep,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  title: {
    flexShrink: 1,
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  speakerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  speakerButtonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  speakerGlyph: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 14,
    marginLeft: 2,
  },
  phrase: {
    fontFamily: FONTS.arabic,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderStrong,
    marginTop: 16,
    marginBottom: 16,
  },
  translation: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontStyle: 'italic',
    lineHeight: 27,
    textAlign: 'center',
    marginBottom: 18,
  },
  translationMissing: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 18,
  },
  noQuranNote: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 18,
  },
  singleGrammar: {
    marginBottom: 4,
  },
  wordBlocks: {
    gap: 8,
    marginBottom: 4,
  },
  wordBlock: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADII.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  wordBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  wordBlockTitle: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  wordRole: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  wordBlockToggle: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: '600',
    width: 18,
    textAlign: 'center',
  },
  wordBlockBody: {
    marginTop: 8,
  },
  flipButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  flipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    borderColor: COLORS.root,
    backgroundColor: COLORS.rootSoft,
  },
  flipButtonPressed: {
    opacity: 0.6,
  },
  flipButtonText: {
    color: COLORS.root,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  occurrencesButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  occurrencesButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backInner: {
    flex: 1,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  backBadge: {
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.onRoot,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  backBadgeText: {
    color: COLORS.onRoot,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  backDoneButton: {
    borderRadius: RADII.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  backDoneButtonPressed: {
    opacity: 0.6,
  },
  backDoneButtonText: {
    color: COLORS.onRoot,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backScroll: {
    flex: 1,
  },
  backScrollContent: {
    paddingBottom: 8,
  },
  backRootBlock: {
    marginBottom: 14,
  },
  rootLetters: {
    fontFamily: FONTS.arabic,
    color: COLORS.onRoot,
    fontSize: 32,
    lineHeight: 60,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  rootTransliteration: {
    color: COLORS.onRoot,
    opacity: 0.85,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
  cloudPanel: {
    marginTop: 8,
    backgroundColor: COLORS.paper,
    borderRadius: RADII.xl,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  cloudTitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  cloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cloudPill: {
    maxWidth: '100%',
  },
  cloudWord: {
    textAlign: 'center',
  },
  cloudHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14,
  },
  backEmpty: {
    color: COLORS.onRoot,
    opacity: 0.8,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  backLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  backLoadingText: {
    color: COLORS.onRoot,
    fontSize: 14,
  },
});
