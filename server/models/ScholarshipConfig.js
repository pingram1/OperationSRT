const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Active scholarship rules (XP → cents, session flat rate, tiers, payout ladder).
 * Typically one document with isActive: true.
 */
const ScholarshipConfigSchema = new Schema(
    {
        name: { type: String, default: 'default' },
        isActive: { type: Boolean, default: true },
        /** XP required to earn 1 cent (e.g. 10 → 1000 XP = 100 cents = $1) */
        xpRequiredForOneCent: { type: Number, default: 10, min: 1 },
        /** Flat credit per completed tutoring session (cents) */
        tutoringSessionCreditCents: { type: Number, default: 500, min: 0 },
        /**
         * Tier multipliers by lifetime XP (user.xp at credit time).
         * Sorted descending by minXp when applying.
         */
        tierThresholds: [
            {
                minXp: { type: Number, required: true },
                multiplierBps: { type: Number, required: true }, // 10000 = 1.0x, 12500 = 1.25x
            },
        ],
        /** Allowed payout amounts in USD cents */
        payoutAmountsCents: {
            type: [Number],
            default: [10000, 25000, 50000, 100000, 250000, 500000],
        },
        /** Optional daily cap on scholarship credits (cents); null = disabled */
        maxCreditsPerDayCents: { type: Number, default: null },
    },
    { timestamps: true }
);

ScholarshipConfigSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('ScholarshipConfig', ScholarshipConfigSchema);
