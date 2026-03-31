const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ScholarshipWalletSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        balanceCents: { type: Number, default: 0, min: 0 },
        lifetimeEarnedCents: { type: Number, default: 0, min: 0 },
        lifetimePaidOutCents: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ScholarshipWallet', ScholarshipWalletSchema);
