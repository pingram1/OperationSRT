import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ConceptVisualizerShell from '../components/conceptVisualizers/ConceptVisualizerShell';
import { getVisualizerEntry } from '../components/conceptVisualizers/registry';
import { completeVisualizerSession, getVisualizerByGameId, startVisualizerSession } from '../api/visualizers';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';

export default function ConceptVisualizerPlayPage() {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, refreshUser } = useAuth();
    const toast = useToast();

    const [visualizer, setVisualizer] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [completionResult, setCompletionResult] = useState(null);
    const completingRef = useRef(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const entry = getVisualizerEntry(gameId);
        if (!entry) {
            toast.error('Visualizer not found.');
            navigate('/visualizers');
            return;
        }

        const init = async () => {
            try {
                setIsLoading(true);
                let meta = entry;
                try {
                    meta = await getVisualizerByGameId(gameId);
                } catch {
                    // fallback to registry metadata
                }
                setVisualizer(meta);

                const start = await startVisualizerSession(gameId);
                setSessionId(start.sessionId);
            } catch (err) {
                console.error('Failed to start visualizer session:', err);
                const message = err?.status === 404
                    ? 'This visualizer is not in the catalog yet. Restart the API server, then try again.'
                    : 'Could not start visualizer session.';
                toast.error(message);
                navigate('/visualizers');
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, [gameId, isAuthenticated, navigate, toast]);

    const handleComplete = useCallback(async (payload) => {
        if (completingRef.current) return;
        completingRef.current = true;

        try {
            const result = await completeVisualizerSession(gameId, {
                sessionId,
                score: payload.score,
                accuracy: payload.accuracy,
                metadata: payload.metadata,
            });

            setCompletionResult(result);
            await refreshUser();

            if (result.xpAwarded > 0) {
                const prefix = result.isFirstCompletion ? 'First completion!' : 'Weekly replay bonus!';
                toast.success(`${prefix} +${result.xpAwarded} XP earned.`);
            } else {
                toast.info('Practice run saved — no XP during the weekly cooldown. Replay later for a 10% bonus.');
            }

            try {
                const nextSession = await startVisualizerSession(gameId);
                setSessionId(nextSession.sessionId);
            } catch (restartErr) {
                console.error('Failed to start next visualizer session:', restartErr);
            }
        } catch (err) {
            console.error('Failed to complete visualizer session:', err);
            toast.error('Could not save your progress. Your score was still recorded locally.');
        } finally {
            completingRef.current = false;
        }
    }, [gameId, refreshUser, sessionId, toast]);

    const handleExit = () => navigate('/visualizers', { state: { refresh: true } });

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto p-6">
                <div className="animate-pulse h-96 bg-gray-100 rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={handleExit}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Concept Visualizers
                </button>
                {visualizer?.title && (
                    <h1 className="text-lg font-bold text-gray-800 truncate">{visualizer.title}</h1>
                )}
                {completionResult?.xpAwarded > 0 && (
                    <span className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        +{completionResult.xpAwarded} XP
                    </span>
                )}
            </div>

            <ConceptVisualizerShell
                gameId={gameId}
                onCompleteVisualizer={handleComplete}
                onExit={handleExit}
            />
        </div>
    );
}
