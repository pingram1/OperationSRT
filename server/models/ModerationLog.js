const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    context: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    flags: {
      type: [String],
      required: true,
      default: [],
      index: true,
    },
    allowed: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    textHash: {
      type: String,
      required: true,
      index: true,
    },
    redactedExcerpt: {
      type: String,
      default: '',
      maxlength: 500,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

moderationLogSchema.index({ createdAt: -1, context: 1 });
moderationLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
