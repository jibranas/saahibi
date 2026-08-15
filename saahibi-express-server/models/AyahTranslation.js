import mongoose from 'mongoose';

/**
 * Verse-level English translations, cached from quranenc.com.
 *
 * The `translations` collection only holds word-by-word glosses, which read
 * poorly as a sentence. This caches a proper verse rendering the first time an
 * ayah is shown, so the upstream API is hit at most once per (ayah, edition).
 */
const ayahTranslationSchema = new mongoose.Schema(
  {
    surahId: { type: Number, required: true },
    ayahNo: { type: Number, required: true },
    edition: { type: String, required: true },
    translation: { type: String, required: true },
    fetchedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'ayahTranslations',
    strict: false,
  }
);

ayahTranslationSchema.index(
  { surahId: 1, ayahNo: 1, edition: 1 },
  { unique: true }
);

export const AyahTranslation = mongoose.model(
  'AyahTranslation',
  ayahTranslationSchema
);
