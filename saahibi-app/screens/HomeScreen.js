import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CHAPTERS, getLessonsForChapter } from '../data/chapters';
import { COLORS, RADII } from '../theme';
import CurriculumTitle from '../components/CurriculumTitle';

function ChapterCard({ chapter, index, lessonCount, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.chapterNo}>Chapter {index + 1}</Text>

      <CurriculumTitle
        size="card"
        simpleTitle={chapter.simpleTitle}
        titleArabic={chapter.titleArabic}
        title={chapter.title}
      />

      <View style={styles.cardFooter}>
        <Text style={styles.lessonCount}>
          {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
        </Text>
        <Text style={styles.arrow}>→</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen({
  onNavigate,
  hiddenRuleKeys,
  hiddenChapterKeys,
}) {
  const hiddenChapters = hiddenChapterKeys ?? new Set();
  const chapters = CHAPTERS.filter((chapter) => !hiddenChapters.has(chapter.key));

  return (
    <View style={styles.root}>
      <FlatList
        data={chapters}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.brand}>Saahibi</Text>
            <Text style={styles.tag}>Your companion to Qur'anic Arabic</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <ChapterCard
            chapter={item}
            index={index}
            lessonCount={getLessonsForChapter(item.key, hiddenRuleKeys).length}
            onPress={() => onNavigate(`chapter:${item.key}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
  },
  header: {
    paddingHorizontal: 4,
    paddingBottom: 20,
    // Leave room for the global top-right Feedback control.
    paddingRight: 108,
  },
  brand: {
    color: COLORS.primary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tag: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  chapterNo: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  lessonCount: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  arrow: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '700',
  },
});
