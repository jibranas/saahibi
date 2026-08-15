import mongoose from 'mongoose';

const hiddenExampleSchema = new mongoose.Schema(
  {
    ruleKey: { type: String, required: true },
    phraseRef: { type: String, required: true },
  },
  {
    collection: 'hiddenexamples',
    timestamps: true,
  }
);

hiddenExampleSchema.index({ ruleKey: 1, phraseRef: 1 }, { unique: true });
hiddenExampleSchema.index({ ruleKey: 1 });

export const HiddenExample = mongoose.model('HiddenExample', hiddenExampleSchema);
