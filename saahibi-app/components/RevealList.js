import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, RADII } from '../theme';
import CheatSheetsButton from './CheatSheetsButton';

// Small gap so the last card doesn't clip against the sticky footer border.
const PAGE_BOTTOM_GAP = 4;

/**
 * Renders a list of items one-at-a-time with a sticky "Next example" button
 * and an optional "Next lesson" button below it. Each revealed item fills
 * nearly the entire list viewport so the user never needs to scroll to find
 * the "Next example" button.
 *
 * Props:
 *  - data / keyExtractor / renderItem / style / contentContainerStyle
 *  - continueLabel — label for the "next" button (default: 'Next example →')
 *  - doneLabel      — shown when all examples are revealed
 *  - onAdvance      — called every time a new item is revealed
 *  - onNextLesson   — when provided renders a secondary "Next lesson" button
 *  - nextLessonLabel
 *  - onCheatSheets  — when provided renders a "Cheat cards" button beside the primary one
 *  - note           — small text rendered below the buttons (e.g. "5 shown · 42 matches")
 */
export default function RevealList({
  data,
  keyExtractor,
  renderItem,
  style,
  contentContainerStyle,
  continueLabel = 'Next example →',
  doneLabel = "You've reached the end of this lesson",
  onAdvance,
  onNextLesson,
  nextLessonLabel = 'Next lesson →',
  onCheatSheets,
  note,
}) {
  const [visibleCount, setVisibleCount] = useState(data.length > 0 ? 1 : 0);
  const [listHeight, setListHeight] = useState(0);
  const listRef = useRef(null);
  const shouldScrollRef = useRef(false);

  useEffect(() => {
    setVisibleCount(data.length > 0 ? 1 : 0);
    shouldScrollRef.current = false;
  }, [data]);

  const visible = data.slice(0, visibleCount);
  const hasMore = visibleCount < data.length;
  const total = data.length;

  const onListLayout = useCallback((e) => {
    setListHeight(e.nativeEvent.layout.height);
  }, []);

  const onContinue = useCallback(() => {
    if (visibleCount >= total) return;
    shouldScrollRef.current = true;
    setVisibleCount((c) => Math.min(c + 1, total));
    onAdvance?.();
  }, [visibleCount, total, onAdvance]);

  const onContentSizeChange = useCallback(() => {
    if (shouldScrollRef.current) {
      shouldScrollRef.current = false;
      requestAnimationFrame(() => {
        // Scroll so the newly revealed item is at the top of the viewport.
        listRef.current?.scrollToIndex({
          index: visibleCount - 1,
          animated: true,
          viewPosition: 0,
        });
      });
    }
  }, [visibleCount]);

  const onScrollToIndexFailed = useCallback(
    ({ averageItemLength, index }) => {
      const offset = averageItemLength * index;
      listRef.current?.scrollToOffset({ offset, animated: true });
    },
    []
  );

  // Wrap each rendered item in a page container that fills the viewport height.
  // The card inside stretches to fill the container via flex: 1.
  const renderPage = useCallback(
    (info) => (
      <View
        style={[
          styles.page,
          listHeight > 0 && {
            height: listHeight - PAGE_BOTTOM_GAP,
          },
        ]}
      >
        {renderItem(info)}
      </View>
    ),
    [renderItem, listHeight]
  );

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.listWrap} onLayout={onListLayout}>
        <FlatList
          ref={listRef}
          data={visible}
          keyExtractor={keyExtractor}
          renderItem={renderPage}
          contentContainerStyle={contentContainerStyle}
          onContentSizeChange={onContentSizeChange}
          onScrollToIndexFailed={onScrollToIndexFailed}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        />
      </View>

      <View style={styles.stickyFooter}>
        <View style={styles.footerRow}>
          <View style={styles.footerMain}>
            {hasMore ? (
              <Pressable
                onPress={onContinue}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonLabel} numberOfLines={1}>
                  {continueLabel}
                </Text>
                <Text style={styles.buttonCount}>
                  {visibleCount} / {total}
                </Text>
              </Pressable>
            ) : total > 0 ? (
              <View style={styles.doneBox}>
                <Text style={styles.doneLabel}>{doneLabel}</Text>
                <Text style={styles.doneCount}>{total} total</Text>
              </View>
            ) : null}
          </View>
          {onCheatSheets ? (
            <View style={styles.footerSide}>
              <CheatSheetsButton onPress={onCheatSheets} />
            </View>
          ) : null}
        </View>

        {onNextLesson ? (
          <Pressable
            onPress={onNextLesson}
            style={({ pressed }) => [
              styles.nextLessonButton,
              pressed && styles.nextLessonButtonPressed,
            ]}
          >
            <Text style={styles.nextLessonLabel}>{nextLessonLabel}</Text>
          </Pressable>
        ) : null}

        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  listWrap: {
    flex: 1,
  },
  page: {
    // height is set dynamically from listHeight; child cards stretch to fill it
    overflow: 'hidden',
    paddingVertical: 10,
  },
  stickyFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  footerMain: {
    flex: 1,
  },
  footerSide: {
    flexBasis: '38%',
    flexShrink: 0,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: COLORS.surfaceDeep,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: RADII.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  buttonCount: {
    color: COLORS.onPrimary,
    opacity: 0.7,
    fontSize: 13,
    fontWeight: '600',
  },
  doneBox: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  doneLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  doneCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  nextLessonButton: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  nextLessonButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  nextLessonLabel: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  note: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
