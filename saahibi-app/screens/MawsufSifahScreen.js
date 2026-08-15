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

function toGrammar(word, partOfSpeech) {
  return {
    partOfSpeech,
    root: word.root ?? null,
    gender: word.gender ?? null,
    number: word.number ?? null,
    nominalCase: word.nominalCase ?? null,
    nominalState: word.nominalState ?? null,
  };
}

function loadedState(data) {
  return {
    loading: false,
    error: null,
    patterns: Array.isArray(data.patterns) ? data.patterns : [],
    meta: {
      total: data.totalPatterns ?? null,
      scanned: data.scannedSegments ?? null,
    },
  };
}

const LOADING_STATE = { loading: true, error: null, patterns: [], meta: null };

/**
 * Screen for routes returning `{ patterns: [{ mawsuf, sifah }, ...] }` —
 * each pattern rendered as one ExampleCard with two grammar blocks.
 */
export default function MawsufSifahScreen({
  rule,
  header,
  onNextLesson,
  nextEndpoint,
  onCheatSheets,
}) {
  const [state, setState] = useState(() => {
    const cached = peekRuleExamples(rule.endpoint);
    return cached ? loadedState(cached) : LOADING_STATE;
  });
  const { patterns, error, loading, meta } = state;
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
          patterns: [],
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

  const renderPattern = useCallback(
    ({ item }) => {
      const { mawsuf, sifah } = item;
      return (
        <ExampleCard
          surahId={mawsuf.surahId}
          ayahNo={mawsuf.ayahNo}
          words={[
            {
              wordNo: mawsuf.wordNo,
              text: mawsuf.text,
              role: 'Mawsuf (noun)',
              grammar: toGrammar(mawsuf, 'N'),
            },
            {
              wordNo: sifah.wordNo,
              text: sifah.text,
              role: 'Sifah (adjective)',
              grammar: toGrammar(sifah, 'ADJ'),
            },
          ]}
          translations={[mawsuf.translations, sifah.translations]}
          occurrenceCount={item.occurrenceCount}
          phraseRef={item.phraseRef}
          ruleKey={rule.key}
          autoPlay
        />
      );
    },
    [rule.key]
  );

  const keyExtractor = useCallback(
    (item, index) =>
      `${item.mawsuf.surahId}-${item.mawsuf.ayahNo}-${item.mawsuf.wordNo}-${item.sifah.wordNo}-${index}`,
    []
  );

  const onAdvance = useCallback(() => {
    setRuleExpanded(false);
  }, []);

  // Repeated phrases are collapsed into one card, so the count is of distinct
  // phrases rather than of raw pattern matches.
  const note =
    meta?.total != null
      ? `${patterns.length} phrases · ${meta.total} patterns`
      : `${patterns.length} phrases`;

  let content;
  if (loading) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.hint}>Scanning morphology…</Text>
      </View>
    );
  } else if (error) {
    content = (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.hint}>API: {getApiBaseUrl()}</Text>
      </View>
    );
  } else if (patterns.length === 0) {
    content = (
      <View style={styles.centered}>
        <Text style={styles.empty}>No mawsuf–sifah patterns found.</Text>
        <Text style={styles.hint}>API: {getApiBaseUrl()}</Text>
      </View>
    );
  } else {
    content = (
      <RevealList
        style={styles.list}
        data={patterns}
        keyExtractor={keyExtractor}
        renderItem={renderPattern}
        contentContainerStyle={styles.listContent}
        onAdvance={onAdvance}
        onNextLesson={onNextLesson}
        onCheatSheets={onCheatSheets}
        note={note}
      />
    );
  }

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
