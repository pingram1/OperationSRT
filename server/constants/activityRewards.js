/**
 * Shared constants for the time-throttled activity reward engine.
 *
 * Single source of truth for difficulty -> base XP, the weekly partial
 * replay rate, and the cooldown window. Imported by models, the reward
 * service, and seed/backfill scripts so the economy stays consistent.
 */

// Difficulty -> default base XP. Extend by adding a key here.
const DIFFICULTY_BASE_XP = Object.freeze({
    Easy: 250,
    Medium: 500,
    Hard: 1000,
    'Post-Grad': 2500,
});

const DIFFICULTY_LEVELS = Object.freeze(Object.keys(DIFFICULTY_BASE_XP));

// Activity subjects (kept aligned with existing Challenge enum — capitalized).
const ACTIVITY_SUBJECTS = Object.freeze(['Math', 'Science', 'History', 'English', 'Computer Science']);

// Activity types tracked by the unified ledger.
const ACTIVITY_TYPES = Object.freeze(['challenge', 'visualizer']);

// Replay payout: 10% of base XP, claimable at most once per cooldown window.
const PARTIAL_XP_RATE = 0.1;

// 7 days / 168 hours.
const REPLAY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Resolve the base XP for a difficulty, falling back to an explicit value.
 * @param {string} difficulty
 * @param {number} [fallback]
 * @returns {number}
 */
function baseXpForDifficulty(difficulty, fallback = 0) {
    const mapped = DIFFICULTY_BASE_XP[difficulty];
    return Number.isFinite(mapped) ? mapped : fallback;
}

/**
 * The XP a partial (replay) claim pays out for a given base.
 * @param {number} baseXp
 * @returns {number}
 */
function partialXpFor(baseXp) {
    return Math.floor((Number(baseXp) || 0) * PARTIAL_XP_RATE);
}

module.exports = {
    DIFFICULTY_BASE_XP,
    DIFFICULTY_LEVELS,
    ACTIVITY_SUBJECTS,
    ACTIVITY_TYPES,
    PARTIAL_XP_RATE,
    REPLAY_COOLDOWN_MS,
    baseXpForDifficulty,
    partialXpFor,
};
