const mongoose = require('mongoose');

const processedStripeEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProcessedStripeEvent', processedStripeEventSchema);
