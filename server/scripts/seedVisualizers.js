/**
 * Seed the two launch Concept Visualizers into MongoDB.
 * Run from repo root: node server/scripts/seedVisualizers.js
 * Or from server/: node scripts/seedVisualizers.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const { ensureLaunchVisualizers, LAUNCH_VISUALIZERS } = require('../services/visualizerCatalogService');

async function seed() {
    await connectDB();
    await ensureLaunchVisualizers();
    LAUNCH_VISUALIZERS.forEach((doc) => console.log(`Upserted visualizer: ${doc.gameId}`));
    console.log('Done.');
    process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
