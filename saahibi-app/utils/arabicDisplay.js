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
    .replace(/\u06E0/g, '\u0652')
    // Ibrahim is stored as إِبْرَٰهِۦم: a superscript alif and a small yeh.
    // This font does not join those marks, so the heh splits away from the
    // meem. Spell both long vowels as ordinary letters.
    .replace(
      /\u0631\u064E\u0670\u0647\u0650\u06E6\u0645/g,
      '\u0631\u064E\u0627\u0647\u0650\u064A\u0645'
    );
}
