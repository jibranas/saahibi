/**
 * Central design tokens for Saahibi.
 *
 * Change the app's look by editing values here — every screen and component
 * imports its colors, spacing, and radii from this file. No component should
 * hardcode a hex value.
 */

export const COLORS = {
  // Surfaces
  background: '#faf8f2', // warm cream app background
  surface: '#ffffff', // cards
  surfaceAlt: '#f4f1e7', // subtle inset panels (notes, chips)
  surfaceDeep: '#123e33', // deep green filled surfaces (primary buttons)

  // Brand
  primary: '#123e33', // deep green — headers, buttons, Arabic accents
  primarySoft: '#e7efe9', // tinted green wash (icon chips, highlights)
  accent: '#d9a441', // gold — highlights, current item, ayah highlight border
  accentSoft: '#f6ecd4', // soft gold wash — highlighted word background

  // Root meaning (card back + root letters inside words)
  root: '#b3392f', // deep red
  rootSoft: '#f7e8e5',
  onRoot: '#fdf6f4', // text on the red card back

  // Arabic word segment coloring
  rootLetters: '#b3392f', // root letters inside a word
  particle: '#1d5c46', // particles / prefixes (في، بِ، ال …)

  // Text
  textPrimary: '#1d1d1b',
  textSecondary: '#6b6b63',
  textMuted: '#9b998c',
  onPrimary: '#f7f5ee', // text on deep green

  // Cheat-sheet paper
  paper: '#fffdf8',
  paperFold: '#ebe6d8',
  paperEdge: '#d8d0bc',
  paperHighlight: '#ffffff',
  masculine: '#2c4a86',
  feminine: '#b54d7a',

  // Lines & misc
  border: '#e4e0d2',
  borderStrong: '#d4d0bf',
  danger: '#b3392f',
  shadow: '#000000',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const TYPE = {
  arabicLarge: 34,
  arabicHuge: 44,
  arabicPhrase: 30,
  kicker: 11,
  title: 22,
  body: 15,
};

/** Custom typefaces. Components must use these tokens — never hardcode a family. */
export const FONTS = {
  // QPC Uthmanic Hafs V22 — Madinah Mushaf style for Quranic Arabic
  arabic: 'QPCHafs',
};
