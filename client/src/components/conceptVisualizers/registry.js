import BossyEsTrackField from './games/BossyEsTrackField.jsx';
import SamySVowelTeamAdventure from './games/SamySVowelTeamAdventure.jsx';

export const VISUALIZER_REGISTRY = {
    bossy_es_track_field: {
        gameId: 'bossy_es_track_field',
        title: "Bossy E's Track & Field",
        description: 'The "Silent E" phonics race — practice bossy-e spelling rules through a track relay.',
        subject: 'English',
        difficulty: 'Easy',
        gradeLevels: ['1', '2', '3'],
        baseXp: 250,
        component: BossyEsTrackField,
    },
    samy_s_vowel_team: {
        gameId: 'samy_s_vowel_team',
        title: "Samy's Vowel Team Adventure",
        description: 'Master ai vs ay vowel teams through three replayable phonics modes.',
        subject: 'English',
        difficulty: 'Easy',
        gradeLevels: ['1', '2', '3'],
        baseXp: 250,
        component: SamySVowelTeamAdventure,
    },
};

export function getVisualizerEntry(gameId) {
    return VISUALIZER_REGISTRY[gameId] ?? null;
}

export function listRegistryVisualizers() {
    return Object.values(VISUALIZER_REGISTRY);
}
