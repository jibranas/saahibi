import mongoose from 'mongoose';

const morphologySchema = new mongoose.Schema(
  {
    Id: Number,
    SurahId: Number,
    AyahId: Number,
    WordId: Number,
    AyahNo: Number,
    WordNo: Number,
    SegmentNo: Number,
    WordPart: Number,
    PartOfSpeech: String,
    Person: Number,
    Gender: Number,
    Number: Number,
    Text: String,
    TextBw: String,
    Root: String,
    RootBw: String,
    Lemma: String,
    LemmaBw: String,
    LemmaBwNew: String,
    Special: String,
    SpecialBw: String,
    PrefixType: String,
    SuffixType: String,
    VerbAspect: String,
    VerbMood: String,
    VerbVoice: String,
    VerbForm: String,
    NominalDerivation: String,
    NominalCase: String,
    NominalState: String,
  },
  {
    collection: 'morphology',
    strict: false,
  }
);

// Canonical mushaf order. Serves both the whole-corpus scan that warms the
// in-memory store and the per-word lookups in /api/word-grammar, neither of
// which had an index before — every query was a full scan of 130k documents.
morphologySchema.index({ SurahId: 1, AyahNo: 1, WordNo: 1, SegmentNo: 1 });

export const Morphology = mongoose.model('Morphology', morphologySchema);
