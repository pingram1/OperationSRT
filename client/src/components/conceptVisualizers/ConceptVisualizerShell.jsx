import React from 'react';
import PropTypes from 'prop-types';
import { getVisualizerEntry } from './registry';

export default function ConceptVisualizerShell({ gameId, onCompleteVisualizer, onExit }) {
    const entry = getVisualizerEntry(gameId);

    if (!entry) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-800">
                <p className="font-bold">Visualizer not found: {gameId}</p>
                {onExit && (
                    <button type="button" onClick={onExit} className="mt-4 text-sm underline">
                        Back to gallery
                    </button>
                )}
            </div>
        );
    }

    const GameComponent = entry.component;

    return (
        <GameComponent
            onCompleteVisualizer={onCompleteVisualizer}
            onExit={onExit}
        />
    );
}

ConceptVisualizerShell.propTypes = {
    gameId: PropTypes.string.isRequired,
    onCompleteVisualizer: PropTypes.func,
    onExit: PropTypes.func,
};
