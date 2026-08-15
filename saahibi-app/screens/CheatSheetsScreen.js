import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CheatSheetPaper from '../components/CheatSheetPaper';
import { CHEAT_SHEETS } from '../data/cheatSheets';
import { COLORS } from '../theme';

function SheetThumbnail({ sheet, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.thumbWrap,
        pressed && styles.thumbPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${sheet.title}`}
    >
      <View style={styles.page} pointerEvents="none">
        <View style={styles.pageInner}>
          <CheatSheetPaper sheet={sheet} compact />
        </View>
      </View>
      <Text style={styles.thumbTitle} numberOfLines={2}>
        {sheet.title}
      </Text>
    </Pressable>
  );
}

export default function CheatSheetsScreen({ onBack, onOpenSheet }) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.backPressed}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.back}>← Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.titles}>
          <Text style={styles.brand}>Cheat sheets</Text>
          <Text style={styles.tag}>Paper references you can reopen anytime</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {CHEAT_SHEETS.map((sheet) => (
          <SheetThumbnail
            key={sheet.key}
            sheet={sheet}
            onPress={() => onOpenSheet(sheet)}
          />
        ))}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingRight: 108,
  },
  back: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  backPressed: {
    opacity: 0.65,
  },
  backSpacer: {
    height: 0,
  },
  titles: {
    paddingHorizontal: 4,
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
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 20,
  },
  thumbWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  thumbPressed: {
    opacity: 0.9,
  },
  page: {
    width: 210,
    height: 297,
    backgroundColor: COLORS.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.paperEdge,
    transform: [{ rotate: '-2deg' }],
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    paddingTop: 18,
    paddingHorizontal: 14,
  },
  pageInner: {
    transform: [{ scale: 0.72 }],
    width: '139%',
    marginLeft: '-19.5%',
  },
  thumbTitle: {
    marginTop: 20,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
