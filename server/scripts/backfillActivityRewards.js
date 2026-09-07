/**
 * One-time backfill for the time-throttled reward engine.
 *
 * - Challenges: set baseXp from difficulty (and sync legacy xpReward) where missing.
 * - Visualizers: set difficulty/baseXp where missing.
 *
 * Run from server/: node scripts/backfillActivityRewards.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const Challenge = require('../models/Challenge');
const Visualizer = require('../models/Visualizer');
const { baseXpForDifficulty } = require('../constants/activityRewards');

async function backfill() {
    await connectDB();

    const challenges = await Challenge.find({});
    let challengeUpdates = 0;
    for (const c of challenges) {
        const desired = baseXpForDifficulty(c.difficulty, c.xpReward || 0);
        if (c.baseXp !== desired || c.xpReward !== desired) {
            c.baseXp = desired;
            c.xpReward = desired;
            await c.save();
            challengeUpdates += 1;
        }
    }

    const visualizers = await Visualizer.find({});
    let visualizerUpdates = 0;
    for (const v of visualizers) {
        let changed = false;
        if (!v.difficulty) {
            v.difficulty = 'Easy';
            changed = true;
        }
        const desired = baseXpForDifficulty(v.difficulty, v.baseXp || 250);
        if (v.baseXp !== desired) {
            v.baseXp = desired;
            changed = true;
        }
        if (changed) {
            await v.save();
            visualizerUpdates += 1;
        }
    }

    console.log(`Backfill complete. Challenges updated: ${challengeUpdates}, Visualizers updated: ${visualizerUpdates}`);
    process.exit(0);
}

backfill().catch((err) => {
    console.error(err);
    process.exit(1);
});
