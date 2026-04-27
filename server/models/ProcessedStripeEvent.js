const mongoose = require('mongoose');

const PROCESSED_STRIPE_EVENT_STATUSES = ['received', 'processed', 'failed'];

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
    // Tracks the lifecycle of the webhook delivery so retries can re-run
    // handlers that crashed before completing. Legacy rows (created before
    // this field existed) are treated as 'processed' by the webhook handler.
    status: {
      type: String,
      enum: PROCESSED_STRIPE_EVENT_STATUSES,
      default: 'received',
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProcessedStripeEvent', processedStripeEventSchema);
module.exports.PROCESSED_STRIPE_EVENT_STATUSES = PROCESSED_STRIPE_EVENT_STATUSES;
