/**
 * Reference sheets shown in the Cheat sheets library.
 * Each sheet is a case × number × gender grid around one paradigm word.
 */

export const CASE_COLUMNS = [
  { key: 'gen', label: 'Majroor', labelAr: 'مجرور', mark: 'ـٍ' },
  { key: 'acc', label: 'Mansoob', labelAr: 'منصوب', mark: 'ـً' },
  { key: 'nom', label: "'Marfoo", labelAr: 'مرفوع', mark: 'ـٌ' },
];

export const CHEAT_SHEETS = [
  {
    key: 'jam-saalim-muslim',
    title: "Jam' Saalim — Muslim",
    subtitleAr: 'مُسْلِم • مذكر ومؤنث',
    columns: CASE_COLUMNS,
    groups: [
      {
        gender: 'masculine',
        label: 'Mudhakkar',
        labelAr: 'مذكر',
        rows: [
          {
            number: 'singular',
            label: 'Waahid',
            labelAr: 'واحد',
            cells: {
              gen: {
                ar: 'مُسْلِمٍ',
                transliteration: 'Muslimin',
                en: 'a Muslim (m.)',
              },
              acc: {
                ar: 'مُسْلِمًا',
                transliteration: 'Musliman',
                en: 'a Muslim (m.)',
              },
              nom: {
                ar: 'مُسْلِمٌ',
                transliteration: 'Muslimun',
                en: 'a Muslim (m.)',
              },
            },
          },
          {
            number: 'dual',
            label: 'Muthanna',
            labelAr: 'مثنى',
            cells: {
              gen: {
                ar: 'مُسْلِمَيْنِ',
                transliteration: 'Muslimayni',
                en: 'two Muslims (m.)',
              },
              acc: {
                ar: 'مُسْلِمَيْنِ',
                transliteration: 'Muslimayni',
                en: 'two Muslims (m.)',
              },
              nom: {
                ar: 'مُسْلِمَانِ',
                transliteration: 'Muslimaani',
                en: 'two Muslims (m.)',
              },
            },
          },
          {
            number: 'plural',
            label: "Jam'a",
            labelAr: 'جمع',
            cells: {
              gen: {
                ar: 'مُسْلِمِينَ',
                transliteration: 'Muslimeena',
                en: 'Muslims (m.)',
              },
              acc: {
                ar: 'مُسْلِمِينَ',
                transliteration: 'Muslimeena',
                en: 'Muslims (m.)',
              },
              nom: {
                ar: 'مُسْلِمُونَ',
                transliteration: 'Muslimoona',
                en: 'Muslims (m.)',
              },
            },
          },
        ],
      },
      {
        gender: 'feminine',
        label: 'Muannath',
        labelAr: 'مؤنث',
        rows: [
          {
            number: 'singular',
            label: 'Waahid',
            labelAr: 'واحد',
            cells: {
              gen: {
                ar: 'مُسْلِمَةٍ',
                transliteration: 'Muslimatin',
                en: 'a Muslim (f.)',
              },
              acc: {
                ar: 'مُسْلِمَةً',
                transliteration: 'Muslimatan',
                en: 'a Muslim (f.)',
              },
              nom: {
                ar: 'مُسْلِمَةٌ',
                transliteration: 'Muslimatun',
                en: 'a Muslim (f.)',
              },
            },
          },
          {
            number: 'dual',
            label: 'Muthanna',
            labelAr: 'مثنى',
            cells: {
              gen: {
                ar: 'مُسْلِمَتَيْنِ',
                transliteration: 'Muslimatayni',
                en: 'two Muslims (f.)',
              },
              acc: {
                ar: 'مُسْلِمَتَيْنِ',
                transliteration: 'Muslimatayni',
                en: 'two Muslims (f.)',
              },
              nom: {
                ar: 'مُسْلِمَتَانِ',
                transliteration: 'Muslimataani',
                en: 'two Muslims (f.)',
              },
            },
          },
          {
            number: 'plural',
            label: "Jam'a",
            labelAr: 'جمع',
            cells: {
              gen: {
                ar: 'مُسْلِمَاتٍ',
                transliteration: 'Muslimaatin',
                en: 'Muslim women',
              },
              acc: {
                ar: 'مُسْلِمَاتٍ',
                transliteration: 'Muslimaatin',
                en: 'Muslim women',
              },
              nom: {
                ar: 'مُسْلِمَاتٌ',
                transliteration: 'Muslimaatun',
                en: 'Muslim women',
              },
            },
          },
        ],
      },
    ],
  },
];

export function getCheatSheetByKey(key) {
  return CHEAT_SHEETS.find((sheet) => sheet.key === key) ?? null;
}
