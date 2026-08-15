import mongoose from 'mongoose';

const hiddenRuleSchema = new mongoose.Schema(
  {
    ruleKey: { type: String, required: true, unique: true, index: true },
  },
  {
    collection: 'hiddenrules',
    timestamps: true,
  }
);

export const HiddenRule = mongoose.model('HiddenRule', hiddenRuleSchema);
