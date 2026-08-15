import mongoose from 'mongoose';

const rootMeaningSchema = new mongoose.Schema(
  {
    root: {
      letters: { type: String, required: true },
      transliteration: String,
      meanings: [String],
      total_occurrences: Number,
      total_forms: Number,
      forms: [
        {
          arabic: String,
          transliteration: String,
          occurrences: Number,
          morphology: String,
          definitions: [
            {
              meaning: String,
              evidences: [
                {
                  surah: Number,
                  ayah: Number,
                  arabic: String,
                  translation: String,
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    collection: 'rootMeaning',
    strict: false,
  }
);

rootMeaningSchema.index({ 'root.letters': 1 }, { unique: true });

export const RootMeaning = mongoose.model('RootMeaning', rootMeaningSchema);
