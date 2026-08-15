/**
 * Prepare Quranic Arabic from the morphology corpus for on-screen rendering.
 *
 * The Madinah/Uthmani encoding uses a few Quran Complex codepoints that many
 * mobile font stacks (including QPC Hafs under React Native) fail to attach as
 * combining marks. When that happens the engine draws a large dotted-circle
 * placeholder — the "weird circles" on the occurrences face.
 *
 * Map those marks to the widely-supported visual equivalents used by most
 * readers (e.g. quran.com's clean sukun), without changing the underlying
 * morphology data used for search/matching.
 */
export function forArabicDisplay(text) {
  if (text == null || text === '') return text;
  return String(text)
    // Small high rounded / rectangular zero → ordinary sukun
    .replace(/\u06DF/g, '\u0652')
    .replace(/\u06E0/g, '\u0652');
}
