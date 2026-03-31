const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const STATUS = ['pending', 'approved', 'paid', 'rejected', 'cancelled'];

const ScholarshipPayoutRequestSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        amountCents: { type: Number, required: true, min: 1 },
        status: { type: String, enum: STATUS, default: 'pending' },
        /** Student attestation that parent/guardian consents (minors) */
        parentConsentAttested: { type: Boolean, default: false },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        adminNotes: { type: String, default: '' },
        /** Links to ledger debit idempotency key used for hold */
        ledgerDebitKey: { type: String, default: null },
    },
    { timestamps: true }
);

ScholarshipPayoutRequestSchema.index({ user: 1, createdAt: -1 });
ScholarshipPayoutRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ScholarshipPayoutRequest', ScholarshipPayoutRequestSchema);
