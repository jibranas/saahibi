import { StyleSheet, Text, View } from 'react-native';

import { COLORS, FONTS, RADII } from '../theme';

const DEFAULT_COLUMNS = [
  { key: 'gen', label: 'Majroor', labelAr: 'مجرور', mark: 'ـٍ' },
  { key: 'acc', label: 'Mansoob', labelAr: 'منصوب', mark: 'ـً' },
  { key: 'nom', label: "'Marfoo", labelAr: 'مرفوع', mark: 'ـٌ' },
];

function Cell({ cell, compact }) {
  return (
    <View style={[styles.cell, compact && styles.cellCompact]}>
      <Text
        style={[styles.cellAr, compact && styles.cellArCompact]}
        numberOfLines={1}
      >
        {cell.ar}
      </Text>
      {compact ? null : (
        <>
          <Text style={styles.cellTl} numberOfLines={1}>
            {cell.transliteration}
          </Text>
          <Text style={styles.cellEn} numberOfLines={1}>
            {cell.en}
          </Text>
        </>
      )}
    </View>
  );
}

/**
 * Live layout of a cheat-sheet table. `compact` shrinks type for library
 * thumbnails (Arabic only). Tilt and shadow belong on the wrapper, not here.
 */
export default function CheatSheetPaper({ sheet, compact = false }) {
  if (!sheet) return null;
  const columns = sheet.columns ?? DEFAULT_COLUMNS;
  const groups = sheet.groups ?? [];

  return (
    <View style={[styles.paper, compact && styles.paperCompact]}>
      <Text
        style={[styles.title, compact && styles.titleCompact]}
        numberOfLines={1}
      >
        {sheet.title}
      </Text>
      <Text
        style={[styles.subtitle, compact && styles.subtitleCompact]}
        numberOfLines={1}
      >
        {sheet.subtitleAr}
      </Text>

      <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            {columns.map((col) => (
              <View key={col.key} style={styles.headerCell}>
                <Text
                  style={[styles.headerLabel, compact && styles.headerLabelCompact]}
                  numberOfLines={1}
                >
                  {col.label}
                </Text>
                {compact ? null : (
                  <Text style={styles.headerMeta} numberOfLines={1}>
                    {col.labelAr} ({col.mark})
                  </Text>
                )}
              </View>
            ))}
            <View style={[styles.sideCol, compact && styles.sideColCompact]} />
          </View>

          {groups.map((group, gi) => {
            const genderColor =
              group.gender === 'feminine'
                ? COLORS.feminine
                : COLORS.masculine;
            return (
              <View key={group.gender}>
                <View
                  style={[
                    styles.genderBanner,
                    gi > 0 && styles.groupStart,
                    compact && styles.genderBannerCompact,
                  ]}
                >
                  <Text
                    style={[styles.genderLabel, { color: genderColor }]}
                    numberOfLines={1}
                  >
                    {group.labelAr}
                    {compact ? '' : `  ${group.label}`}
                  </Text>
                </View>
                {group.rows.map((row) => (
                  <View
                    key={`${group.gender}-${row.number}`}
                    style={styles.row}
                  >
                    {columns.map((col) => (
                      <Cell
                        key={col.key}
                        cell={row.cells[col.key]}
                        compact={compact}
                      />
                    ))}
                    <View
                      style={[
                        styles.sideCol,
                        compact && styles.sideColCompact,
                      ]}
                    >
                      <Text
                        style={[styles.numberAr, { color: genderColor }]}
                        numberOfLines={1}
                      >
                        {row.labelAr}
                      </Text>
                      {compact ? null : (
                        <Text
                          style={[styles.numberEn, { color: genderColor }]}
                          numberOfLines={1}
                        >
                          {row.label}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: COLORS.paper,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 10,
  },
  paperCompact: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  title: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 9,
  },
  subtitle: {
    fontFamily: FONTS.arabic,
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 28,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  subtitleCompact: {
    fontSize: 8,
    lineHeight: 14,
    marginBottom: 4,
  },
  table: {
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  headerRow: {
    borderTopWidth: 0,
    paddingBottom: 6,
  },
  groupStart: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderStrong,
  },
  headerCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  headerLabel: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  headerLabelCompact: {
    fontSize: 6,
  },
  headerMeta: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  cellCompact: {
    minHeight: 22,
    paddingVertical: 2,
  },
  cellAr: {
    fontFamily: FONTS.arabic,
    color: COLORS.primary,
    fontSize: 17,
    lineHeight: 30,
    writingDirection: 'rtl',
  },
  cellArCompact: {
    fontSize: 8,
    lineHeight: 14,
  },
  cellTl: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  cellEn: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 1,
  },
  sideCol: {
    width: 52,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 2,
    paddingRight: 2,
  },
  sideColCompact: {
    width: 28,
  },
  genderBanner: {
    alignItems: 'flex-end',
    paddingVertical: 4,
    paddingRight: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  genderBannerCompact: {
    paddingVertical: 2,
  },
  genderLabel: {
    fontFamily: FONTS.arabic,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  numberAr: {
    fontFamily: FONTS.arabic,
    fontSize: 11,
    lineHeight: 18,
    writingDirection: 'rtl',
    fontWeight: '700',
    textAlign: 'right',
  },
  numberEn: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 1,
    textAlign: 'right',
  },
});
