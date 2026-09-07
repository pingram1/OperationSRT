import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, BookOpen } from 'lucide-react';
import { getAllVisualizers } from '../api/visualizers';
import { listRegistryVisualizers } from '../components/conceptVisualizers/registry';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import SharedCard from '../components/common/Card';
import ActivityFilterBar from '../components/activities/ActivityFilterBar';
import ActivityRewardBadge from '../components/activities/ActivityRewardBadge';
import { CONCEPT_VISUALIZERS_COPY } from '../constants/conceptVisualizersCopy';
import { EMPTY_ACTIVITY_FILTERS, matchesActivityFilters } from '../constants/activityFilters';

const Card = ({ children, className = '', ...rest }) => (
    <SharedCard hover="lift" className={className} {...rest}>{children}</SharedCard>
);

const DIFFICULTY_COLORS = {
    Easy: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Hard: 'bg-red-100 text-red-700',
    'Post-Grad': 'bg-purple-100 text-purple-700',
};

export default function ConceptVisualizersPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const toast = useToast();
    const [visualizers, setVisualizers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ ...EMPTY_ACTIVITY_FILTERS });

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const load = async () => {
            try {
                setIsLoading(true);
                const data = await getAllVisualizers(filters);
                if (Array.isArray(data) && data.length > 0) {
                    setVisualizers(data);
                } else if (!filters.grade && !filters.subject && !filters.difficulty) {
                    setVisualizers(listRegistryVisualizers());
                } else {
                    setVisualizers([]);
                }
            } catch (err) {
                console.error('Failed to load visualizers:', err);
                setVisualizers(listRegistryVisualizers());
                toast.error('Using offline visualizer catalog.');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [isAuthenticated, navigate, toast, filters]);

    const filteredVisualizers = useMemo(
        () => visualizers.filter((viz) => matchesActivityFilters(viz, filters)),
        [visualizers, filters],
    );

    const hasActiveFilters = Boolean(filters.grade || filters.subject || filters.difficulty);

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-700">
                        <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{CONCEPT_VISUALIZERS_COPY.title}</h1>
                        <p className="text-gray-600">{CONCEPT_VISUALIZERS_COPY.subtitle}</p>
                    </div>
                </div>
                <p
                    className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3"
                    role="note"
                    aria-label="XP payout rules"
                >
                    {CONCEPT_VISUALIZERS_COPY.xpRulesCallout}
                </p>
            </header>

            <ActivityFilterBar filters={filters} onChange={setFilters} />

            {isLoading ? (
                <div className="text-center py-16 text-gray-500">Loading visualizers…</div>
            ) : filteredVisualizers.length === 0 ? (
                <div className="text-center py-16 px-4">
                    <p className="font-semibold text-gray-700">
                        No Concept Visualizers match your current filters.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">Try clearing them or choosing different options.</p>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => setFilters({ ...EMPTY_ACTIVITY_FILTERS })}
                            className="mt-6 inline-flex items-center px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredVisualizers.map((viz) => {
                        const baseXp = viz.baseXp ?? 250;
                        const grades = Array.isArray(viz.gradeLevels) ? viz.gradeLevels : [];

                        return (
                            <Card key={viz.gameId || viz._id} className="p-6 flex flex-col h-full">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                                {viz.subject || 'English'}
                                            </span>
                                            {viz.difficulty && (
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${DIFFICULTY_COLORS[viz.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                                                    {viz.difficulty}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 mt-2">{viz.title}</h2>
                                        {grades.length > 0 && (
                                            <p className="text-xs text-gray-400 mt-1">Grades {grades.join(', ')}</p>
                                        )}
                                    </div>
                                    <span className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full shrink-0">
                                        {baseXp} XP
                                    </span>
                                </div>
                                <p className="text-gray-600 text-sm flex-grow mb-3">{viz.description}</p>
                                <ActivityRewardBadge reward={viz.reward} baseXp={baseXp} className="mb-4" />
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <BookOpen className="w-4 h-4" /> Replayable
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/visualizers/${viz.gameId}`)}
                                        className="inline-flex items-center gap-1 text-indigo-700 font-semibold hover:text-indigo-900"
                                    >
                                        Play <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
