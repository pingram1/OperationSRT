const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SOURCE = ['challenge_xp', 'visualizer_xp', 'tutoring_session', 'adjustment', 'payout_request', 'payout_reversal'];

const ScholarshipLedgerEntrySchema = new Schema(
    {
        wallet: { type: Schema.Types.ObjectId, ref: 'ScholarshipWallet', required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: ['credit', 'debit'], required: true },
        amountCents: { type: Number, required: true, min: 0 },
        balanceAfterCents: { type: Number, required: true, min: 0 },
        source: { type: String, enum: SOURCE, required: true },
        idempotencyKey: { type: String, required: true, unique: true },
        title: { type: String, default: '' },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

ScholarshipLedgerEntrySchema.index({ user: 1, createdAt: -1 });
ScholarshipLedgerEntrySchema.index({ wallet: 1, createdAt: -1 });

module.exports = mongoose.model('ScholarshipLedgerEntry', ScholarshipLedgerEntrySchema);
