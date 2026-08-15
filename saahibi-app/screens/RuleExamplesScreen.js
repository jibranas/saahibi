import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import ExampleCard from '../components/ExampleCard';
import RevealList from '../components/RevealList';
import PatternCard from '../components/PatternCard';
import { getLessonIntro } from '../data/rules';
import { COLORS } from '../theme';
import { getApiBaseUrl } from '../utils/api';
import {
  fetchRuleExamples,
  peekRuleExamples,
  prefetchRuleExamples,
} from '../utils/ruleExamples';

function exampleKey(item, index) {
  if (item.noQuranExample) {
    return `no-quran-${item.lemma ?? 'x'}-${item.case ?? 'c'}-${index}`;
  }
  const wordNo = item.words?.[0]?.wordNo ?? 'w';
  return `${item.surahId}-${item.ayahNo}-${wordNo}-${index}`;
}

function sameRef(example, word, candidate) {
  return (
    candidate?.wordNo != null &&
    Number(candidate.wordNo) === Number(word?.wordNo) &&
    Number(candidate.surahId ?? example.surahId) === Number(example.surahId) &&
    Number(candidate.ayahNo ?? example.ayahNo) === Number(example.ayahNo)
  );
}

function translationFromPattern(example, word, pattern) {
  if (!pattern || typeof pattern !== 'object') return null;

  for (const candidate of Object.values(pattern)) {
    if (
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      sameRef(example, word, candidate)
    ) {
      return candidate.translations ?? null;
    }
  }

  return null;
}

/**
 * Normalize the different legacy API response shapes into ExampleCard's
 * index-aligned translation contract. A single word receives one translation;
 * a phrase receives one entry per word, in the same order as `words`.
 */
function withNormalizedTranslations(example, pattern) {
  if (example.translations != null) return example;

  const words = Array.isArray(example.words) ? example.words : [];
  const translations = words.map(
    (word) =>
      word?.translations ??
      translationFromPattern(example, word, pattern) ??
      null
  );

  return {
    ...example,
    translations: words.length === 1 ? translations[0] : translations,
  };
}

function loadedState(data) {
  const rawExamples = Array.isArray(data.examples) ? data.examples : [];
  const patterns = Array.isArray(data.patterns) ? data.patterns : [];
  return {
    loading: false,
    error: null,
    examples: rawExamples.map((example, index) =>
      withNormalizedTranslations(example, patterns[index])
    ),
    meta: {
      total: data.totalMatches ?? data.totalPatterns ?? null,
      scanned: data.scannedSegments ?? null,
    },
  };
}

const LOADING_STATE = { loading: true, error: null, examples: [], meta: null };

/**
 * Generic screen for any backend route returning `{ examples: [{ surahId,
 * ayahNo, words: [{ wordNo }], text?, translations? }, ...] }`.
 *
 * `nextEndpoint` is warmed in the background so tapping through to the next
 * lesson doesn't wait on a request.
 */
export default function RuleExamplesScreen({
  rule,
  header,
  onNextLesson,
  nextEndpoint,
  onCheatSheets,
}) {
  // A lesson prefetched from its intro screen is already here, so it renders
  // on the first frame with no loading state at all.
  const [state, setState] = useState(() => {
    const cached = peekRuleExamples(rule.endpoint);
    return cached ? loadedState(cached) : LOADING_STATE;
  });
  const { examples, error, loading, meta } = state;
  const [ruleExpanded, setRuleExpanded] = useState(false);

  useEffect(() => {
    if (peekRuleExamples(rule.endpoint)) return undefined;

    let cancelled = false;
    fetchRuleExamples(rule.endpoint)
      .then((data) => {
        if (!cancelled) setState(loadedState(data));
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: e.message ?? 'Request failed',
          examples: [],
          meta: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [rule.endpoint]);

  useEffect(() => {
    if (nextEndpoint) prefetchRuleExamples(nextEndpoint);
  }, [nextEndpoint]);

  const renderItem = useCallback(
    ({ item }) => {
      const words = item.words ?? [];
      const forged = Boolean(item.noQuranExample);
      const forgedGrammar = forged
        ? {
            partOfSpeech: 'N',
            number: 2,
            nominalCase: item.case ?? null,
            nominalState: 'INDEF',
            gender: item.gender ?? null,
          }
        : null;
      return (
        <ExampleCard
          surahId={item.surahId}
          ayahNo={item.ayahNo}
          words={words.map((w) => ({
            wordNo: w?.wordNo,
            text: words.length === 1 ? item.text ?? w?.text : w?.text,
            grammar: forgedGrammar ?? w?.grammar,
            role: w?.role,
          }))}
          translations={item.translations}
          occurrenceCount={item.occurrenceCount}
          phraseRef={item.phraseRef}
          ruleKey={rule.key}
          noQuranExample={forged}
          autoPlay={!forged}
        />
      );
    },
    [rule.key]
  );

  const onAdvance = useCallback(() => {
    setRuleExpanded(false);
  }, []);

  // Repeated phrases are collapsed into one card, so the count is of distinct
  // phrases rather than of raw matches.
  const note =
    meta?.total != null
      ? `${examples.length} phrases · ${meta.total} matches`
      : `${examples.length} phrases`;

  let content;
  if (loading) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.hint}>Loading examples…</Text>
      </View>
    );
  } else if (error) {
    content = (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.hint}>API: {getApiBaseUrl()}</Text>
      </View>
    );
  } else if (examples.length === 0) {
    content = (
      <View style={styles.centered}>
        <Text style={styles.empty}>No examples found.</Text>
        <Text style={styles.hint}>API: {getApiBaseUrl()}</Text>
      </View>
    );
  } else {
    content = (
      <RevealList
        style={styles.list}
        data={examples}
        keyExtractor={exampleKey}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onAdvance={onAdvance}
        onNextLesson={onNextLesson}
        onCheatSheets={onCheatSheets}
        note={note}
      />
    );
  }

  // The rule card comes from local data, so it renders straight away and stays
  // put once the examples arrive rather than replacing a full-screen spinner.
  return (
    <View style={styles.body}>
      {header}
      <View style={styles.introWrap}>
        <PatternCard
          intro={getLessonIntro(rule.key)}
          body={rule.rule}
          ruleKey={rule.ruleTtsKey ?? rule.key}
          expanded={ruleExpanded}
          onToggleExpanded={() => setRuleExpanded((e) => !e)}
          overlayDetails
        />
      </View>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 52,
    paddingBottom: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  introWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 20,
    elevation: 20,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
  },
  error: {
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 12,
  },
  empty: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
