import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADII } from '../theme';

export const HUB_TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 92 : 72;

function ChaptersIcon({ active }) {
  const stroke = active ? COLORS.primary : COLORS.textMuted;
  return (
    <View style={styles.iconBox}>
      <View style={[styles.book, { borderColor: stroke }]}>
        <View style={[styles.bookSpine, { backgroundColor: stroke }]} />
        <View style={[styles.bookLine, { backgroundColor: stroke }]} />
        <View style={[styles.bookLine, styles.bookLineShort, { backgroundColor: stroke }]} />
      </View>
    </View>
  );
}

function SheetsIcon({ active }) {
  const stroke = active ? COLORS.primary : COLORS.textMuted;
  return (
    <View style={styles.iconBox}>
      <View style={[styles.page, { borderColor: stroke }]}>
        <View style={[styles.pageLine, { backgroundColor: stroke }]} />
        <View style={[styles.pageLine, { backgroundColor: stroke }]} />
        <View style={[styles.pageLine, styles.pageLineShort, { backgroundColor: stroke }]} />
      </View>
    </View>
  );
}

function Tab({ label, active, onPress, icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active && styles.tabActive,
        pressed && styles.tabPressed,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      {icon}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Two-item bar for hub screens: Chapters | Cheat sheets.
 */
export default function HubTabBar({ active, onChapters, onCheatSheets }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Tab
          label="Chapters"
          active={active === 'home'}
          onPress={onChapters}
          icon={<ChaptersIcon active={active === 'home'} />}
        />
        <Tab
          label="Sheets"
          active={active === 'cheatsheets'}
          onPress={onCheatSheets}
          icon={<SheetsIcon active={active === 'cheatsheets'} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    backgroundColor: COLORS.background,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 6,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADII.lg,
    gap: 4,
  },
  tabActive: {
    backgroundColor: COLORS.primarySoft,
  },
  tabPressed: {
    opacity: 0.75,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: COLORS.primary,
  },
  iconBox: {
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  book: {
    width: 18,
    height: 20,
    borderWidth: 1.6,
    borderRadius: 3,
    paddingTop: 5,
    paddingHorizontal: 3,
    gap: 2.5,
  },
  bookSpine: {
    position: 'absolute',
    left: 3,
    top: 2,
    bottom: 2,
    width: 1.6,
    borderRadius: 1,
  },
  bookLine: {
    height: 1.5,
    marginLeft: 4,
    borderRadius: 1,
    opacity: 0.85,
  },
  bookLineShort: {
    width: '62%',
  },
  page: {
    width: 15,
    height: 20,
    borderWidth: 1.6,
    borderRadius: 1.5,
    paddingTop: 5,
    paddingHorizontal: 2.5,
    gap: 2.5,
  },
  pageLine: {
    height: 1.4,
    borderRadius: 1,
    opacity: 0.85,
  },
  pageLineShort: {
    width: '55%',
  },
});
