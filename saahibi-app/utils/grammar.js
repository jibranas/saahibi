/**
 * Beginner-friendly labels for morphology attribute codes, used by the
 * grammatical-details chips on example cards.
 */

import { isChipUnlocked } from '../data/chapters';

export function formatGender(g) {
  const s = String(g ?? '');
  if (s === '1') return 'Masculine';
  if (s === '2') return 'Feminine';
  return null;
}

export function formatNumber(n) {
  const s = String(n ?? '');
  if (s === '1') return 'Singular';
  if (s === '2') return 'Dual';
  if (s === '3') return 'Plural';
  return null;
}

export function formatCase(c) {
  const s = String(c ?? '');
  if (s.includes('NOM')) return 'Marfu (رفع)';
  if (s.includes('ACC')) return 'Mansub (نصب)';
  if (s.includes('GEN')) return 'Majrur (جر)';
  return null;
}

export function formatState(st) {
  const s = String(st ?? '');
  if (s.includes('INDEF')) return 'Indefinite';
  if (s.includes('DEF')) return 'Definite';
  return null;
}

/** True when the word's main segment is noun-like and worth a chips grid. */
export function isNounLike(partOfSpeech) {
  return ['N', 'PN', 'ADJ'].includes(String(partOfSpeech ?? ''));
}

const POS_ROLES = {
  N: 'Ism (noun)',
  PN: 'Proper noun',
  ADJ: 'Sifah (adjective)',
  PRON: 'Pronoun',
  DEM: 'Ishara (pointing word)',
  REL: 'Relative pronoun',
  P: 'Harf jar (preposition)',
  V: "Fi'l (verb)",
  CONJ: 'Connector',
  DET: 'Definite article',
  NEG: 'Negation particle',
  EMPH: 'Emphasis particle',
  INTG: 'Question particle',
  VOC: 'Calling particle',
  ACC: 'Accusative particle',
};

/** Friendly role label for a part-of-speech code, or null. */
export function roleFromPartOfSpeech(partOfSpeech) {
  return POS_ROLES[String(partOfSpeech ?? '')] ?? null;
}

/**
 * The four chips shown in the "Grammatical details" grid.
 * Returns [{ label, value }] with only the attributes that exist and are
 * unlocked for `chapterKey` (cumulative by curriculum chapter identity).
 * Unknown / missing chapter → no chips (safe for early lessons).
 */
export function grammarChips(grammar, { chapterKey } = {}) {
  if (!grammar) return [];
  const chips = [
    { label: 'JINS', value: formatGender(grammar.gender) },
    { label: 'ADAD', value: formatNumber(grammar.number) },
    { label: "I'RAAB", value: formatCase(grammar.nominalCase) },
    { label: "WUS'AT", value: formatState(grammar.nominalState) },
  ];
  return chips.filter(
    (c) => c.value != null && isChipUnlocked(c.label, chapterKey)
  );
}
