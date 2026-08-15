import mongoose from 'mongoose';

const hiddenChapterSchema = new mongoose.Schema(
  {
    chapterKey: { type: String, required: true, unique: true, index: true },
  },
  {
    collection: 'hiddenchapters',
    timestamps: true,
  }
);

export const HiddenChapter = mongoose.model('HiddenChapter', hiddenChapterSchema);
