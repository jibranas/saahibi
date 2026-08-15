import { RULES, getRuleByKey } from './rules';

/**
 * Chapters group the flat rule manifest into a beginner-friendly curriculum.
 * Each chapter lists its lessons by rule key, in teaching order (which mirrors
 * the original manifest order).
 */
export const CHAPTERS = [
  {
    key: 'foundations',
    simpleTitle: 'What is an Arabic Word?',
    titleArabic: 'أَنْوَاعُ الكَلِمَة',
    title: 'Types of the Word',
    description:
      "Every Arabic word is an Ism, a Fi'l, or a Harf. Meet each type on its own, then see all three working together in an ayah.",
    lessonKeys: [
      'single-word-ism',
      'single-word-fil',
      'single-word-harf',
      'ayahs-with-vpn',
    ],
  },
  {
    key: 'word-endings',
    simpleTitle: 'How Words End',
    titleArabic: 'الإِعْرَاب',
    title: "I'rab and Fixed Endings",
    description:
      'Nouns may be fully flexible, partially flexible, or fixed — learn how endings show i\'rab, and when they do not.',
    lessonKeys: ['tanween-irab', 'ghair-munsarif', 'mabni-asma'],
  },
  {
    key: 'feminine-nouns',
    simpleTitle: 'Masculine and Feminine',
    titleArabic: 'المُذَكَّر وَالمُؤَنَّث',
    title: 'The Masculine and the Feminine',
    description:
      'Spot feminine nouns by their endings — ta marbuta, stretched alif, shortened alif — and by meaning when no marker is there.',
    lessonKeys: [
      'feminine-nouns',
      'feminine-irab',
      'fatha-hamza-damma',
      'fatha-hamza-indef',
      'fatha-yaa-feminines',
      'feminine-by-meaning',
    ],
  },
  {
    key: 'duals-plurals',
    simpleTitle: 'One, Two, and Many',
    titleArabic: 'الوَاحِد وَالمُثَنَّى وَالجَمْع',
    title: 'The One, the Dual, and the Plural',
    description:
      'Arabic counts one, two, and many. Learn the dual, the sound plurals, and the broken plurals.',
    lessonKeys: [
      'dual-nouns-intro',
      'male-plural-intro',
      'female-plural-intro',
      'broken-plurals',
    ],
  },
  {
    key: 'definite-indefinite',
    simpleTitle: 'A Book vs. The Book',
    titleArabic: 'النَّكِرَة وَالمَعْرِفَة',
    title: 'The Indefinite and the Definite',
    description:
      'Distinguish "a book" from "the book" — tanween for the indefinite, ال for the definite, and the sentences they build.',
    lessonKeys: ['marifa-nakira', 'al-nom-indef'],
  },
  {
    key: 'pronouns-sentences',
    simpleTitle: 'He, She, You and I',
    titleArabic: 'الضَّمَائِر وَالجُمْلَة',
    title: 'Pronouns and the Sentence',
    description:
      'Build your first full sentences with he, she, you, I, and we — no verb needed.',
    lessonKeys: [
      'huwa-indef',
      'hiya-indef',
      'anta-indef',
      'antum-actpcpl',
      'ana-indef',
      'nahnu-actpcpl',
    ],
  },
  {
    key: 'demonstratives',
    simpleTitle: 'This and That',
    titleArabic: 'أَسْمَاءُ الإِشَارَة',
    title: 'Demonstrative Nouns',
    description:
      'This, that, these, those — the demonstratives that point near and far, for one, two, or many.',
    lessonKeys: [
      'hatha-indef',
      'hathihi-indef',
      'hathihi-plural',
      'hathani-nom',
      'haulai-indef',
      'dhalika-indef',
      'dhanika-nom',
      'tilka-sing-indef',
      'tilka-plural-indef',
      'ulaaika-indef',
    ],
  },
  {
    key: 'sifah',
    simpleTitle: 'Describing Nouns',
    titleArabic: 'المَوْصُوف وَالصِّفَة',
    title: 'The Described and the Descriptor',
    description:
      'How adjectives follow their nouns and agree with them in four ways — case, state, gender, and number.',
    lessonKeys: [
      'mawsuf-sifah',
      'mawsuf-sifah-plural',
      'mubtada-khabar-sifah',
      'mubtada-sifah-khabar',
    ],
  },
  {
    key: 'murakkab-ishara',
    simpleTitle: 'This Book, That House',
    titleArabic: 'المُرَكَّب الإِشَارِي',
    title: 'The Demonstrative Compound',
    description:
      'When a pointing word joins a definite noun — "this book", "that path" — and how the compound behaves in sentences.',
    lessonKeys: [
      'murakkab-ishara',
      'hathihi-plural-ghayr-aaqil',
      'murakkab-ishara-mubtada-khabar',
      'murakkab-ishara-sifat',
    ],
  },
  {
    key: 'idafa-basics',
    simpleTitle: 'Showing Ownership',
    titleArabic: 'الإِضَافَة',
    title: 'The Possessive Construction',
    description:
      '"The book of Allah", "the Lord of the worlds" — two nouns chained together to show belonging.',
    lessonKeys: [
      'idafa-male-sing',
      'idafa-female-sing',
      'idafa-mubtada-khabar',
      'idafa-dual-mubtada-khabar',
      'mubtada-khabar-idafa',
      'kullu-indef',
      'kullu-def',
    ],
  },
  {
    key: 'idafa-duals-plurals',
    simpleTitle: 'Ownership with Duals and Plurals',
    titleArabic: 'الإِضَافَة مَعَ المُثَنَّى وَالجَمْع',
    title: 'Idafa with the Dual and the Plural',
    description:
      'What happens to dual and plural endings when nouns enter an idafa chain.',
    lessonKeys: [
      'idafa-dual-male',
      'idafa-plural-male',
      'idafa-dual-female',
      'idafa-plural-female',
      'idafa-muzaf-dual-male',
      'idafa-muzaf-dual-female',
      'idafa-muzaf-plural-male',
      'idafa-muzaf-plural-female',
      'idafa-muzaf-plural-male-saalim',
      'idafa-muzaf-plural-female-saalim',
    ],
  },
  {
    key: 'idafa-pronouns',
    simpleTitle: 'My, Your, His, Her...',
    titleArabic: 'الإِضَافَة مَعَ الضَّمَائِر',
    title: 'Idafa with Pronouns',
    description:
      'My, your, his, her, our, their — the attached pronouns that turn one word into a possessive phrase.',
    lessonKeys: [
      'idafa-pronoun-his',
      'idafa-pronoun-her',
      'idafa-pronoun-your-m-sing',
      'idafa-pronoun-your-f-sing',
      'idafa-pronoun-their-dual',
      'idafa-pronoun-your-dual',
      'idafa-pronoun-their-m-pl',
      'idafa-pronoun-their-f-pl',
      'idafa-pronoun-your-m-pl',
      'idafa-pronoun-your-f-pl',
      'idafa-pronoun-my',
      'idafa-pronoun-our',
      'idafa-zameer-khabar',
      'mubtada-khabar-idafa-zameer',
    ],
  },
  {
    key: 'pronoun-sound-changes',
    simpleTitle: 'How Pronouns Change',
    titleArabic: 'تَغَيُّرَات الضَّمَائِر',
    title: 'Pronoun Changes',
    description:
      'Why هُ sometimes becomes هِ, and how the pronoun ي (my) changes shape after different letters.',
    lessonKeys: [
      'idafa-pronoun-hu-fatha-dammah',
      'idafa-pronoun-hi-kasra',
      'idafa-pronoun-hi-ya',
      'idafa-pronoun-hu-sukoon',
      'idafa-pronoun-hima',
      'idafa-pronoun-him',
      'idafa-pronoun-hinna',
      'idafa-ya-fatha-after-alif',
      'idafa-ya-shadda-two-yas',
      'idafa-ya-fatha-joining-next',
    ],
  },
  {
    key: 'five-nouns',
    simpleTitle: 'Five Unique Nouns',
    titleArabic: 'الأَسْمَاءُ الخَمْسَة',
    title: 'The Five Nouns',
    description:
      'Five nouns — father, brother, father-in-law, mouth, possessor — that show their case with long vowels.',
    lessonKeys: [
      'idafa-asma-ab',
      'idafa-asma-akh',
      'idafa-asma-ham',
      'idafa-asma-fam',
      'idafa-asma-dhu',
    ],
  },
  {
    key: 'advanced-idafa',
    simpleTitle: 'Chaining Ownership',
    titleArabic: 'الإِضَافَة المُرَكَّبَة',
    title: 'The Complex Possessive',
    description:
      'Longer chains: idafa within idafa, adjectives inside the chain, and pointing words woven in.',
    lessonKeys: [
      'idafa-complex',
      'idafa-mudaf-sifah',
      'idafa-mudaf-ilayhi-sifah',
      'idafa-ishara-mudaf',
      'idafa-ishara-mudaf-ilayhi',
    ],
  },
  {
    key: 'jar-majrur',
    simpleTitle: 'In, By, and With',
    titleArabic: 'الجَارُّ وَالمَجْرُور',
    title: 'The Preposition and its Object',
    description:
      'Little particles with big effects — بِ، تَ، وَ and how they pull the noun after them into the genitive.',
    lessonKeys: [
      'murrakkab-jaari-bi',
      'murrakkab-jaari-bi-two',
      'murrakkab-jaari-bi-idafa',
      'jar-ta',
      'jar-wa',
    ],
  },
];

export function getChapterByKey(key) {
  return CHAPTERS.find((chapter) => chapter.key === key) ?? null;
}

/** Chapter containing the given rule key, or null. */
export function getChapterForRule(ruleKey) {
  return (
    CHAPTERS.find((chapter) => chapter.lessonKeys.includes(ruleKey)) ?? null
  );
}

/**
 * Grammatical-detail chips unlock when the learner reaches these chapters
 * (stable keys — not chapter numbers). Cumulative: a chip stays available
 * for every later chapter in CHAPTERS order.
 */
const CHIP_UNLOCK_CHAPTER_KEY = {
  "I'RAAB": 'word-endings',
  JINS: 'feminine-nouns',
  ADAD: 'duals-plurals',
  "WUS'AT": 'definite-indefinite',
};

function chapterOrder(key) {
  if (!key) return -1;
  return CHAPTERS.findIndex((c) => c.key === key);
}

/** True when `label` (e.g. JINS) is unlocked for the given chapter key. */
export function isChipUnlocked(label, chapterKey) {
  const unlockKey = CHIP_UNLOCK_CHAPTER_KEY[label];
  if (!unlockKey) return true;
  const current = chapterOrder(chapterKey);
  const unlockAt = chapterOrder(unlockKey);
  if (current < 0 || unlockAt < 0) return false;
  return current >= unlockAt;
}

/**
 * Lesson number label like "3.2" (chapter index . lesson index, 1-based).
 * Returns null if the rule is not in any chapter.
 */
export function getLessonNumber(ruleKey) {
  for (let c = 0; c < CHAPTERS.length; c++) {
    const i = CHAPTERS[c].lessonKeys.indexOf(ruleKey);
    if (i !== -1) return `${c + 1}.${i + 1}`;
  }
  return null;
}

/**
 * Ordered rule entries for a chapter (skips unknown keys).
 * Pass `hiddenRuleKeys` (Set or array) to omit curated-hidden lessons.
 */
export function getLessonsForChapter(chapterKey, hiddenRuleKeys = null) {
  const chapter = getChapterByKey(chapterKey);
  if (!chapter) return [];
  const hidden = toHiddenSet(hiddenRuleKeys);
  return chapter.lessonKeys
    .map((key) => getRuleByKey(key))
    .filter(Boolean)
    .filter((rule) => !hidden.has(rule.key));
}

/**
 * Returns the rule key of the lesson that follows the given one in the
 * curriculum — the next lesson in the same chapter, or the first lesson of the
 * next chapter. Returns null if the rule is at the very end or not found.
 * Skips hidden rules and lessons inside hidden chapters when those sets are provided.
 */
export function getNextLessonKey(
  ruleKey,
  hiddenRuleKeys = null,
  hiddenChapterKeys = null
) {
  const hiddenRules = toHiddenSet(hiddenRuleKeys);
  const hiddenChapters = toHiddenSet(hiddenChapterKeys);
  const flat = [];
  for (const chapter of CHAPTERS) {
    if (hiddenChapters.has(chapter.key)) continue;
    for (const key of chapter.lessonKeys) flat.push(key);
  }
  const start = flat.indexOf(ruleKey);
  if (start === -1) return null;
  for (let i = start + 1; i < flat.length; i += 1) {
    const key = flat[i];
    if (!hiddenRules.has(key) && getRuleByKey(key)) return key;
  }
  return null;
}

function toHiddenSet(hiddenRuleKeys) {
  if (!hiddenRuleKeys) return new Set();
  if (hiddenRuleKeys instanceof Set) return hiddenRuleKeys;
  return new Set(hiddenRuleKeys);
}

/** Sanity helper: rule keys not assigned to any chapter. */
export function getUnassignedRuleKeys() {
  const assigned = new Set(CHAPTERS.flatMap((c) => c.lessonKeys));
  return RULES.filter((r) => !assigned.has(r.key)).map((r) => r.key);
}
