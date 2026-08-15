import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema(
  {
    surah: Number,
    ayah: Number,
    word: Number,
    translations: mongoose.Schema.Types.Mixed,
  },
  {
    collection: 'translations',
    strict: false,
  }
);

translationSchema.index({ surah: 1, ayah: 1, word: 1 });

export const Translation = mongoose.model('Translation', translationSchema);
