const Visualizer = require('../models/Visualizer');
const logger = require('../utils/logger');

const LAUNCH_VISUALIZERS = [
    {
        gameId: 'bossy_es_track_field',
        title: "Bossy E's Track & Field",
        description: 'The "Silent E" phonics race — practice bossy-e spelling rules through a track relay.',
        subject: 'English',
        difficulty: 'Easy',
        baseXp: 250,
        gradeLevels: ['1', '2', '3'],
        componentKey: 'bossy_es_track_field',
        sortOrder: 1,
    },
    {
        gameId: 'samy_s_vowel_team',
        title: "Samy's Vowel Team Adventure",
        description: 'Master ai vs ay vowel teams through three replayable phonics modes.',
        subject: 'English',
        difficulty: 'Easy',
        baseXp: 250,
        gradeLevels: ['1', '2', '3'],
        componentKey: 'samy_s_vowel_team',
        sortOrder: 2,
    },
];

async function ensureLaunchVisualizers() {
    for (const doc of LAUNCH_VISUALIZERS) {
        await Visualizer.findOneAndUpdate(
            { gameId: doc.gameId },
            { $set: { ...doc, isActive: true } },
            { upsert: true, new: true },
        );
    }
    logger.info('[visualizers] Launch catalog ensured', {
        count: LAUNCH_VISUALIZERS.length,
    });
}

module.exports = {
    LAUNCH_VISUALIZERS,
    ensureLaunchVisualizers,
};
