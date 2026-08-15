import mongoose from 'mongoose';

const wordAudioSchema = new mongoose.Schema(
  {
    surahId: { type: Number, required: true },
    ayahNo: { type: Number, required: true },
    wordNo: { type: Number, required: true },
    wordId: String,
    wordAr: String,
    wordEn: String,
    wordTr: String,
    audioPath: { type: String, required: true },
  },
  {
    collection: 'wordAudio',
    strict: false,
  }
);

wordAudioSchema.index(
  { surahId: 1, ayahNo: 1, wordNo: 1 },
  { unique: true }
);

export const WordAudio = mongoose.model('WordAudio', wordAudioSchema);
