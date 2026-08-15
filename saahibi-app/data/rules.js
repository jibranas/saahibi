/**
 * Canonical ordered manifest of dynamic rule entries.
 *
 * The order MUST match `data/rules.ts` in the `quranic-arabic-rules-v2`
 * project: only entries whose `examples` was a string `/api/...` endpoint
 * are listed here, in their original order.
 *
 * Each entry has:
 *   - key:          unique screen / list identifier
 *   - simpleTitle:  learner-facing main name (chapter-list / intro / header)
 *   - titleArabic:  Arabic technical name, shown beside `title`
 *   - title:        English technical name
 *   - rule:         short description text used in the intro card body
 *   - endpoint:    server path (relative; prefixed with the API base URL at
 *                  fetch time). Includes query string when applicable.
 *   - screenType:  'examples' (default; one word per example)
 *                  'mawsuf-sifah' (returns `patterns` with mawsuf+sifah)
 *   - status:      'available' (backend route exists) | 'pending'
 *   - ruleTtsKey:  optional override for the rule-tts cache key
 *   - intro:       curated lesson opener (ayah + pattern framing). Fields:
 *                  arabic, reference, translation, highlight / highlights,
 *                  patternPart, patternless, noticeSummary, context.
 *                  Optional multi-ayah / multi-pattern intros:
 *                  ayahs: [{ arabic, translation, reference, highlight, label? }]
 *                  patterns: [{ highlight, patternPart?, label? }]
 *                  See PatternCard / LessonIntroScreen for how each is used.
 *                  When `noticeSummary` is set, that line is spoken on the
 *                  collapsed pattern card; the full `rule` is spoken when
 *                  Details is expanded (and shown in the Details panel).
 *
 * NOTE: intro content is AI-curated and awaiting human review. Correct freely.
 */
export const RULES = [
  {
    key: 'ayahs-with-vpn',
    simpleTitle: "The Three Kinds of Words",
    titleArabic: "أَنْوَاعُ الكَلِمَة",
    title: 'The Building Blocks of Quranic Arabic: Ism, Fi\'l, and Ḥarf',
    rule:
      'Every word in the Arabic language is one of three types: a noun (ism), a verb (fi\'l), or a particle (ḥarf). A noun names something, a verb shows an action or state, and a particle connects words. We will study each in more detail, but for now just look at the cards and notice which words are nouns, which are verbs, and which are particles.',
    endpoint: '/api/queries/ayahs-with-vpn',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
      reference: {
        surahId: 112,
        ayahNo: 1,
      },
      translation: 'Say: He is Allah, the One.',
      highlights: ['قُلْ', 'هُوَ', 'اللَّهُ', 'أَحَدٌ'],
      patternless: true,
      noticeSummary:
        'Every Arabic word is a noun (ism), a verb (fi\'l), or a particle (ḥarf).',
      context:
        'قُلْ — a verb: the command to speak. هُوَ and اللَّهُ and أَحَدٌ — nouns: He, Allah, One. In four short words, Surah Al-Ikhlas already uses the building blocks of the language. Every word you meet in the Quran is one of these three — notice which is which as you read.',
    },
  },
  {
    key: 'single-word-ism',
    simpleTitle: "Nouns",
    titleArabic: "الاِسْم",
    title: 'Single-Word Nouns (Ism)',
    rule:
      'A noun in the arabic language could be the name of a person, a place, a thing. Adjectives are also considered nouns in the arabic language. Pronouns (he, she, it) are also considered nouns in the arabic language. We will study each in more detail, but for now just look at the cards and notice the different types of nouns.',
    endpoint: '/api/queries/single-word-ism',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
      reference: {
        surahId: 108,
        ayahNo: 1,
      },
      translation: 'Indeed, We have granted you al-Kawthar.',
      highlights: ['الْكَوْثَرَ'],
      patternless: true,
      noticeSummary: 'A noun names something — a person, place, thing, adjective, or pronoun.',
      context:
        'الْكَوْثَرَ — abundance itself, named as a gift. An ism names something: a person, a place, a thing. It does not carry an action like a verb, and it does not connect words like a particle. In every ayah, nouns sit alongside those other word types — notice them as you read.',
    },
  },
  {
    key: 'single-word-fil',
    simpleTitle: "Verbs",
    titleArabic: "الفِعْل",
    title: 'Single-Word Verbs (Fi\'l)',
    rule:
      'A verb in the Arabic language can express an action in a particular tense (past, present, future). Verbs can show actions like \'he wrote\' or \'they believe\', or states like \'he became\'. We will study the different types of verbs in more detail, but for now just look at the cards and notice the different types of verbs.',
    endpoint: '/api/queries/single-word-fil',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
      reference: {
        surahId: 112,
        ayahNo: 1,
      },
      translation: 'Say: He is Allah, the One.',
      highlights: ['قُلْ'],
      patternless: true,
      noticeSummary:
        'A verb shows an action or state — past, present, or future.',
      context:
        'قُلْ — Say. The Quran opens Surah Al-Ikhlas with a command: speak this truth. Before the creed itself, there is an action. A single verb carries the weight of proclamation — what you are told to say shapes what you come to believe.',
    },
  },
  {
    key: 'single-word-harf',
    simpleTitle: "Particles",
    titleArabic: "الحَرْف",
    title: 'Single-Word Particles (Ḥarf)',
    rule:
      'A particle in the Arabic language connects words without naming something or showing an action. Particles can join phrases, show relationships, or add meaning like "and", "to", or "in". Some particles stand alone as their own word; others attach to the next word — like بِ in بِسْمِ. We will study the different types of particles in more detail, but for now just look at the cards and notice the different types of particles.',
    endpoint: '/api/queries/single-word-harf',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      reference: {
        surahId: 1,
        ayahNo: 5,
      },
      translation: 'You alone we worship, and You alone we ask for help.',
      highlights: ['وَ'],
      patternless: true,
      noticeSummary:
        'A particle connects words — like glue between words',
      context:
        'وَ — and. A tiny connector joins two of the most important claims a believer can make: we worship You, and we seek Your help. Without that particle, the two halves would stand apart. With it, devotion and dependence are bound together in one breath.',
    },
  },
  {
    key: 'tanween-irab',
    simpleTitle: "How Nouns Change",
    titleArabic: "التَّنْوِين وَالإِعْرَاب",
    title: 'I\'rab and Tanween',
    rule:
      'I\'rab refers to how the ending of an Arabic word looks. It has great significance in the Arabic language, which we will learn later. For now, just learn to recognize the different i\'rab states. I\'rab has three states: marfu, mansub, and majrur. As the cards appear one by one, notice how the ending of the word changes and which i\'rab state it belongs to. Even though the ending changes, the meaning does not — the ism شهيد means the same thing (witness) in all three forms.',
    endpoint: '/api/queries/tanween-irab',
    screenType: 'examples',
    status: 'available',
    intro: {
      ayahs: [
        {
          arabic: 'وَٱللَّهُ شَهِيدٌ عَلَىٰ مَا تَعْمَلُونَ',
          translation: 'And Allah is Witness over what you do.',
          reference: { surahId: 3, ayahNo: 98 },
          highlight: 'شَهِيدٌ',
          label: 'Marfu',
        },
        {
          arabic: 'وَيَكُونَ ٱلرَّسُولُ عَلَيْكُمْ شَهِيدًا',
          translation: '…and the Messenger will be a witness over you.',
          reference: { surahId: 2, ayahNo: 143 },
          highlight: 'شَهِيدًا',
          label: 'Mansub',
        },
        {
          arabic: 'مَا مِنَّا مِن شَهِيدٍ',
          translation: '…we have no witness among us.',
          reference: { surahId: 41, ayahNo: 47 },
          highlight: 'شَهِيدٍ',
          label: 'Majrur',
        },
      ],
      patterns: [
        { highlight: 'شَهِيدٌ', patternPart: 'ٌ', label: 'Marfu' },
        { highlight: 'شَهِيدًا', patternPart: 'ًا', label: 'Mansub' },
        { highlight: 'شَهِيدٍ', patternPart: 'ٍ', label: 'Majrur' },
      ],
      noticeSummary:
        'I\'rab is the ending of a word — marfu, mansub, or majrur. The meaning stays the same.',
      context:
        'شَهِيدٌ / شَهِيدًا / شَهِيدٍ — the same ism, three endings. Marfu, mansub, and majrur: watch how the tanween changes while the meaning "witness" stays in view.',
    },
  },
  {
    key: 'ghair-munsarif',
    simpleTitle: "Partly Flexible Nouns",
    titleArabic: "غَيْرُ المُنْصَرِف",
    title: 'Ghair Munsarif (Partially Flexible Nouns)',
    rule:
      'Some nouns are only partially flexible — ghair munsarif. They take no tanween. In marfu they end with a damma, but in mansub and majrur they both end with a fatha — so those two states look the same. Many prophet names, like Adam and Ibrahim, work this way. Then how would you know the i\'rab if it looks the same? By its position in the sentence. Later you will be able to identify that — for now, just know this simple rule.',
    endpoint: '/api/queries/ghair-munsarif',
    screenType: 'examples',
    status: 'available',
    intro: {
      ayahs: [
        {
          arabic: 'فَتَلَقَّىٰٓ ءَادَمُ مِن رَّبِّهِۦ كَلِمَٰتٍ',
          translation: 'Then Adam received from his Lord words…',
          reference: { surahId: 2, ayahNo: 37 },
          highlight: 'ءَادَمُ',
          label: 'Marfu',
        },
        {
          arabic: 'وَعَلَّمَ ءَادَمَ ٱلْأَسْمَآءَ كُلَّهَا',
          translation: 'And He taught Adam the names — all of them.',
          reference: { surahId: 2, ayahNo: 31 },
          highlight: 'ءَادَمَ',
          label: 'Mansub',
        },
        {
          arabic: 'إِنَّ مَثَلَ عِيسَىٰ عِندَ ٱللَّهِ كَمَثَلِ ءَادَمَ',
          translation: 'Indeed, the example of Isa with Allah is like that of Adam.',
          reference: { surahId: 3, ayahNo: 59 },
          highlight: 'ءَادَمَ',
          label: 'Majrur',
        },
      ],
      patterns: [
        { highlight: 'ءَادَمُ', patternPart: 'مُ', label: 'Marfu' },
        { highlight: 'ءَادَمَ', patternPart: 'مَ', label: 'Mansub' },
        { highlight: 'ءَادَمَ', patternPart: 'مَ', label: 'Majrur' },
      ],
      noticeSummary:
        'Ghair munsarif nouns: no tanween — marfu with damma, mansub and majrur both with fatha.',
      context:
        'ءَادَمُ / ءَادَمَ / ءَادَمَ — marfu stands apart with a damma, but mansub and majrur share the same fatha ending. Watch Adam across the three states.',
    },
  },
  {
    key: 'mabni-asma',
    simpleTitle: "Fixed Nouns",
    titleArabic: "الأَسْمَاءُ المَبْنِيَّة",
    title: 'Mabni (Indeclinable) Nouns',
    rule:
      'Some nouns are mabni — their ending never changes, no matter where they appear in a sentence. The name Musa is a clear example: it looks the same in marfu, mansub, and majrur. Then how would you know the i\'rab if it looks the same? By its position in the sentence. Later you will be able to identify that — for now, just know this simple rule.',
    endpoint: '/api/queries/mabni-asma',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَإِذْ قَالَ مُوسَىٰ لِقَوْمِهِۦ',
      reference: {
        surahId: 2,
        ayahNo: 54,
      },
      translation: 'And when Musa said to his people…',
      highlight: 'مُوسَىٰ',
      noticeSummary:
        'Mabni nouns keep one fixed ending in every i\'rab state.',
      context:
        'مُوسَىٰ — the ending stays the same whether Musa is marfu, mansub, or majrur. The written form does not shift; only the role in the sentence changes.',
    },
  },
  {
    key: 'feminine-nouns',
    simpleTitle: "The Ta Marbuta",
    titleArabic: "التَّاءُ المَرْبُوطَة",
    title: 'Feminine Nouns (التاء المربوطة)',
    rule:
      'Every noun in the Arabic language is either masculine or feminine. Masculine nouns are used for males and for things treated as masculine; feminine nouns are used for females and for things treated as feminine. How can we tell them apart? The trick is to spot the feminine ones by looking for a few quick patterns. If a noun does not show one of those patterns, we can usually assume it is masculine. This trick works most of the time — but like any shortcut, it can have exceptions. In this lesson we begin with the most common feminine pattern: a round ة at the end of the word — the ta marbuta. About 85% of feminine ism end this way. As the cards appear, notice which nouns carry this marker.',
    endpoint: '/api/queries/feminine-nouns',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنَّ ٱللَّهَ يَأْمُرُكُمْ أَن تَذْبَحُوا۟ بَقَرَةً',
      reference: {
        surahId: 2,
        ayahNo: 67,
      },
      translation: 'Indeed, Allah commands you to slaughter a cow.',
      highlight: 'بَقَرَةً',
      patternPart: 'ةً',
      context:
        'بَقَرَةً — a cow. No ال at the front, and the round ة at the end marks it as feminine. Musa ﷺ brought this simple command to his people, and a whole story unfolded from one indefinite noun.',
    },
  },
  {
    key: 'feminine-irab',
    simpleTitle: "Feminine Endings",
    titleArabic: "إِعْرَابُ المُؤَنَّث",
    title: 'Feminine Nouns Case Endings (إعراب المؤنث)',
    rule:
      'Feminine nouns with ta marbuta still take the standard case endings: ةُ when the subject, ةَ otherwise, ةِ after a preposition.',
    endpoint: '/api/queries/feminine-irab',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'بَلْدَةٌ طَيِّبَةٌ وَرَبٌّ غَفُورٌ',
      reference: {
        surahId: 34,
        ayahNo: 15,
      },
      translation: 'A good land, and a forgiving Lord.',
      highlight: 'طَيِّبَةٌ',
      patternPart: 'ةٌ',
      context:
        'What a pairing: a good land and a Forgiving Lord. The people of Sheba were given every worldly blessing imaginable. طَيِّبَةٌ — pure and pleasant — was how their land was described. Yet they turned away. The lesson is not about the land but about what gratitude asks of you.',
    },
  },
  {
    key: 'fatha-hamza-damma',
    simpleTitle: "Color Words",
    titleArabic: "الأَلِفُ المَمْدُودَة",
    title: 'Feminine Color Adjectives (Alif Mamdoodah)',
    rule:
      'Feminine color words end with ـَآءُ — the stretched alif shape that identifies them as feminine adjectives.',
    endpoint: '/api/queries/fatha-hamza-damma',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنَّهَا بَقَرَةٌ صَفْرَاءُ فَاقِعٌ لَّوْنُهَا',
      reference: {
        surahId: 2,
        ayahNo: 69,
      },
      translation: 'It is a yellow cow, bright in color.',
      highlight: 'صَفْرَاءُ',
      patternPart: 'اءُ',
      context:
        'Even the color of the cow in the story of Bani Israel was specified — صَفْرَاءُ, a vivid and luminous yellow. Allah is precise in His descriptions; nothing in the Quran is approximate or vague. When you read these details exactly as He wrote them, you step inside the scene.',
    },
  },
  {
    key: 'fatha-hamza-indef',
    simpleTitle: "Stretched Alif",
    titleArabic: "الأَلِفُ المَمْدُودَة — نَكِرَة",
    title: 'Feminine Nouns Ending with Alif Mamdoodah (ـاء) — Indefinite',
    rule:
      'Feminine nouns that end with ـاء (alif mamdoodah) show the stretched alif + hamza shape. In this lesson they appear indefinite (nakira) — without ال.',
    endpoint: '/api/queries/fatha-hamza-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'لَا يَتَّخِذِ ٱلْمُؤْمِنُونَ ٱلْكَٰفِرِينَ أَوْلِيَآءَ مِن دُونِ ٱلْمُؤْمِنِينَ',
      reference: {
        surahId: 3,
        ayahNo: 28,
      },
      translation:
        'Let not the believers take the disbelievers as allies instead of the believers.',
      highlight: 'أَوْلِيَآءَ',
      patternPart: 'اءَ',
      context:
        'أَوْلِيَآءَ — allies. No ال on this word, and the ـاء ending marks the feminine form of this plural. The warning is sharp: do not choose protectors apart from the believers. Spot that stretched alif whenever it closes an indefinite feminine noun.',
    },
  },
  {
    key: 'fatha-yaa-feminines',
    simpleTitle: "Shortened Alif",
    titleArabic: "الأَلِفُ المَقْصُورَة",
    title: 'Feminine Nouns Ending with Fatha + Yaa (ـَى)',
    rule:
      'Feminine nouns that end with the fatha + yaa shape (ـَى) have no tanween and no ta marbuta — the shape itself signals femininity.',
    endpoint: '/api/queries/fatha-yaa-feminines',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ',
      reference: {
        surahId: 2,
        ayahNo: 2,
      },
      translation: 'That is the Book, no doubt in it — a guidance for the God-conscious.',
      highlight: 'هُدًى',
      patternPart: 'ًى',
      context:
        'هُدًى — guidance — is what this entire Book is. Not information, not rules, but direction for a soul trying to find its way. Notice who receives it: المتقين, those already turning toward Allah. Guidance comes to the one already reaching for it.',
    },
  },
  {
    key: 'feminine-by-meaning',
    simpleTitle: "Feminine by Meaning",
    titleArabic: "المُؤَنَّثُ المَعْنَوِيّ",
    title: 'Feminine by Meaning (No Marker)',
    rule:
      'Some feminine ism have no ة, no ـاء, and no ـى at the end. They are feminine by meaning or by established usage: names of fire; names of wines and drinks; body parts that come in pairs (eyes, hands, ears, feet); and a set of common words such as سماء، نفس، أرض، شمس، ريح، and دار. Spot them as feminine even when no marker is there.',
    endpoint: '/api/queries/feminine-by-meaning',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'مَثَلُهُمْ كَمَثَلِ ٱلَّذِى ٱسْتَوْقَدَ نَارًا',
      reference: {
        surahId: 2,
        ayahNo: 17,
      },
      translation: 'Their example is like that of one who kindled a fire…',
      highlight: 'نَارًا',
      patternless: true,
      noticeSummary:
        'Some feminine nouns carry no ending marker — they are feminine by meaning.',
      context:
        'نَارًا — a fire. No ta marbuta, no stretched alif, no shortened alif — yet the word is feminine. Fire, paired body parts, drinks, and words like نفس and سماء belong to this unmarked group. Learn the categories; the cards will show them in the Quran.',
    },
  },
  {
    key: 'dual-nouns-intro',
    simpleTitle: "Two of Something",
    titleArabic: "المُثَنَّى",
    title: 'Introduction to Dual Nouns (المثنى)',
    rule:
      'While languages like English distinguish only singular and plural, Arabic has three forms: singular, dual, and plural. Until now you have been looking at singular nouns (ism). In this chapter you will learn to identify dual and plural nouns — starting with the dual. To speak about exactly two of something, add ـَانِ when it is marfu, and ـَيْنِ when it is mansub or majrur — those last two states share the same ending. As the cards appear, notice how the dual ending changes with each i\'rab state. Some states may not appear for a given word in the Quran; when that happens, the card will say so. That does not mean the form is impossible — only that this exact wording is not found in the Quran.',
    endpoint: '/api/queries/dual-nouns-intro',
    screenType: 'examples',
    status: 'available',
    intro: {
      ayahs: [
        {
          arabic: 'فِيهِمَا عَيْنَانِ تَجْرِيَانِ',
          translation: 'In both of them are two springs, flowing.',
          reference: { surahId: 55, ayahNo: 50 },
          highlight: 'عَيْنَانِ',
          label: 'Marfu',
        },
        {
          arabic: 'أَلَمْ نَجْعَل لَّهُۥ عَيْنَيْنِ',
          translation: 'Have We not made for him two eyes?',
          reference: { surahId: 90, ayahNo: 8 },
          highlight: 'عَيْنَيْنِ',
          label: 'Mansub',
        },
        {
          arabic: 'عَيْنَيْنِ',
          translation: 'No example in the Quran',
          highlight: 'عَيْنَيْنِ',
          label: 'Majrur',
        },
      ],
      patterns: [
        { highlight: 'عَيْنَانِ', patternPart: 'َانِ', label: 'Marfu' },
        { highlight: 'عَيْنَيْنِ', patternPart: 'َيْنِ', label: 'Mansub' },
        { highlight: 'عَيْنَيْنِ', patternPart: 'َيْنِ', label: 'Majrur' },
      ],
      noticeSummary:
        'Dual nouns: ـَانِ in marfu; ـَيْنِ in mansub and majrur.',
      context:
        'عَيْنَانِ / عَيْنَيْنِ — marfu takes ـَانِ; mansub and majrur share ـَيْنِ. The Quran has marfu and mansub for this word; majrur looks the same as mansub, but there is no separate majrur example here.',
    },
  },
  {
    key: 'male-plural-intro',
    simpleTitle: "Sound Masculine Plurals",
    titleArabic: "جَمْعُ المُذَكَّرِ السَّالِم",
    title: 'Introduction to Sound Plurals for Males (جمع المذكر السالم)',
    rule:
      'To speak about three or more males, add ـُونَ when the noun is marfu, and ـِينَ when it is mansub or majrur — those last two states share the same ending. The core of the word stays unchanged.',
    endpoint: '/api/queries/male-plural-intro',
    screenType: 'examples',
    status: 'available',
    intro: {
      ayahs: [
        {
          arabic: 'أَنتُم بِهِۦ مُؤْمِنُونَ',
          translation: '…you are believers in Him.',
          reference: { surahId: 5, ayahNo: 88 },
          highlight: 'مُؤْمِنُونَ',
          label: 'Marfu',
        },
        {
          arabic: 'إِن كُنتُم مُّؤْمِنِينَ',
          translation: '…if you were believers.',
          reference: { surahId: 2, ayahNo: 91 },
          highlight: 'مُّؤْمِنِينَ',
          label: 'Mansub',
        },
        {
          arabic: 'يَشْفِ صُدُورَ قَوْمٍ مُّؤْمِنِينَ',
          translation: '…and heal the breasts of a believing people.',
          reference: { surahId: 9, ayahNo: 14 },
          highlight: 'مُّؤْمِنِينَ',
          label: 'Majrur',
        },
      ],
      patterns: [
        { highlight: 'مُؤْمِنُونَ', patternPart: 'ُونَ', label: 'Marfu' },
        { highlight: 'مُّؤْمِنِينَ', patternPart: 'ِينَ', label: 'Mansub' },
        { highlight: 'مُّؤْمِنِينَ', patternPart: 'ِينَ', label: 'Majrur' },
      ],
      noticeSummary:
        'Masculine sound plural: ـُونَ in marfu; ـِينَ in mansub and majrur.',
      context:
        'مُؤْمِنُونَ / مُّؤْمِنِينَ / مُّؤْمِنِينَ — the same word for believers, two endings. Marfu takes ـُونَ; mansub and majrur share ـِينَ.',
    },
  },
  {
    key: 'female-plural-intro',
    simpleTitle: "Sound Feminine Plurals",
    titleArabic: "جَمْعُ المُؤَنَّثِ السَّالِم",
    title: 'Introduction to Sound Plurals for Females (جمع المؤنث السالم)',
    rule:
      'To speak about three or more feminine nouns in the sound plural, use ـَاتٌ when marfu and ـَاتٍ when mansub or majrur — those last two states share the same ending.',
    endpoint: '/api/queries/female-plural-intro',
    screenType: 'examples',
    status: 'available',
    intro: {
      ayahs: [
        {
          arabic: 'فِيهِ ءَايَٰتٌۢ بَيِّنَٰتٌ',
          translation: '…in it are clear signs.',
          reference: { surahId: 3, ayahNo: 97 },
          highlight: 'بَيِّنَٰتٌ',
          label: 'Marfu',
        },
        {
          arabic: 'أَنزَلْنَآ إِلَيْكَ ءَايَٰتٍۭ بَيِّنَٰتٍ',
          translation: '…We have sent down to you clear verses.',
          reference: { surahId: 2, ayahNo: 99 },
          highlight: 'بَيِّنَٰتٍ',
          label: 'Mansub',
        },
        {
          arabic: 'تِسْعَ ءَايَٰتٍۭ بَيِّنَٰتٍ',
          translation: '…nine clear signs.',
          reference: { surahId: 17, ayahNo: 101 },
          highlight: 'بَيِّنَٰتٍ',
          label: 'Majrur',
        },
      ],
      patterns: [
        { highlight: 'بَيِّنَٰتٌ', patternPart: 'ٰتٌ', label: 'Marfu' },
        { highlight: 'بَيِّنَٰتٍ', patternPart: 'ٰتٍ', label: 'Mansub' },
        { highlight: 'بَيِّنَٰتٍ', patternPart: 'ٰتٍ', label: 'Majrur' },
      ],
      noticeSummary:
        'Feminine sound plural: ـَاتٌ in marfu; ـَاتٍ in mansub and majrur.',
      context:
        'بَيِّنَٰتٌ / بَيِّنَٰتٍ / بَيِّنَٰتٍ — clear signs in three states. Marfu takes ـَاتٌ; mansub and majrur share ـَاتٍ. Spot that shared ending as the cards appear.',
    },
  },
  {
    key: 'broken-plurals',
    simpleTitle: "Broken Plurals",
    titleArabic: "جَمْعُ التَّكْسِير",
    title: 'Broken Plurals (جمع التكسير)',
    rule:
      'Some plurals reshape the whole word internally — each one is unique and must be learned individually.',
    endpoint: '/api/queries/broken-plurals',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَتِلْكَ الْأَيَّامُ نُدَاوِلُهَا بَيْنَ النَّاسِ',
      reference: {
        surahId: 3,
        ayahNo: 140,
      },
      translation: 'And these days We alternate among the people.',
      highlight: 'الْأَيَّامُ',
      context:
        'الْأَيَّامُ — the days — belong to Allah, and He rotates them between people. No one holds victory forever; no one holds hardship forever. The moment you recognize this word in the Quran, you feel the rhythm of this great divine assurance.',
    },
  },
  {
    key: 'marifa-nakira',
    simpleTitle: "The and A",
    titleArabic: "المَعْرِفَة وَالنَّكِرَة",
    title: 'Ma\'rifa and Nakira (Definite and Indefinite Nouns)',
    rule:
      'Imagine you have a library full of books — many, many books. You want someone to read one particular book. Not just any book: that specific one. How do you mark it in Arabic? One of the main ways is to put ال (alif-laam) at the front of the noun. That turns a nakira (an indefinite "a book") into a ma\'rifa (a definite "the book"). Also notice: ال hates tanween. The two do not appear together — when ال arrives, the tanween leaves.',
    endpoint: '/api/queries/marifa-nakira',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ فِيهِ',
      reference: {
        surahId: 2,
        ayahNo: 2,
      },
      translation: 'That is the Book about which there is no doubt.',
      highlight: 'ٱلْكِتَٰبُ',
      patternPart: 'ٱلْ',
      context:
        'ٱلْكِتَٰبُ — the Book. Not a book among many: the particular one Allah is pointing to. The ال at the front is what makes it definite — and notice there is no tanween on the end. When ال arrives, tanween leaves.',
    },
  },
  {
    key: 'huwa-indef',
    simpleTitle: "He is…",
    titleArabic: "هُوَ + نَكِرَة",
    title: 'Forming Sentences with Huwa (هُوَ + Indefinite Noun)',
    rule:
      'Use the pronoun هُوَ (huwa — \'he/it is\') followed by an indefinite noun as the predicate to form a simple nominal sentence.',
    endpoint: '/api/queries/huwa-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
      reference: {
        surahId: 112,
        ayahNo: 1,
      },
      translation: 'Say: He is Allah, the One.',
      highlight: 'هُوَ',
      context:
        'هُوَ — He. Just that. No explanation needed before the name; the pronoun alone carries total weight. Arabic lets you build the most complete declaration — "He is Allah, the One" — with no verb, just pure presence.',
    },
  },
  {
    key: 'hiya-indef',
    simpleTitle: "She is…",
    titleArabic: "هِيَ + نَكِرَة",
    title: 'Forming Sentences with Hiya (هِيَ + Indefinite Noun)',
    rule:
      'Use the feminine pronoun هِيَ (hiya — \'she/it is\') followed by an indefinite noun as the predicate to form a simple nominal sentence.',
    endpoint: '/api/queries/hiya-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَمَا هِيَ إِلَّا ذِكْرَىٰ لِلْبَشَرِ',
      reference: {
        surahId: 74,
        ayahNo: 31,
      },
      translation: 'And it is nothing but a reminder to humanity.',
      highlight: 'هِيَ',
      context:
        'هِيَ — it is. This entire Quran, this revelation, this fire in the heart — is nothing but a reminder. Not a burden, not a law code, but a reminder of something the soul once knew and needs to return to.',
    },
  },
  {
    key: 'anta-indef',
    simpleTitle: "You (m.) are…",
    titleArabic: "أَنتَ + نَكِرَة",
    title: 'Forming Sentences with Anta (أَنتَ + Indefinite Noun)',
    rule:
      'Use the second person pronoun أَنتَ (anta — \'you are\') followed by an indefinite noun as the predicate to form a direct address sentence.',
    endpoint: '/api/queries/anta-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنْ أَنتَ إِلَّا نَذِيرٌ',
      reference: {
        surahId: 35,
        ayahNo: 23,
      },
      translation: 'You are only a warner.',
      highlight: 'أَنتَ',
      context:
        'The Prophet ﷺ was told: you are only a warner — nothing more, nothing less. No pressure to force hearts open; the task was simply to carry the message and deliver it clearly. There is deep relief in that simplicity.',
    },
  },
  {
    key: 'antum-actpcpl',
    simpleTitle: "You (pl.) are…",
    titleArabic: "أَنتُمْ + اِسْم فَاعِل",
    title: 'Forming Sentences with Antum (أَنتُمْ + Active Participle)',
    rule:
      'Use أَنتُمْ (antum — \'you all are\') followed by an active participle to describe ongoing or habitual actions.',
    endpoint: '/api/queries/antum-actpcpl',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَأَنتُمْ عَاكِفُونَ فِي الْمَسَاجِدِ',
      reference: {
        surahId: 2,
        ayahNo: 187,
      },
      translation: 'While you are staying for worship in the mosques.',
      highlight: 'عَاكِفُونَ',
      context:
        'عَاكِفُونَ — people who have set aside the world to dwell in the house of Allah. The word paints the image of a community that chose God over everything else, staying put in devotion. This is the kind of people the Quran speaks to.',
    },
  },
  {
    key: 'ana-indef',
    simpleTitle: "I am…",
    titleArabic: "أَنَا + نَكِرَة",
    title: 'Forming Sentences with Ana (أَنَا + Indefinite Noun)',
    rule:
      'Use the first person pronoun أَنَا (ana — \'I am\') followed by an indefinite noun as the predicate to form a self-identification sentence.',
    endpoint: '/api/queries/ana-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنَّمَا أَنَا بَشَرٌ مِّثْلُكُمْ',
      reference: {
        surahId: 18,
        ayahNo: 110,
      },
      translation: 'I am only a man like you.',
      highlight: 'أَنَا',
      context:
        'The greatest human being who ever lived said: أَنَا بَشَرٌ — I am a man, just like you. The Prophet ﷺ was commanded to announce his humanity, not his superiority. This is where the miracle of the Quran becomes undeniable: it comes through someone who makes no claim to divinity.',
    },
  },
  {
    key: 'nahnu-actpcpl',
    simpleTitle: "We are…",
    titleArabic: "نَحْنُ + خَبَر",
    title: 'Forming Sentences with Nahnu (نَحْنُ + Predicate)',
    rule:
      'Use the first person plural pronoun نَحْنُ (nahnu — \'we are\') followed by a predicate (active/passive participle or noun) to describe group characteristics or states.',
    endpoint: '/api/queries/nahnu-actpcpl',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَنَحْنُ لَهُ مُسْلِمُونَ',
      reference: {
        surahId: 2,
        ayahNo: 136,
      },
      translation: 'And we are Muslims, submitting to Him.',
      highlight: 'مُسْلِمُونَ',
      context:
        'Ibrahim and his sons declared together: we, all of us, are submitters — مُسْلِمُونَ. Submission passed from father to son, generation to generation, as a living gift. When you read this word, you are joining a lineage of those who chose Allah.',
    },
  },
  {
    key: 'hatha-indef',
    simpleTitle: "This (near, masculine)",
    titleArabic: "هَٰذَا + نَكِرَة",
    title: 'Demonstrative Pronouns with Hatha (هَٰذَا + Indefinite Noun)',
    rule:
      'Use the near demonstrative pronoun هَٰذَا (hādhā — \'this\') followed by an indefinite noun in nominative case (رفع) to identify specific masculine objects.',
    endpoint: '/api/queries/hatha-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'هَٰذَا بَيَانٌ لِّلنَّاسِ',
      reference: {
        surahId: 3,
        ayahNo: 138,
      },
      translation: 'This is a clear statement for the people.',
      highlight: 'هَٰذَا',
      context:
        'هَٰذَا بَيَانٌ — This is clarity. Allah points at the Quran and says: this, right here, is a clear statement for all people. Not hidden, not cryptic, not reserved for scholars — a declaration open to everyone.',
    },
  },
  {
    key: 'hathihi-indef',
    simpleTitle: "This (near, feminine)",
    titleArabic: "هَٰذِهِ + نَكِرَة",
    title: 'Demonstrative Pronouns with Hathihi (هَٰذِهِ + Indefinite Noun)',
    rule:
      'Use the near demonstrative pronoun هَٰذِهِ (hādhihi — \'this\' feminine) followed by an indefinite noun in nominative case to identify specific feminine objects.',
    endpoint: '/api/queries/hathihi-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'قَالَ هَٰذِهِ نَاقَةٌ',
      reference: {
        surahId: 26,
        ayahNo: 155,
      },
      translation: 'He said: This is a she-camel.',
      highlight: 'هَٰذِهِ',
      context:
        'Prophet Salih pointed to the she-camel standing before his people and said simply: هَٰذِهِ نَاقَةٌ — this is a sign of Allah. A miracle in plain sight. One act of pointing, one sentence. Some still refused to see.',
    },
  },
  {
    key: 'hathihi-plural',
    simpleTitle: "These (non-human)",
    titleArabic: "هَٰذِهِ + جَمْع غَيْر عَاقِل",
    title: 'Hathihi with Non-Rational Plurals (هَٰذِهِ + غير عاقل جمع)',
    rule:
      'Use the feminine demonstrative pronoun هَٰذِهِ with non-rational plural nouns. Non-rational plurals are treated grammatically as feminine singular.',
    endpoint: '/api/queries/hathihi-plural',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَهَٰذِهِ الْأَنْهَارُ تَجْرِي مِن تَحْتِي',
      reference: {
        surahId: 43,
        ayahNo: 51,
      },
      translation: 'And these rivers flowing beneath me.',
      highlight: 'هَٰذِهِ',
      context:
        'Pharaoh pointed at his rivers and said: are these not mine? He mistook what Allah placed beneath him for his own possession. The rivers were real — his claim over them was the delusion that destroyed him.',
    },
  },
  {
    key: 'hathani-nom',
    simpleTitle: "These two (masculine)",
    titleArabic: "هَٰذَانِ",
    title: 'Dual Demonstrative Pronouns with Hathani (هَٰذَانِ + Nominative Noun)',
    rule:
      'Use the masculine dual demonstrative pronoun هَٰذَانِ (hādhāni — \'these two\') followed by a nominative noun to identify exactly two masculine entities.',
    endpoint: '/api/queries/hathani-nom',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'هَٰذَانِ خَصْمَانِ اخْتَصَمُوا فِي رَبِّهِمْ',
      reference: {
        surahId: 22,
        ayahNo: 19,
      },
      translation: 'These are two adversaries who have disputed about their Lord.',
      highlight: 'هَٰذَانِ',
      context:
        'هَٰذَانِ خَصْمَانِ — these two adversaries disputed about their Lord. On the Day of Judgment it will become clear that those who believed and those who denied were always in a contest, even when the world seemed not to notice.',
    },
  },
  {
    key: 'haulai-indef',
    simpleTitle: "These people",
    titleArabic: "هَٰؤُلَاءِ + نَكِرَة",
    title: 'Plural Demonstrative Pronouns with Haulai (هَٰؤُلَآءِ + Indefinite Noun)',
    rule:
      'Use the plural demonstrative pronoun هَٰؤُلَآءِ (hā\'ulā\'i — \'these\') followed by an indefinite noun in nominative case to identify multiple entities or groups.',
    endpoint: '/api/queries/haulai-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنَّ هَٰؤُلَاءِ ضَيْفِي فَلَا تَفْضَحُونِ',
      reference: {
        surahId: 15,
        ayahNo: 68,
      },
      translation: 'Indeed, these are my guests, so do not shame me.',
      highlight: 'هَٰؤُلَاءِ',
      context:
        'Prophet Lut called to his people: هَٰؤُلَاءِ ضَيْفِي — these are my guests. He defended them with his honor and his name. The urgency in that pointing word cuts through fourteen centuries. These people — right here — are under my protection.',
    },
  },
  {
    key: 'dhalika-indef',
    simpleTitle: "That (far, masculine)",
    titleArabic: "ذَٰلِكَ + نَكِرَة",
    title: 'Far Demonstrative Pronouns with Dhalika (ذَٰلِكَ + Indefinite Noun)',
    rule:
      'Use the far demonstrative pronoun ذَٰلِكَ (dhālika — \'that\') followed by an indefinite noun in nominative case to identify distant or abstract entities.',
    endpoint: '/api/queries/dhalika-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَلِبَاسُ التَّقْوَىٰ ذَٰلِكَ خَيْرٌ',
      reference: {
        surahId: 7,
        ayahNo: 26,
      },
      translation: 'But the clothing of righteousness — that is best.',
      highlight: 'ذَٰلِكَ',
      context:
        'ذَٰلِكَ خَيْرٌ — that is best. Allah points not at wealth, not at beauty, not at status, but at the garment you wear inside: the clothing of taqwa. What cannot be seen by others is what He values most.',
    },
  },
  {
    key: 'dhanika-nom',
    simpleTitle: "Those two (masculine)",
    titleArabic: "ذَٰنِكَ",
    title: 'Far Dual Demonstrative Pronouns with Dhanika (ذَٰنِكَ + Nominative Noun)',
    rule:
      'Use the far dual demonstrative pronoun ذَٰنِكَ (dhānika — \'those two\') followed by a nominative noun to identify exactly two distant entities.',
    endpoint: '/api/queries/dhanika-nom',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'فَذَانِكَ بُرْهَانَانِ مِن رَّبِّكَ',
      reference: {
        surahId: 28,
        ayahNo: 32,
      },
      translation: 'So those are two proofs from your Lord.',
      highlight: 'فَذَانِكَ',
      context:
        'Allah gave Musa two miracles — not one, but two — and pointed at them both: فَذَانِكَ. Two undeniable proofs from your Lord. When Allah supports one of His prophets, He doubles the evidence.',
    },
  },
  {
    key: 'tilka-sing-indef',
    simpleTitle: "That (far, feminine)",
    titleArabic: "تِلْكَ + مُفْرَد",
    title:
      'Far Feminine Demonstrative with Tilka + Singular (تِلْكَ + Singular Indefinite Noun)',
    rule:
      'Use the far feminine demonstrative pronoun تِلْكَ (tilka — \'that\') followed by a singular indefinite noun in nominative case to identify distant feminine entities.',
    endpoint: '/api/queries/tilka-sing-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'تِلْكَ أُمَّةٌ قَدْ خَلَتْ',
      reference: {
        surahId: 2,
        ayahNo: 134,
      },
      translation: 'That was a nation which has passed on.',
      highlight: 'تِلْكَ',
      context:
        'تِلْكَ — that. Nations rise, nations fall, and Allah points at them from a distance of time: they have passed. The comfort in this is real: you do not carry the weight of those who came before. Your deeds are yours alone.',
    },
  },
  {
    key: 'tilka-plural-indef',
    simpleTitle: "Those (non-human)",
    titleArabic: "تِلْكَ + جَمْع غَيْر عَاقِل",
    title:
      'Far Feminine Demonstrative with Non-Rational Plurals (تِلْكَ + Non-Rational Plural)',
    rule:
      'Use the far feminine demonstrative pronoun تِلْكَ (tilka — \'those\') with non-rational plural nouns. Non-rational plurals are treated as feminine singular.',
    endpoint: '/api/queries/tilka-plural-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'تِلْكَ آيَاتُ الْكِتَابِ الْحَكِيمِ',
      reference: {
        surahId: 10,
        ayahNo: 1,
      },
      translation: 'These are the verses of the wise Book.',
      highlight: 'تِلْكَ',
      context:
        'Allah begins Surah Yunus by gesturing at His own words: تِلْكَ — those verses, of the Wise Book. Every ayah of the Quran has already been weighed with perfect wisdom before it ever reached you.',
    },
  },
  {
    key: 'ulaaika-indef',
    simpleTitle: "Those people",
    titleArabic: "أُولَٰئِكَ + نَكِرَة",
    title: 'Far Plural Demonstrative with Ulaaika (أُو۟لَٰٓئِكَ + Indefinite Noun)',
    rule:
      'Use the far plural demonstrative pronoun أُو۟لَٰٓئِكَ (ulā\'ika — \'those\') followed by an indefinite noun to identify distant groups of three or more entities.',
    endpoint: '/api/queries/ulaaika-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'أُولَٰئِكَ أَصْحَابُ الْجَنَّةِ',
      reference: {
        surahId: 2,
        ayahNo: 82,
      },
      translation: 'Those are the companions of Paradise.',
      highlight: 'أُولَٰئِكَ',
      context:
        'أُولَٰئِكَ — those. The pointing word takes us slightly forward, as if showing a group already ahead of us. Those are the companions of Paradise. Allah is showing you a destination — and extending an invitation to join them.',
    },
  },
  {
    key: 'al-nom-indef',
    simpleTitle: "The Book is…",
    titleArabic: "ال + نَكِرَة",
    title: 'Definite Noun (ال + Noun NOM) Followed by Indefinite Noun',
    rule:
      'When a definite noun (with ال) in nominative case is followed by an indefinite noun, they form a nominal sentence: the definite noun is the مبتدأ and the indefinite noun is the خبر.',
    endpoint: '/api/queries/al-nom-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'الْحَجُّ أَشْهُرٌ مَّعْلُومَاتٌ',
      reference: {
        surahId: 2,
        ayahNo: 197,
      },
      translation: 'Hajj is during well-known months.',
      highlight: 'الْحَجُّ',
      context:
        'الْحَجُّ — the Hajj. Allah defines the greatest pilgrimage of a believer\'s life in a single, sweeping phrase: specific months, known and fixed. The simplicity of how He communicates this is itself a mercy — clear guidance for a journey millions undertake.',
    },
  },
  {
    key: 'mawsuf-sifah',
    simpleTitle: "Noun and Adjective",
    titleArabic: "المَوْصُوف وَالصِّفَة",
    title: 'Mawsuf and Sifah: Noun-Adjective Agreement (المَوْصُوف والصِّفَة)',
    rule:
      'In Arabic, an adjective (الصِّفَة) must agree with the noun it describes (المَوْصُوف) in four properties: Case, State (definiteness), Number, and Gender.',
    endpoint: '/api/queries/mawsuf-sifah',
    screenType: 'mawsuf-sifah',
    status: 'available',
    intro: {
      arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
      reference: {
        surahId: 1,
        ayahNo: 6,
      },
      translation: 'Guide us to the straight path.',
      highlight: 'الْمُسْتَقِيمَ',
      context:
        'الْمُسْتَقِيمَ — the straight one. Not any path, not a path that merely feels right, but the one that is upright and true. We ask for this in every unit of every prayer. When you recognize that this word is describing the path, you feel how specific and how urgent this dua really is.',
    },
  },
  {
    key: 'mawsuf-sifah-plural',
    simpleTitle: "Non-human Plurals",
    titleArabic: "جَمْعُ غَيْرِ العَاقِل",
    title: 'Non-Human Plural + Feminine Singular Adjective (جمع غير العاقل)',
    rule:
      'When a non-human (غير عاقل) plural noun is described by an adjective, the adjective takes the feminine singular form, not the plural. Case and state still agree.',
    endpoint: '/api/queries/mawsuf-sifah-plural',
    screenType: 'mawsuf-sifah',
    status: 'available',
    intro: {
      arabic: 'وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ',
      reference: {
        surahId: 7,
        ayahNo: 180,
      },
      translation: 'And to Allah belong the best names.',
      highlight: 'الْحُسْنَىٰ',
      context:
        'الْأَسْمَاءُ الْحُسْنَىٰ — the most beautiful names. They all belong to Allah alone. Each one is a window into a different dimension of who He is. When you call on Him by any of those names, you are reaching toward His perfection.',
    },
  },
  {
    key: 'mubtada-khabar-sifah',
    simpleTitle: "Predicate with an Adjective",
    titleArabic: "مُبْتَدَأ + خَبَر + صِفَة",
    title: 'Mubtada + Khabar with Sifah (مبتدأ + خبر + صفة الخبر)',
    rule:
      'When a definite noun (مبتدأ) is followed by two indefinite nouns in nominative case, the first is the predicate (خبر) and the second is its adjective (صفة الخبر).',
    endpoint: '/api/queries/mubtada-khabar-sifah',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَاللَّهُ غَفُورٌ رَّحِيمٌ',
      reference: {
        surahId: 2,
        ayahNo: 218,
      },
      translation: 'And Allah is Forgiving and Merciful.',
      highlight: 'غَفُورٌ رَّحِيمٌ',
      context:
        'غَفُورٌ رَّحِيمٌ — Forgiving, Merciful. Allah does not just forgive; He is a Forgiver by nature. He does not just show mercy; He is the Merciful One. The Quran closes hundreds of ayahs with these two names together, as if to say: no matter what came before in this verse, this is who I am.',
    },
  },
  {
    key: 'mubtada-sifah-khabar',
    simpleTitle: "Subject with an Adjective",
    titleArabic: "مُبْتَدَأ + صِفَة + خَبَر",
    title: 'Mubtada with Sifah, then Khabar (مبتدأ + صفة + خبر)',
    rule:
      'When a definite مبتدأ is described by a definite صفة (matching in case, state, gender, number) and is followed by an indefinite خبر in nominative case, the adjective describes the subject and the indefinite noun is the predicate.',
    endpoint: '/api/queries/mubtada-sifah-khabar',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَالْبَلَدُ الطَّيِّبُ يَخْرُجُ نَبَاتُهُ بِإِذْنِ رَبِّهِ',
      reference: {
        surahId: 7,
        ayahNo: 58,
      },
      translation:
        'And the good land — its vegetation comes forth by permission of its Lord.',
      highlight: 'الْبَلَدُ الطَّيِّبُ',
      context:
        'Good soil produces good fruit — بِإِذْنِ رَبِّهِ, by the permission of its Lord. The description comes first: الْبَلَدُ الطَّيِّبُ, the good land. Allah is telling you that what grows depends entirely on the condition of the ground you start with.',
    },
  },
  {
    key: 'murakkab-ishara',
    simpleTitle: "This Book",
    titleArabic: "المُرَكَّب الإِشَارِي",
    title: 'Demonstrative Compound — المركب الإشاري',
    rule:
      'When an اسم إشارة is immediately followed by a definite noun with ال, they form a مركب إشاري (demonstrative compound) where the demonstrative points to the specific noun.',
    endpoint: '/api/queries/murakkab-ishara',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ',
      reference: {
        surahId: 2,
        ayahNo: 2,
      },
      translation: 'That Book — there is no doubt in it.',
      highlight: 'ذَٰلِكَ الْكِتَابُ',
      context:
        'ذَٰلِكَ الْكِتَابُ — That Book. Allah points at the Quran with total certainty and no hesitation: not a trace of doubt in it. When you read those two words together, you are standing at the entrance to the most confident declaration in all of human literature.',
    },
  },
  {
    key: 'hathihi-plural-ghayr-aaqil',
    simpleTitle: "These Things",
    titleArabic: "هَٰذِهِ + جَمْع غَيْر عَاقِل",
    title: 'هَٰذِهِ + Plural Non-Rational Noun (قاعدة غير العاقل)',
    rule:
      'When pointing to a plural of non-rational entities (things, animals, concepts), Arabic uses the feminine singular demonstrative هَٰذِهِ instead of the plural هَٰؤُلَآءِ.',
    endpoint: '/api/queries/hathihi-plural-ghayr-aaqil',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَقَالُوا هَٰذِهِ أَنْعَامٌ وَحَرْثٌ حِجْرٌ',
      reference: {
        surahId: 6,
        ayahNo: 138,
      },
      translation: 'And they say: These are cattle and crops that are forbidden.',
      highlight: 'هَٰذِهِ',
      context:
        'Those who rejected truth made up their own rules — هَٰذِهِ أَنْعَامٌ حِجْرٌ, "these animals are forbidden." They pointed at Allah\'s creation and declared it off-limits by their own invention. No one has the right to forbid what Allah has not forbidden.',
    },
  },
  {
    key: 'murakkab-ishara-mubtada-khabar',
    simpleTitle: "This Book is…",
    titleArabic: "مُرَكَّب إِشَارِي مُبْتَدَأ + خَبَر",
    title: 'Murakkab Ishara as Mubtada + Khabar (مركب إشاري مبتدأ + خبر)',
    rule:
      'When a demonstrative compound (اسم إشارة + مشار إليه with ال) is used as the مبتدأ of a nominal sentence, it is followed by an indefinite predicate (خبر نكرة).',
    endpoint: '/api/queries/murakkab-ishara-mubtada-khabar',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ',
      reference: {
        surahId: 17,
        ayahNo: 9,
      },
      translation: 'Indeed, this Quran guides to that which is most upright.',
      highlight: 'هَٰذَا الْقُرْآنَ',
      context:
        'هَٰذَا الْقُرْآنَ — this Quran, right here — guides to what is most upright. Not somewhat upright, not generally good: أَقْوَمُ, the most straight and sound possible path. There is no higher road than the one this Book illuminates.',
    },
  },
  {
    key: 'murakkab-ishara-sifat',
    simpleTitle: "This Book, Described",
    titleArabic: "اِسْم إِشَارَة + مُشَار إِلَيْهِ + صِفَة",
    title: 'Murakkab Ishara with Sifat (اسم إشارة + مشار إليه + صفة)',
    rule:
      'When the مشار إليه in a demonstrative compound is followed by an adjective (صفة), the adjective must agree in definiteness (both have ال) and case.',
    endpoint: '/api/queries/murakkab-ishara-sifat',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَهَٰذَا الْبَلَدِ الْأَمِينِ',
      reference: {
        surahId: 95,
        ayahNo: 3,
      },
      translation: 'And [by] this secure city.',
      highlight: 'هَٰذَا الْبَلَدِ الْأَمِينِ',
      context:
        'Allah swears by Mecca — هَٰذَا الْبَلَدِ الْأَمِينِ, this secure city. الْأَمِينِ: the trustworthy, the safe one. There is a city on earth that carries safety in its very name and nature. Allah chose it as the place where His final prophet ﷺ was born.',
    },
  },
  {
    key: 'idafa-male-sing',
    simpleTitle: "Of a Man",
    titleArabic: "إِضَافَة — مُذَكَّر مُفْرَد",
    title: 'Idafa — Masculine Singular مضاف إليه',
    rule:
      'When a noun in construct state (مضاف) is followed by a masculine singular noun in genitive case (مضاف إليه), they form an إضافة meaning \'X of Y\'.',
    endpoint: '/api/queries/idafa-male-sing',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'مَالِكِ يَوْمِ الدِّينِ',
      reference: {
        surahId: 1,
        ayahNo: 4,
      },
      translation: 'Master of the Day of Judgment.',
      highlight: 'يَوْمِ الدِّينِ',
      context:
        'يَوْمِ الدِّينِ — the Day of Judgment. Every account will be settled, every right returned, every injustice answered. We recite this in every prayer — a constant reminder that this world is not the final word.',
    },
  },
  {
    key: 'idafa-female-sing',
    simpleTitle: "Of a Woman",
    titleArabic: "إِضَافَة — مُؤَنَّث مُفْرَد",
    title: 'Idafa — Feminine Singular مضاف إليه',
    rule:
      'When a noun in construct state (مضاف) is followed by a feminine singular noun in genitive case (often ending in ة), they form an إضافة.',
    endpoint: '/api/queries/idafa-female-sing',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'لَيَجْمَعَنَّكُمْ إِلَىٰ يَوْمِ الْقِيَامَةِ',
      reference: {
        surahId: 4,
        ayahNo: 87,
      },
      translation: 'He will surely gather you for the Day of Resurrection.',
      highlight: 'يَوْمِ الْقِيَامَةِ',
      context:
        'لَيَجْمَعَنَّكُمْ — He will surely, certainly gather you. The Day of Standing — يَوْمِ الْقِيَامَةِ — is a day of gathering: every soul that ever lived, in one place, before the One who created them all.',
    },
  },
  {
    key: 'idafa-mubtada-khabar',
    simpleTitle: "Ownership as a Sentence",
    titleArabic: "إِضَافَة مُبْتَدَأ + خَبَر",
    title: 'Idafa as Mubtada + Khabar (إضافة مبتدأ + خبر)',
    rule:
      'When an إضافة (مضاف + مضاف إليه) is used as the مبتدأ of a nominal sentence, it is followed by an indefinite predicate (خبر نكرة).',
    endpoint: '/api/queries/idafa-mubtada-khabar',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنَّ وَعْدَ اللَّهِ حَقٌّ',
      reference: {
        surahId: 31,
        ayahNo: 33,
      },
      translation: 'Indeed, the promise of Allah is truth.',
      highlight: 'وَعْدَ اللَّهِ',
      context:
        'وَعْدَ اللَّهِ حَقٌّ — the promise of Allah is truth. Not hopeful, not probable — حَقٌّ, absolutely true. Every promise He has made — Paradise, accountability, mercy — is as real as the ground you stand on. More real, in fact.',
    },
  },
  {
    key: 'idafa-dual-mubtada-khabar',
    simpleTitle: "Two Owners, One Sentence",
    titleArabic: "إِضَافَة المُثَنَّى مُبْتَدَأ + خَبَر",
    title: 'Idafa (Dual Mudaf) as Mubtada + Khabar',
    rule:
      'When the مضاف of an إضافة is a dual noun, the entire إضافة can be the مبتدأ of a nominal sentence followed by an indefinite predicate.',
    endpoint: '/api/queries/idafa-dual-mubtada-khabar',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'بَلْ يَدَاهُ مَبْسُوطَتَانِ',
      reference: {
        surahId: 5,
        ayahNo: 64,
      },
      translation: 'Rather, both His hands are extended.',
      highlight: 'يَدَاهُ',
      context:
        'يَدَاهُ مَبْسُوطَتَانِ — both His hands are open and extended in giving. This is Allah\'s response to those who said His hand is tied. The image is of a Lord whose generosity never closes, both hands outstretched toward His creation.',
    },
  },
  {
    key: 'mubtada-khabar-idafa',
    simpleTitle: "The Predicate Owns Something",
    titleArabic: "مُبْتَدَأ + خَبَر إِضَافَة",
    title: 'Mubtada + Khabar as Idafa (مبتدأ + خبر مضاف ومضاف إليه)',
    rule:
      'When a definite noun (مبتدأ) in nominative case is followed by an Idafa (مضاف + مضاف إليه) as the predicate, the entire Idafa serves as the خبر.',
    endpoint: '/api/queries/mubtada-khabar-idafa',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'مُّحَمَّدٌ رَّسُولُ اللَّهِ',
      reference: {
        surahId: 48,
        ayahNo: 29,
      },
      translation: 'Muhammad is the Messenger of Allah.',
      highlight: 'رَّسُولُ اللَّهِ',
      context:
        'رَّسُولُ اللَّهِ — the Messenger of Allah. Three Arabic words and an entire faith is declared. No elaborate theology, no chain of intermediaries. Muhammad is the one sent by Allah, and the message he carried is what you are learning to read.',
    },
  },
  {
    key: 'kullu-indef',
    simpleTitle: "Every / Each",
    titleArabic: "كُلّ + نَكِرَة",
    title: 'كُلّ + Indefinite Noun = "Every / Each"',
    rule:
      'When كُلّ is followed by an indefinite noun in genitive case, it means \'every\' or \'each\' — referring to each individual member of a group.',
    endpoint: '/api/queries/kullu-indef',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ',
      reference: {
        surahId: 3,
        ayahNo: 185,
      },
      translation: 'Every soul will taste death.',
      highlight: 'كُلُّ نَفْسٍ',
      context:
        'كُلُّ نَفْسٍ — every soul. Not most, not the careless ones only, but every single soul has an appointment. The reminder is not meant to frighten but to focus: if every soul has an end date, then every day is precious.',
    },
  },
  {
    key: 'kullu-def',
    simpleTitle: "All of",
    titleArabic: "كُلّ + مَعْرِفَة",
    title: 'كُلّ + Definite Noun = "All of"',
    rule:
      'When كُلّ is followed by a definite noun in genitive case, it means \'all of\' — referring to the totality of a known group.',
    endpoint: '/api/queries/kullu-def',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'كُلُّ الطَّعَامِ كَانَ حِلًّا لِّبَنِي إِسْرَائِيلَ',
      reference: {
        surahId: 3,
        ayahNo: 93,
      },
      translation: 'All food was lawful to the Children of Israel.',
      highlight: 'كُلُّ الطَّعَامِ',
      context:
        'كُلُّ الطَّعَامِ — all food — was once permitted to the Children of Israel. The restrictions came later, as a consequence of their own choices. Allah\'s default is ease and permission; it is wrongdoing that narrows what is allowed.',
    },
  },
  {
    key: 'idafa-dual-male',
    simpleTitle: "Of Two Men",
    titleArabic: "مُضَاف إِلَيْهِ مُثَنَّى مُذَكَّر",
    title: 'Idafa with Masculine Dual مضاف إليه',
    rule:
      'When the مضاف إليه is a masculine dual noun, it takes the يْنِ ending because the مضاف إليه is always genitive and dual nouns in genitive use يْنِ.',
    endpoint: '/api/queries/idafa-dual-male',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَجَعَلَ بَيْنَ الْبَحْرَيْنِ حَاجِزًا',
      reference: {
        surahId: 27,
        ayahNo: 61,
      },
      translation: 'And placed between the two seas a barrier.',
      highlight: 'بَيْنَ الْبَحْرَيْنِ',
      context:
        'Allah placed a barrier between the two seas — بَيْنَ الْبَحْرَيْنِ — so that they do not mix, though they flow alongside each other. The barrier is invisible to the eye. How does water obey an unseen boundary? Because Allah commanded it.',
    },
  },
  {
    key: 'idafa-plural-male',
    simpleTitle: "Of Men",
    titleArabic: "مُضَاف إِلَيْهِ جَمْع مُذَكَّر",
    title: 'Idafa with Masculine Plural مضاف إليه',
    rule:
      'When the مضاف إليه is a sound masculine plural, it takes the ـينَ ending because the مضاف إليه is always genitive and sound masculine plurals in genitive use ـينَ.',
    endpoint: '/api/queries/idafa-plural-male',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      reference: {
        surahId: 1,
        ayahNo: 2,
      },
      translation: 'All praise is due to Allah, Lord of the worlds.',
      highlight: 'رَبِّ الْعَالَمِينَ',
      context:
        'رَبِّ الْعَالَمِينَ — Lord of the worlds. Not lord of one nation, one era, one kind of creature — but of every world that exists. Praising Him is the first act the Quran asks of you, because everything belongs to the one who owns everything.',
    },
  },
  {
    key: 'idafa-dual-female',
    simpleTitle: "Of Two Women",
    titleArabic: "مُضَاف إِلَيْهِ مُثَنَّى مُؤَنَّث",
    title: 'Idafa with Feminine Dual (Mudaf Ilayhi)',
    rule:
      'When the مضاف إليه is a feminine dual noun, it takes the تَيْنِ ending in genitive case.',
    endpoint: '/api/queries/idafa-dual-female',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنِّي أُرِيدُ أَنْ أُنكِحَكَ إِحْدَى ابْنَتَيَّ هَاتَيْنِ',
      reference: {
        surahId: 28,
        ayahNo: 27,
      },
      translation: 'Indeed, I wish to wed to you one of these two daughters of mine.',
      highlight: 'ابْنَتَيَّ',
      context:
        'ابْنَتَيَّ — my two daughters. The old man of Madyan offered his daughters in marriage to a stranger who had just shown kindness at the well — no contract, no conditions beyond honesty and work. Honor, generosity, and a father\'s care, all in one word.',
    },
  },
  {
    key: 'idafa-plural-female',
    simpleTitle: "Of Women",
    titleArabic: "مُضَاف إِلَيْهِ جَمْع مُؤَنَّث",
    title: 'Idafa with Feminine Plural (Mudaf Ilayhi)',
    rule:
      'When the مضاف إليه is a sound feminine plural, it takes كسرة (-i) in genitive case — ending in ـاتِ.',
    endpoint: '/api/queries/idafa-plural-female',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'رَّبِّ السَّمَاوَاتِ وَالْأَرْضِ',
      reference: {
        surahId: 78,
        ayahNo: 37,
      },
      translation: 'Lord of the heavens and the earth.',
      highlight: 'رَّبِّ السَّمَاوَاتِ',
      context:
        'رَبِّ السَّمَاوَاتِ — Lord of the heavens. The plural: skies upon skies, layers beyond what any eye has ever seen. All of it held in existence by One who is its Lord — رَبّ meaning not just ownership, but sustained, continuous care.',
    },
  },
  {
    key: 'idafa-muzaf-dual-male',
    simpleTitle: "Two Things of…",
    titleArabic: "المُضَاف مُثَنَّى مُذَكَّر",
    title: 'Idafa: Mudaf is Masculine Dual',
    rule:
      'Idafa where the مضاف (first noun) is masculine dual; the مضاف إليه can be singular, dual, or plural, male or female.',
    endpoint: '/api/queries/idafa-muzaf-dual-male',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَاتْلُ عَلَيْهِمْ نَبَأَ ابْنَيْ آدَمَ',
      reference: {
        surahId: 5,
        ayahNo: 27,
      },
      translation: 'And recite to them the story of the two sons of Adam.',
      highlight: 'ابْنَيْ آدَمَ',
      context:
        'ابْنَيْ آدَمَ — the two sons of Adam. The very first children on earth, the first family tension, the first act of envy. Their story is told so that all who come after them would recognize these two paths — and choose the right one.',
    },
  },
  {
    key: 'idafa-muzaf-dual-female',
    simpleTitle: "Two Feminine Things of…",
    titleArabic: "المُضَاف مُثَنَّى مُؤَنَّث",
    title: 'Idafa: Mudaf is Feminine Dual',
    rule:
      'Idafa where the مضاف is feminine dual; the مضاف إليه can be singular, dual, or plural, male or female.',
    endpoint: '/api/queries/idafa-muzaf-dual-female',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'تَبَّتْ يَدَا أَبِي لَهَبٍ',
      reference: {
        surahId: 111,
        ayahNo: 1,
      },
      translation: 'May the two hands of Abu Lahab perish.',
      highlight: 'يَدَا أَبِي لَهَبٍ',
      context:
        'يَدَا أَبِي لَهَبٍ — the two hands of Abu Lahab, may they perish. The hands that reached out to harm the Prophet ﷺ and obstruct the message. An entire surah was revealed naming one man, a warning preserved in the Quran until the Day of Judgment.',
    },
  },
  {
    key: 'idafa-muzaf-plural-male',
    simpleTitle: "Many Things of…",
    titleArabic: "المُضَاف جَمْع مُذَكَّر",
    title: 'Idafa: Mudaf is Masculine Plural',
    rule:
      'Idafa where the مضاف is masculine plural (sound or broken); the مضاف إليه can be singular, dual, or plural, male or female.',
    endpoint: '/api/queries/idafa-muzaf-plural-male',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'أُولَٰئِكَ أَصْحَابُ الْجَنَّةِ',
      reference: {
        surahId: 2,
        ayahNo: 82,
      },
      translation: 'Those are the companions of Paradise.',
      highlight: 'أَصْحَابُ الْجَنَّةِ',
      context:
        'أَصْحَابُ الْجَنَّةِ — the companions of Paradise. Not visitors, not passers-through, but people who belong there, who are at home there. This is the outcome Allah promises to those who believe and do good.',
    },
  },
  {
    key: 'idafa-muzaf-plural-female',
    simpleTitle: "Many Feminine Things of…",
    titleArabic: "المُضَاف جَمْع مُؤَنَّث",
    title: 'Idafa: Mudaf is Feminine Plural',
    rule:
      'Idafa where the مضاف is feminine plural (sound or broken); the مضاف إليه can be singular, dual, or plural, male or female.',
    endpoint: '/api/queries/idafa-muzaf-plural-female',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'تِلْكَ آيَاتُ اللَّهِ',
      reference: {
        surahId: 2,
        ayahNo: 252,
      },
      translation: 'These are the verses of Allah.',
      highlight: 'آيَاتُ اللَّهِ',
      context:
        'آيَاتُ اللَّهِ — the verses of Allah. Each ayah of the Quran is literally a sign, a pointer toward something real and true. When you read آيَاتُ اللَّهِ as one unit, you are meeting the Quran as it describes itself: signs that belong entirely to God.',
    },
  },
  {
    key: 'idafa-muzaf-plural-male-saalim',
    simpleTitle: "Sound Masculine Owners",
    titleArabic: "المُضَاف جَمْع مُذَكَّر سَالِم",
    title: 'Idafa: Mudaf is Sound Masculine Plural',
    rule:
      'Idafa where the مضاف is sound masculine plural (جمع مذكر سالم) only; the مضاف إليه can be any number/gender.',
    endpoint: '/api/queries/idafa-muzaf-plural-male-saalim',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'ذَٰلِكَ لِمَن لَّمْ يَكُنْ أَهْلُهُ حَاضِرِي الْمَسْجِدِ الْحَرَامِ',
      reference: {
        surahId: 2,
        ayahNo: 196,
      },
      translation: 'That is for one whose family is not present at the Sacred Mosque.',
      highlight: 'حَاضِرِي الْمَسْجِدِ',
      context:
        'حَاضِرِي الْمَسْجِدِ الْحَرَامِ — those present at the Sacred Mosque. The rulings of the Quran are personal and specific: they account for whether you are near Mecca or far from it. Allah\'s law knows your actual situation and answers it with precision and mercy.',
    },
  },
  {
    key: 'idafa-muzaf-plural-female-saalim',
    simpleTitle: "Sound Feminine Owners",
    titleArabic: "المُضَاف جَمْع مُؤَنَّث سَالِم",
    title: 'Idafa: Mudaf is Sound Feminine Plural',
    rule:
      'Idafa where the مضاف is sound feminine plural (جمع مؤنث سالم) only; the مضاف إليه can be any number/gender.',
    endpoint: '/api/queries/idafa-muzaf-plural-female-saalim',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'جَنَّاتُ عَدْنٍ يَدْخُلُونَهَا',
      reference: {
        surahId: 13,
        ayahNo: 23,
      },
      translation: 'Gardens of perpetual residence which they will enter.',
      highlight: 'جَنَّاتُ عَدْنٍ',
      context:
        'جَنَّاتُ عَدْنٍ — Gardens of settling in forever. Not a visit, not a temporary reward, but a forever home. The word عَدْن carries the sense of dwelling, of roots planted deep. This is what awaits the righteous: a home they will never have to leave.',
    },
  },
  {
    key: 'idafa-pronoun-his',
    simpleTitle: "His",
    titleArabic: "ضَمِير هُ",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr هُ (3rd masc. sing. — his)',
    rule:
      'When the مضاف إليه is the attached pronoun \'his/him\' (3rd person masculine singular), it is suffixed to the مضاف. Example: كِتَابُهُ.',
    endpoint: '/api/queries/idafa-pronoun?person=3&gender=1&number=1',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنَّهُ عَلَىٰ رَجْعِهِ لَقَادِرٌ',
      reference: {
        surahId: 86,
        ayahNo: 8,
      },
      translation: 'Indeed, He is able to return him.',
      highlight: 'رَجْعِهِ',
      context:
        'رَجْعِهِ — his return. Allah is speaking about the resurrection of the human being: He is completely able to bring him back. No soul disappears; every soul has an appointed return. The pronoun هُ binds that soul to its resurrection personally.',
    },
  },
  {
    key: 'idafa-pronoun-her',
    simpleTitle: "Hers",
    titleArabic: "ضَمِير هَا",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr هَا (3rd fem. sing. — her)',
    rule:
      'When the مضاف إليه is the attached pronoun \'her\' (3rd person feminine singular), it is suffixed to the مضاف. Example: كِتَابُهَا.',
    endpoint: '/api/queries/idafa-pronoun?person=3&gender=2&number=1',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَالشَّمْسِ وَضُحَاهَا',
      reference: {
        surahId: 91,
        ayahNo: 1,
      },
      translation: 'By the sun and its brightness.',
      highlight: 'ضُحَاهَا',
      context:
        'وَالشَّمْسِ وَضُحَاهَا — by the sun and its own morning brightness. Allah swears by the light that belongs to the sun itself. Even creation bears witness to a truth far larger than itself.',
    },
  },
  {
    key: 'idafa-pronoun-your-m-sing',
    simpleTitle: "Your (m.)",
    titleArabic: "ضَمِير كَ",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr كَ (2nd masc. sing. — your)',
    rule:
      'When the مضاف إليه is the attached pronoun \'your\' (2nd person masculine singular), it is suffixed to the مضاف. Example: كِتَابُكَ.',
    endpoint: '/api/queries/idafa-pronoun?person=2&gender=1&number=1',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَرَفَعْنَا لَكَ ذِكْرَكَ',
      reference: {
        surahId: 94,
        ayahNo: 4,
      },
      translation: 'And We raised high for you your mention.',
      highlight: 'ذِكْرَكَ',
      context:
        'ذِكْرَكَ — your mention. Allah raised it high for the Prophet ﷺ whose name is spoken billions of times a day, in every corner of the earth, in every call to prayer. When you learn that كَ means "your", you hear Allah personally addressing the one He loves most after Him.',
    },
  },
  {
    key: 'idafa-pronoun-your-f-sing',
    simpleTitle: "Your (f.)",
    titleArabic: "ضَمِير كِ",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr كِ (2nd fem. sing. — your)',
    rule:
      'When the مضاف إليه is the attached pronoun \'your\' (2nd person feminine singular), it is suffixed to the مضاف. Example: كِتَابُكِ.',
    endpoint: '/api/queries/idafa-pronoun?person=2&gender=2&number=1',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'يَا مَرْيَمُ اقْنُتِي لِرَبِّكِ',
      reference: {
        surahId: 3,
        ayahNo: 43,
      },
      translation: 'O Maryam, be devoutly obedient to your Lord.',
      highlight: 'لِرَبِّكِ',
      context:
        'Allah speaks to Maryam directly — your Lord, لِرَبِّكِ. He knows her name. He calls on her personally. The one who devoted herself entirely to worship was called to give even more. There is something profoundly moving about a Lord who speaks to His servant with such directness.',
    },
  },
  {
    key: 'idafa-pronoun-their-dual',
    simpleTitle: "Their (two)",
    titleArabic: "ضَمِير هُمَا",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr هُمَا (3rd dual — their)',
    rule:
      'When the مضاف إليه is the attached pronoun \'their\' (3rd person dual — هُمَا), it is suffixed to the مضاف. Same form for masculine and feminine dual.',
    endpoint: '/api/queries/idafa-pronoun?person=3&gender=0&number=2',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَمِن دُونِهِمَا جَنَّتَانِ',
      reference: {
        surahId: 55,
        ayahNo: 62,
      },
      translation: 'And below them both are two other gardens.',
      highlight: 'دُونِهِمَا',
      context:
        'Below the first two gardens are two more — four gardens in total. دُونِهِمَا: below them both, a second tier of Paradise. For those who feared their Lord, the generosity just keeps expanding. What Allah promises for the righteous has no ceiling.',
    },
  },
  {
    key: 'idafa-pronoun-your-dual',
    simpleTitle: "Your (two)",
    titleArabic: "ضَمِير كُمَا",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr كُمَا (2nd dual — your)',
    rule:
      'When the مضاف إليه is the attached pronoun \'your\' (2nd person dual — كُمَا), it is suffixed to the مضاف. Same form for masculine and feminine dual.',
    endpoint: '/api/queries/idafa-pronoun?person=2&gender=0&number=2',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ',
      reference: {
        surahId: 55,
        ayahNo: 13,
      },
      translation: 'So which of the favors of your Lord would you both deny?',
      highlight: 'رَبِّكُمَا',
      context:
        'رَبِّكُمَا — your Lord, the Lord of both of you. This refrain echoes through Surah Ar-Rahman thirty-one times, addressed to mankind and jinn together. Allah is asking both of His creations: which of My gifts will you deny? The only honest answer is: none.',
    },
  },
  {
    key: 'idafa-pronoun-their-m-pl',
    simpleTitle: "Their (m.)",
    titleArabic: "ضَمِير هُمْ",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr هُمْ (3rd masc. plural — their)',
    rule:
      'When the مضاف إليه is the attached pronoun \'their\' (3rd person masculine plural), it is suffixed to the مضاف. Example: كِتَابُهُمْ.',
    endpoint: '/api/queries/idafa-pronoun?person=3&gender=1&number=3',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'خَتَمَ اللَّهُ عَلَىٰ قُلُوبِهِمْ',
      reference: {
        surahId: 2,
        ayahNo: 7,
      },
      translation: 'Allah has set a seal upon their hearts.',
      highlight: 'قُلُوبِهِمْ',
      context:
        'قُلُوبِهِمْ — their hearts. Allah sealed them — not arbitrarily, but as a consequence of their own choice to refuse. The heart is not a passive organ in the Quran: it is the seat of sight and decision. A sealed heart cannot receive the light that is right in front of it.',
    },
  },
  {
    key: 'idafa-pronoun-their-f-pl',
    simpleTitle: "Their (f.)",
    titleArabic: "ضَمِير هُنَّ",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr هُنَّ (3rd fem. plural — their)',
    rule:
      'When the مضاف إليه is the attached pronoun \'their\' (3rd person feminine plural), it is suffixed to the مضاف. Example: كِتَابُهُنَّ.',
    endpoint: '/api/queries/idafa-pronoun?person=3&gender=2&number=3',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَلَا يُبْدِينَ زِينَتَهُنَّ',
      reference: {
        surahId: 24,
        ayahNo: 31,
      },
      translation: 'And not to expose their adornment.',
      highlight: 'زِينَتَهُنَّ',
      context:
        'زِينَتَهُنَّ — their adornment. This is a command of protection and dignity: a woman\'s beauty is her own. The pronoun هُنَّ makes the ownership clear — it belongs to them, not to public display.',
    },
  },
  {
    key: 'idafa-pronoun-your-m-pl',
    simpleTitle: "Your (m. pl.)",
    titleArabic: "ضَمِير كُمْ",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr كُمْ (2nd masc. plural — your)',
    rule:
      'When the مضاف إليه is the attached pronoun \'your\' (2nd person masculine plural), it is suffixed to the مضاف. Example: كِتَابُكُمْ.',
    endpoint: '/api/queries/idafa-pronoun?person=2&gender=1&number=3',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ',
      reference: {
        surahId: 49,
        ayahNo: 13,
      },
      translation:
        'Indeed, the most noble of you in the sight of Allah is the most righteous of you.',
      highlight: 'أَكْرَمَكُمْ',
      context:
        'أَكْرَمَكُمْ — the most noble of you. Not the richest, not the most powerful, not the most beautiful. The most noble in Allah\'s sight is the one most aware of Him. Every human ranking system is overturned in a single phrase.',
    },
  },
  {
    key: 'idafa-pronoun-your-f-pl',
    simpleTitle: "Your (f. pl.)",
    titleArabic: "ضَمِير كُنَّ",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr كُنَّ (2nd fem. plural — your)',
    rule:
      'When the مضاف إليه is the attached pronoun \'your\' (2nd person feminine plural), it is suffixed to the مضاف. Example: كِتَابُكُنَّ.',
    endpoint: '/api/queries/idafa-pronoun?person=2&gender=2&number=3',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَقَرْنَ فِي بُيُوتِكُنَّ',
      reference: {
        surahId: 33,
        ayahNo: 33,
      },
      translation: 'And abide in your houses.',
      highlight: 'بُيُوتِكُنَّ',
      context:
        'بُيُوتِكُنَّ — your homes. The command was addressed to the wives of the Prophet ﷺ, honored women in honored homes. The pronoun كُنَّ marks each home as theirs — places of dignity, presence, and purpose.',
    },
  },
  {
    key: 'idafa-pronoun-my',
    simpleTitle: "My",
    titleArabic: "ضَمِير ي",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr ي (1st sing. — my)',
    rule:
      'When the مضاف إليه is the attached pronoun \'my\' (1st person singular — ي), it is suffixed to the مضاف. Example: كِتَابِي.',
    endpoint: '/api/queries/idafa-pronoun?person=1&gender=0&number=1',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'قُلْ إِنَّ صَلَاتِي وَنُسُكِي لِلَّهِ',
      reference: {
        surahId: 6,
        ayahNo: 162,
      },
      translation: 'Say: Indeed, my prayer and my rites of sacrifice are for Allah.',
      highlight: 'صَلَاتِي',
      context:
        'صَلَاتِي — my prayer. Not prayer in general, but mine, personally offered. The Prophet ﷺ was told to make this declaration of total dedication. When you pray, you too are saying: this is mine to give, and I give it entirely to Allah.',
    },
  },
  {
    key: 'idafa-pronoun-our',
    simpleTitle: "Our",
    titleArabic: "ضَمِير نَا",
    title: 'Idafa + Mudaf Ilayhi = Ḍamīr نَا (our)',
    rule:
      'When the مضاف إليه is the attached pronoun \'our\' (1st person — نَا), it is suffixed to the مضاف. Example: كِتَابُنَا.',
    endpoint: '/api/queries/idafa-pronoun?person=1&gender=0&number=0',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً',
      reference: {
        surahId: 2,
        ayahNo: 201,
      },
      translation: 'Our Lord, give us in this world that which is good.',
      highlight: 'رَبَّنَا',
      context:
        'رَبَّنَا — Our Lord. The most beloved form of address to Allah in the Quran: personal, plural, intimate. Not "the God" in the abstract, but Our Lord — the one who belongs to us and to whom we belong. This is the opening of the walking believer\'s dua.',
    },
  },
  {
    key: 'idafa-zameer-khabar',
    simpleTitle: "His Book is…",
    titleArabic: "إِضَافَة مَعَ ضَمِير + خَبَر",
    title: 'إضافة مع ضمير + خبر (Idafa with Pronoun + Khabar)',
    rule:
      'Nominal sentence: مبتدأ is an idafa where the مضاف إليه is a pronoun (ضمير), followed by a خبر (indefinite nominative).',
    endpoint: '/api/queries/idafa-zameer-khabar',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَقَالُوا قُلُوبُنَا غُلْفٌ',
      reference: {
        surahId: 2,
        ayahNo: 88,
      },
      translation: 'And they said: Our hearts are wrapped.',
      highlight: 'قُلُوبُنَا غُلْفٌ',
      context:
        'قُلُوبُنَا غُلْفٌ — our hearts are wrapped, covered. Those who rejected the message said this as an excuse. But the Quran records it as a warning: the most dangerous condition is a heart that has built a wall around itself and called that wall a virtue.',
    },
  },
  {
    key: 'mubtada-khabar-idafa-zameer',
    simpleTitle: "The Subject Owns It",
    titleArabic: "مُبْتَدَأ + خَبَر إِضَافَة مَعَ ضَمِير",
    title: 'مبتدأ + خبر (إضافة مع ضمير) — Mubtada + Khabar as Idafa with Pronoun',
    rule:
      'Nominal sentence: مبتدأ followed by a خبر that is an idafa where the مضاف إليه is a pronoun (ضمير).',
    endpoint: '/api/queries/mubtada-khabar-idafa-zameer',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنَّ اللَّهَ رَبِّي وَرَبُّكُمْ',
      reference: {
        surahId: 3,
        ayahNo: 51,
      },
      translation: 'Indeed, Allah is my Lord and your Lord.',
      highlight: 'رَبِّي وَرَبُّكُمْ',
      context:
        'رَبِّي وَرَبُّكُمْ — my Lord and your Lord. Isa ﷺ declared this himself: the one I worship is the same one you must worship. The message of every prophet was the same, the Lord of every prophet was the same. This phrase unifies the entire prophetic tradition in six letters.',
    },
  },
  {
    key: 'idafa-pronoun-hu-fatha-dammah',
    simpleTitle: "Hu after a, u",
    titleArabic: "هُ بَعْد فَتْحَة أَو ضَمَّة",
    title: 'مضاف إليه ضمير هُو (هُ) — بعد فتحة أو ضمة',
    rule:
      'When the attached pronoun for \'his/him\' follows a letter with فتحة or ضمة, it is pronounced/written with ضمة on the ه: هُ.',
    endpoint:
      '/api/queries/idafa-pronoun?person=3&gender=1&number=1&harakah=fatha_dammah',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ',
      reference: {
        surahId: 111,
        ayahNo: 2,
      },
      translation: 'His wealth will not avail him, nor what he gained.',
      highlight: 'مَالُهُ',
      context:
        'مَالُهُ — his wealth. Abu Lahab had so much, and none of it helped him in the end. مَالُهُ وَمَا كَسَبَ: everything he owned and everything he earned. On that Day, all of it was worthless. Wealth that is not put in service of truth serves only itself.',
    },
  },
  {
    key: 'idafa-pronoun-hi-kasra',
    simpleTitle: "Hi after i",
    titleArabic: "هِ بَعْد كَسْرَة",
    title: 'مضاف إليه ضمير هِي (هِ) — بعد كسرة',
    rule:
      'When the attached pronoun for \'his/him\' follows a letter with كسرة, it is pronounced/written with كسرة on the ه: هِ.',
    endpoint: '/api/queries/idafa-pronoun?person=3&gender=1&number=1&harakah=kasra',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَذَكَرَ اسْمَ رَبِّهِ فَصَلَّىٰ',
      reference: {
        surahId: 87,
        ayahNo: 15,
      },
      translation: 'And remembers the name of his Lord and prays.',
      highlight: 'رَبِّهِ',
      context:
        'رَبِّهِ — his Lord. The successful person is described by this: he remembers the name of his Lord and prays. رَبِّهِ — the pronoun makes the Lord personal, his Lord. That intimacy between servant and Lord is what moves a person from knowing to doing.',
    },
  },
  {
    key: 'idafa-pronoun-hi-ya',
    simpleTitle: "Hi after yaa",
    titleArabic: "هِ بَعْد يَاء",
    title: 'مضاف إليه ضمير هِ — بعد ياء',
    rule:
      'When the attached pronoun for \'his/him\' follows a ياء, it is pronounced هِ.',
    endpoint: '/api/queries/idafa-pronoun?person=3&gender=1&number=1&harakah=ya',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'مُصَدِّقًا لِّمَا بَيْنَ يَدَيْهِ',
      reference: {
        surahId: 3,
        ayahNo: 3,
      },
      translation: 'Confirming that which was before it.',
      highlight: 'يَدَيْهِ',
      context:
        'بَيْنَ يَدَيْهِ — between its two hands, meaning "what came before it." The Quran describes itself as confirming the scriptures that preceded it. It does not cancel what came before — it stands as the final witness to the same truth that every prophet carried.',
    },
  },
  {
    key: 'idafa-pronoun-hu-sukoon',
    simpleTitle: "Hu after a pause",
    titleArabic: "هُ بَعْد سُكُون",
    title: 'مضاف إليه ضمير هُ — بعد سكون',
    rule:
      'When the attached pronoun for \'his/him\' follows a letter with سكون, the ه is written/pronounced with سكون: هُ. (Excluded: when the previous letter is ياء ساكن.)',
    endpoint: '/api/queries/idafa-pronoun?person=3&gender=1&number=1&harakah=sukoon',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'لِّيُنذِرَ بَأْسًا شَدِيدًا مِّن لَّدُنْهُ',
      reference: {
        surahId: 18,
        ayahNo: 2,
      },
      translation: 'To warn of severe punishment from Him.',
      highlight: 'لَّدُنْهُ',
      context:
        'مِن لَّدُنْهُ — from directly beside Him, from His very presence. The warning in the Quran does not come from a distant authority — it comes from Allah Himself, immediately and personally. There is no distance between Him and what He is saying to you.',
    },
  },
  {
    key: 'idafa-asma-ab',
    simpleTitle: "Father",
    titleArabic: "أَب",
    title: 'الأسماء الخمسة في الإضافة — أَب (father)',
    rule:
      'Idafa where the مضاف is أَب (father), one of the five special nouns (الأسماء الخمسة). Examples ordered by i\'rab: رفع، نصب، جر.',
    endpoint: '/api/queries/idafa-asma-ab',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَإِذْ قَالَ إِبْرَاهِيمُ لِأَبِيهِ آزَرَ',
      reference: {
        surahId: 6,
        ayahNo: 74,
      },
      translation: 'And when Ibrahim said to his father Azar…',
      highlight: 'لِأَبِيهِ',
      context:
        'لِأَبِيهِ — to his father. Ibrahim ﷺ spoke words of gentle concern to the man who worshipped idols and stood against his mission. He still called him أَبِي — my father. Love for family does not end simply because conviction points in a different direction.',
    },
  },
  {
    key: 'idafa-asma-akh',
    simpleTitle: "Brother",
    titleArabic: "أَخ",
    title: 'الأسماء الخمسة في الإضافة — أَخ (brother)',
    rule:
      'Idafa where the مضاف is أَخ (brother). Examples ordered by i\'rab: رفع، نصب، جر.',
    endpoint: '/api/queries/idafa-asma-akh',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَإِلَىٰ عَادٍ أَخَاهُمْ هُودًا',
      reference: {
        surahId: 7,
        ayahNo: 65,
      },
      translation: 'And to the people of Aad We sent their brother Hud.',
      highlight: 'أَخَاهُمْ',
      context:
        'أَخَاهُمْ — their brother. Allah sent the prophet Hud from among the people of Aad themselves, someone they knew and grew up with. Every prophet came from within his own community. The call to truth always comes from someone close.',
    },
  },
  {
    key: 'idafa-asma-ham',
    simpleTitle: "Father-in-law",
    titleArabic: "حَم",
    title: 'الأسماء الخمسة في الإضافة — حَم (father-in-law)',
    rule:
      'Idafa where the مضاف is حَم (father-in-law). Examples ordered by i\'rab: رفع، نصب، جر.',
    endpoint: '/api/queries/idafa-asma-ham',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'حَمُوهَا رَجُلٌ كَرِيمٌ',
      reference: null,
      translation: 'Her father-in-law is a generous man. (classical example)',
      highlight: 'حَمُوهَا',
      context:
        'Interestingly, حَم — father-in-law — never appears in the Quran itself. This is one small corner of the Arabic language that the Quran did not directly preserve, a gentle reminder that the language is vast and the Quran chose its words with perfect precision.',
    },
  },
  {
    key: 'idafa-asma-fam',
    simpleTitle: "Mouth",
    titleArabic: "فَم",
    title: 'الأسماء الخمسة في الإضافة — فَم (mouth)',
    rule:
      'Idafa where the مضاف is فَم (mouth). Examples ordered by i\'rab: رفع، نصب، جر.',
    endpoint: '/api/queries/idafa-asma-fam',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'كَبَاسِطِ كَفَّيْهِ إِلَى الْمَاءِ لِيَبْلُغَ فَاهُ',
      reference: {
        surahId: 13,
        ayahNo: 14,
      },
      translation: 'Like one who stretches his hands toward water to reach his mouth.',
      highlight: 'فَاهُ',
      context:
        'فَاهُ — his mouth. The one who calls upon anything other than Allah is compared to someone stretching both hands toward water, hoping it will somehow reach their mouth with nothing to carry it there. The image of that reaching, helpless فَاهُ stays with you long after the ayah ends.',
    },
  },
  {
    key: 'idafa-asma-dhu',
    simpleTitle: "Possessor of",
    titleArabic: "ذُو",
    title: 'الأسماء الخمسة في الإضافة — ذُو (possessor)',
    rule:
      'Idafa where the مضاف is ذُو (possessor/owner). Examples ordered by i\'rab: رفع، نصب، جر.',
    endpoint: '/api/queries/idafa-asma-dhu',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَاللَّهُ ذُو الْفَضْلِ الْعَظِيمِ',
      reference: {
        surahId: 2,
        ayahNo: 105,
      },
      translation: 'And Allah is the possessor of great bounty.',
      highlight: 'ذُو الْفَضْلِ',
      context:
        'ذُو الْفَضْلِ الْعَظِيمِ — the possessor of tremendous bounty. Not just generous, but the Owner of generosity itself. All goodness flows from Him. Whatever blessing has entered your life arrived through this hand.',
    },
  },
  {
    key: 'idafa-pronoun-hima',
    simpleTitle: "Hima after i",
    titleArabic: "هِمَا بَعْد كَسْرَة أَو يَاء",
    title: 'Idafa with hima (3rd dual pronoun after kasra or yā sākin)',
    rule:
      'Idafa where the مضاف إليه is the 3rd dual pronoun هُمَا in its form after kasra or yā sākin: هِمَا.',
    endpoint: '/api/queries/idafa-pronoun-hima',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَبَارَكْنَا عَلَيْهِ وَعَلَىٰ إِسْحَاقَ وَمِن ذُرِّيَّتِهِمَا',
      reference: {
        surahId: 37,
        ayahNo: 113,
      },
      translation: 'And We blessed him and Ishaq — and among their descendants…',
      highlight: 'ذُرِّيَّتِهِمَا',
      context:
        'ذُرِّيَّتِهِمَا — their descendants. Allah blessed Ibrahim and Ishaq, then extended that blessing forward through their generations. You reading this today may be among the heirs of that dua. Blessings from righteous ancestors flow far into time.',
    },
  },
  {
    key: 'idafa-pronoun-him',
    simpleTitle: "Him after i",
    titleArabic: "هِمْ بَعْد كَسْرَة أَو يَاء",
    title: 'Idafa with him (3rd masculine plural pronoun after kasra or yā sākin)',
    rule:
      'Idafa where the مضاف إليه is the 3rd masculine plural pronoun هُمْ in its form after kasra or yā sākin: هِمْ.',
    endpoint: '/api/queries/idafa-pronoun-him',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'فِي قُلُوبِهِم مَّرَضٌ',
      reference: {
        surahId: 2,
        ayahNo: 10,
      },
      translation: 'In their hearts is a disease.',
      highlight: 'قُلُوبِهِم',
      context:
        'قُلُوبِهِمْ — their hearts. The Quran diagnoses a sickness not of the body but of the heart that has learned to perform belief while doubting it. One of the Quran\'s starkest warnings: a sick heart does not always know it is sick.',
    },
  },
  {
    key: 'idafa-pronoun-hinna',
    simpleTitle: "Hinna after i",
    titleArabic: "هِنَّ بَعْد كَسْرَة أَو يَاء",
    title: 'Idafa with hinna (3rd feminine plural pronoun after kasra or yā sākin)',
    rule:
      'Idafa where the مضاف إليه is the 3rd feminine plural pronoun هُنَّ in its form after kasra or yā sākin: هِنَّ.',
    endpoint: '/api/queries/idafa-pronoun-hinna',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَلَا يُبْدِينَ زِينَتَهُنَّ إِلَّا لِبُعُولَتِهِنَّ',
      reference: {
        surahId: 24,
        ayahNo: 31,
      },
      translation: 'And not to expose their adornment except to their husbands.',
      highlight: 'لِبُعُولَتِهِنَّ',
      context:
        'لِبُعُولَتِهِنَّ — to their husbands. The list of those to whom a woman may reveal her adornment is specific, careful, and protective. The word بُعُولَتِهِنَّ for husbands is ancient and dignified — it carries the weight of responsibility as much as relationship.',
    },
  },
  {
    key: 'idafa-ya-fatha-after-alif',
    simpleTitle: "My after alif",
    titleArabic: "يَ بَعْد أَلِف",
    title: 'Idafa — ya (my) with fatha after alif',
    rule:
      'Idafa where the مضاف إليه is ي (my) and the ya carries fatha (ىَ) because the letter before it is alif (ا or ى).',
    endpoint: '/api/queries/idafa-ya-fatha-after-alif',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'فَمَن تَبِعَ هُدَايَ فَلَا خَوْفٌ عَلَيْهِمْ',
      reference: {
        surahId: 2,
        ayahNo: 38,
      },
      translation: 'Whoever follows My guidance — no fear will there be upon them.',
      highlight: 'هُدَايَ',
      context:
        'هُدَايَ — My guidance. Allah calls it His own. This is not human wisdom or cultural tradition — it is guidance from Allah Himself. Whoever follows it will know no fear and no grief. The promise is absolute: follow My guidance, and you are safe.',
    },
  },
  {
    key: 'idafa-ya-shadda-two-yas',
    simpleTitle: "My with a doubled yaa",
    titleArabic: "يّ (يَاءَان)",
    title: 'Idafa — ya (my) with shadda (two yās)',
    rule:
      'Idafa where the مضاف إليه is ي (my), and the ya has shadda (يّ) because the مضاف ends in yā — two yās become يّ.',
    endpoint: '/api/queries/idafa-ya-shadda-two-yas',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'يَا بُنَيَّ لَا تُشْرِكْ بِاللَّهِ',
      reference: {
        surahId: 31,
        ayahNo: 13,
      },
      translation: 'O my dear son, do not associate anything with Allah.',
      highlight: 'بُنَيَّ',
      context:
        'بُنَيَّ — my dear son. The first word Luqman speaks to his child is an expression of love: my dear son. Then comes the greatest advice a father can give. The intimacy comes before the instruction. This is how the Quran models the relationship between wisdom and affection.',
    },
  },
  {
    key: 'idafa-ya-fatha-joining-next',
    simpleTitle: "My joining the next word",
    titleArabic: "يَ وَصْلًا",
    title: 'Idafa — ya (my) with fatha joining the next word',
    rule:
      'Idafa where the مضاف إليه is ي (my) with fatha (ىَ) due to joining with the word that follows; the next word is shown.',
    endpoint: '/api/queries/idafa-ya-fatha-joining-next',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'قَالَ إِبْرَاهِيمُ رَبِّيَ الَّذِي يُحْيِي وَيُمِيتُ',
      reference: {
        surahId: 2,
        ayahNo: 258,
      },
      translation: 'Ibrahim said: My Lord is the one who gives life and causes death.',
      highlight: 'رَبِّيَ',
      context:
        'رَبِّيَ — my Lord. Ibrahim ﷺ said this standing before a king who believed he had power over life and death. Without hesitation: my Lord is the one who truly gives life and causes death — not you. رَبِّيَ: personal, possessive, unafraid.',
    },
  },
  {
    key: 'idafa-complex',
    simpleTitle: "Chain of Three",
    titleArabic: "مُضَاف + مُضَاف إِلَيْهِ + مُضَاف إِلَيْهِ",
    title: 'Complex Idafa — مضاف + مضاف إليه + مضاف إليه (Two Mudaf Ilayhis)',
    rule:
      'When an Idafa has two consecutive مضاف إليه terms, the structure is: مضاف (no ال) followed by the first مضاف إليه (GEN), then the second مضاف إليه (GEN). All three words form one chain: \'X of Y of Z\'.',
    endpoint: '/api/queries/idafa-complex',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'مَالِكِ يَوْمِ الدِّينِ',
      reference: {
        surahId: 1,
        ayahNo: 4,
      },
      translation: 'Master of the Day of Judgment.',
      highlight: 'مَالِكِ يَوْمِ الدِّينِ',
      context:
        'مَالِكِ يَوْمِ الدِّينِ — Master of the Day of Judgment. Three words, and one of the most weight-bearing phrases in all of human language. Every account will be settled on that Day by the One who owns it. We recite this in every prayer so that we never forget who holds the final word.',
    },
  },
  {
    key: 'idafa-mudaf-sifah',
    simpleTitle: "Describing the Owner",
    titleArabic: "صِفَة المُضَاف",
    title: 'Idafa: Mudaf + Mudaf Ilayhi + Sifah of Mudaf',
    rule:
      'Three-word Idafa where a descriptive adjective comes after the Idafa and describes the mudaf (first noun): [مضاف + مضاف إليه] + صفة المضاف.',
    endpoint: '/api/queries/idafa-mudaf-sifah',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَرَبُّكَ الْغَفُورُ ذُو الرَّحْمَةِ',
      reference: {
        surahId: 18,
        ayahNo: 58,
      },
      translation: 'And your Lord is the Forgiving, the possessor of mercy.',
      highlight: 'رَبُّكَ الْغَفُورُ',
      context:
        'رَبُّكَ الْغَفُورُ — your Lord, the Forgiving One. Not "the Lord" in some general sense, but yours — directly, personally. And He is الْغَفُورُ: the one who forgives constantly and thoroughly. This is who is waiting for your return.',
    },
  },
  {
    key: 'idafa-mudaf-ilayhi-sifah',
    simpleTitle: "Describing What is Owned",
    titleArabic: "صِفَة المُضَاف إِلَيْهِ",
    title: 'Idafa: Mudaf + Mudaf Ilayhi + Sifah of Mudaf Ilayhi',
    rule:
      'Three-word Idafa where a descriptive adjective comes after the Idafa and describes the mudaf ilayhi (second noun): [مضاف + مضاف إليه] + صفة المضاف إليه.',
    endpoint: '/api/queries/idafa-mudaf-ilayhi-sifah',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'إِنِّي أَخَافُ إِنْ عَصَيْتُ رَبِّي عَذَابَ يَوْمٍ عَظِيمٍ',
      reference: {
        surahId: 6,
        ayahNo: 15,
      },
      translation:
        'Indeed I fear, if I should disobey my Lord, the punishment of a tremendous Day.',
      highlight: 'عَذَابَ يَوْمٍ عَظِيمٍ',
      context:
        'عَذَابَ يَوْمٍ عَظِيمٍ — the punishment of a tremendous Day. The Prophet ﷺ was told to say: I fear this. Not because fear paralyzes, but because it keeps you honest. The one who fears a tremendous Day lives today with tremendous care.',
    },
  },
  {
    key: 'idafa-ishara-mudaf',
    simpleTitle: "This Owner",
    titleArabic: "إِشَارَة إِلَى المُضَاف",
    title: 'Idafa with Ism Ishara Pointing to Mudaf',
    rule:
      'Idafa where the mudaf and its mudaf ilayhi (often an attached pronoun) form a single word, followed by an ism ishara that points back to the mudaf.',
    endpoint: '/api/queries/idafa-ishara-mudaf',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'فَلَا يَقْرَبُوا الْمَسْجِدَ الْحَرَامَ بَعْدَ عَامِهِمْ هَٰذَا',
      reference: {
        surahId: 9,
        ayahNo: 28,
      },
      translation: 'So let them not approach the Sacred Mosque after this, their year.',
      highlight: 'عَامِهِمْ هَٰذَا',
      context:
        'عَامِهِمْ هَٰذَا — this year of theirs. A specific moment in history: the year when the Sacred Mosque was permanently given back to those who honored it. Allah speaks about time and place with precision. Some thresholds, once crossed, are not crossed again.',
    },
  },
  {
    key: 'idafa-ishara-mudaf-ilayhi',
    simpleTitle: "This Owned Thing",
    titleArabic: "إِشَارَة إِلَى المُضَاف إِلَيْهِ",
    title: 'Idafa with Ism Ishara Pointing to Mudaf Ilayhi',
    rule:
      'Idafa where an ism ishara comes between the mudaf and mudaf ilayhi, and points to the mudaf ilayhi. Structure: مضاف + اسم إشارة + مضاف إليه.',
    endpoint: '/api/queries/idafa-ishara-mudaf-ilayhi',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'عَلَىٰ أَن يَأْتُوا بِمِثْلِ هَٰذَا الْقُرْآنِ',
      reference: {
        surahId: 17,
        ayahNo: 88,
      },
      translation: '…to produce the like of this Quran.',
      highlight: 'بِمِثْلِ هَٰذَا الْقُرْآنِ',
      context:
        'بِمِثْلِ هَٰذَا الْقُرْآنِ — the like of this Quran. All of mankind and all of jinn together cannot produce it. The challenge has stood for fourteen centuries, unanswered. What you are learning to read is inimitable.',
    },
  },
  {
    key: 'murrakkab-jaari-bi',
    simpleTitle: "With / By",
    titleArabic: "بِ + مَجْرُور",
    title: 'Murrakkab Jaari with Bi (بِ + majrūr noun)',
    rule:
      'Prepositional phrase (مركب جرّي) where the ḥarf jar is بِ and the attached word contains both بِ and a single majrūr noun (e.g. بِاسْمِ).',
    endpoint: '/api/queries/murrakkab-jaari-bi',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      reference: {
        surahId: 1,
        ayahNo: 1,
      },
      translation: 'In the name of Allah, the Most Gracious, the Most Merciful.',
      highlight: 'بِسْمِ',
      context:
        'بِسْمِ اللَّهِ — in the name of Allah. Every surah of the Quran begins here. Every significant act in a believer\'s life begins here. Before anything, I invoke His name. Before I begin, He is already present.',
    },
  },
  {
    key: 'murrakkab-jaari-bi-two',
    simpleTitle: "With Two Nouns",
    titleArabic: "بِ + مَجْرُورَان",
    title: 'Murrakkab Jaari with Bi and Two Majrūr Nouns',
    rule:
      'Prepositional phrase where the ḥarf jar is بِ and it is followed by two majrūr nouns joined by وَ.',
    endpoint: '/api/queries/murrakkab-jaari-bi-two',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic:
        'وَاذْكُر رَّبَّكَ فِي نَفْسِكَ تَضَرُّعًا وَخِيفَةً وَدُونَ الْجَهْرِ مِنَ الْقَوْلِ بِالْغُدُوِّ وَالْآصَالِ',
      reference: {
        surahId: 7,
        ayahNo: 205,
      },
      translation:
        'And remember your Lord within yourself, humbly and with fear, in the mornings and the evenings.',
      highlight: 'بِالْغُدُوِّ وَالْآصَالِ',
      context:
        'بِالْغُدُوِّ وَالْآصَالِ — in the mornings and the evenings. Allah tells you to remember Him at both ends of the day, privately, humbly, without raising your voice. Whatever fills the hours between, the day begins and ends with Him.',
    },
  },
  {
    key: 'murrakkab-jaari-bi-idafa',
    simpleTitle: "With Ownership",
    titleArabic: "بِ + إِضَافَة",
    title: 'Murrakkab Jaari with Bi and Idafa',
    rule:
      'Prepositional phrase where the ḥarf jar is بِ and the following majrūr noun is itself a mudhaf, followed by its mudhaf ilayhi.',
    endpoint: '/api/queries/murrakkab-jaari-bi-idafa',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
      reference: {
        surahId: 96,
        ayahNo: 1,
      },
      translation: 'Recite in the name of your Lord who created.',
      highlight: 'بِاسْمِ رَبِّكَ',
      context:
        'بِاسْمِ رَبِّكَ — in the name of your Lord. The very first word of revelation was a command to read, and it began here: in His name, the One who created you. Before any knowledge, before any word, the starting point is Him.',
    },
  },
  {
    key: 'jar-ta',
    simpleTitle: "By (oath ta)",
    titleArabic: "تَ + مَجْرُور",
    title: 'حرف الجر تَ + اسم مجرور (Jar + Majrur with تَ)',
    rule:
      'Pattern where the harf jar is the single-letter preposition تَ, followed immediately by a noun in the genitive case (اسم مجرور).',
    endpoint: '/api/queries/jar-ta',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'قَالُوا تَاللَّهِ إِنَّكَ لَفِي ضَلَالِكَ الْقَدِيمِ',
      reference: {
        surahId: 12,
        ayahNo: 95,
      },
      translation: 'They said: By Allah, indeed you are in your same old error.',
      highlight: 'تَاللَّهِ',
      context:
        'تَاللَّهِ — By Allah. Even those who rejected Ya\'qub ﷺ swore by Allah\'s name when they wanted to assert something serious. They knew, on some level, that His name is the most powerful oath there is. Yet they swore it while being wrong. Names are not magic — sincerity is what matters.',
    },
  },
  {
    key: 'jar-wa',
    simpleTitle: "By (oath wa)",
    titleArabic: "وَ + مَجْرُور",
    title: 'حرف الجر وَ + اسم مجرور (Jar + Majrur with وَ)',
    rule:
      'Pattern where the harf jar is وَ (used here as a preposition), followed immediately by a noun in the genitive case (اسم مجرور).',
    endpoint: '/api/queries/jar-wa',
    screenType: 'examples',
    status: 'available',
    intro: {
      arabic: 'وَالْعَصْرِ. إِنَّ الْإِنسَانَ لَفِي خُسْرٍ',
      reference: {
        surahId: 103,
        ayahNo: 1,
      },
      translation: 'By time — indeed, mankind is in loss.',
      highlight: 'وَالْعَصْرِ',
      context:
        'وَالْعَصْرِ — By time. Allah swears by it. Time is the one resource every human being is given equally, and nearly every human wastes it. What follows is barely three verses — yet it contains the entire formula for not being among the losers.',
    },
  },
];

/**
 * Look up a rule entry by its key. Returns `null` if not found.
 */
export function getRuleByKey(key) {
  return RULES.find((rule) => rule.key === key) ?? null;
}

/**
 * Curated lesson intro for a rule key, or `null` when none is set.
 */
export function getLessonIntro(key) {
  return getRuleByKey(key)?.intro ?? null;
}

/**
 * Spoken text for rule TTS. `variant` is `'summary'` (intro.noticeSummary when
 * set) or `'full'` (the rule explanation). Returns `null` when unknown / empty.
 */
export function getRuleTtsText(key, variant = 'full') {
  const rule = getRuleByKey(key);
  if (!rule) return null;

  if (variant === 'summary') {
    const summary = rule.intro?.noticeSummary;
    if (typeof summary === 'string' && summary.trim()) {
      return summary.trim();
    }
  }

  const text = rule.rule;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}

/** Rule keys that have spoken full-text explanations. */
export function getRuleTtsKeys() {
  return RULES.filter((r) => getRuleTtsText(r.key, 'full')).map((r) => r.key);
}

/**
 * Filter to only the rules whose backend route currently exists.
 */
export function getAvailableRules() {
  return RULES.filter((rule) => rule.status === 'available');
}
