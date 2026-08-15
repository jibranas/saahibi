import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getChapterByKey, getLessonsForChapter, CHAPTERS } from '../data/chapters';
import { COLORS, RADII } from '../theme';
import CurriculumTitle from '../components/CurriculumTitle';

function LessonRow({ lesson, lessonNumber, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowBody}>
        <Text style={styles.lessonNo}>Lesson {lessonNumber}</Text>
        <CurriculumTitle
          size="compact"
          simpleTitle={lesson.simpleTitle}
          titleArabic={lesson.titleArabic}
          title={lesson.title}
        />
      </View>
      <Text style={styles.arrow}>→</Text>
    </Pressable>
  );
}

export default function ChapterScreen({
  chapterKey,
  onOpenLesson,
  header,
  hiddenRuleKeys,
}) {
  const chapter = getChapterByKey(chapterKey);
  const lessons = getLessonsForChapter(chapterKey, hiddenRuleKeys);
  const chapterIndex = CHAPTERS.findIndex((c) => c.key === chapterKey);

  if (!chapter) {
    return (
      <View style={styles.body}>
        {header}
        <View style={styles.centered}>
          <Text style={styles.empty}>Chapter not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      {header}
      <FlatList
        data={lessons}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.chapterHeader}>
            <Text style={styles.kicker}>Chapter {chapterIndex + 1}</Text>
            <CurriculumTitle
              simpleTitle={chapter.simpleTitle}
              titleArabic={chapter.titleArabic}
              title={chapter.title}
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <LessonRow
            lesson={item}
            lessonNumber={`${chapterIndex + 1}.${index + 1}`}
            onPress={() => onOpenLesson(item.key)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 52,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  empty: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  chapterHeader: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  kicker: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  rowBody: {
    flex: 1,
  },
  lessonNo: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  arrow: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
});
