import React from 'react';
import { X } from 'lucide-react';
import SharedCard from '../common/Card';
import {
    SUBJECT_OPTIONS,
    DIFFICULTY_OPTIONS,
    GRADE_OPTIONS,
    EMPTY_ACTIVITY_FILTERS,
} from '../../constants/activityFilters';

/**
 * Responsive Grade / Subject / Difficulty filter bar shared by Challenges
 * and Concept Visualizers.
 */
export default function ActivityFilterBar({ filters, onChange, className = '' }) {
    const hasActiveFilters = Boolean(filters.grade || filters.subject || filters.difficulty);

    return (
        <SharedCard className={`mb-6 ${className}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label htmlFor="activity-filter-grade" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Grade
                    </label>
                    <select
                        id="activity-filter-grade"
                        value={filters.grade}
                        onChange={(e) => onChange({ ...filters, grade: e.target.value })}
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                    >
                        <option value="">All Grades</option>
                        {GRADE_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                                {g.length <= 2 && g !== 'K' ? `Grade ${g}` : g}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="activity-filter-subject" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Subject
                    </label>
                    <select
                        id="activity-filter-subject"
                        value={filters.subject}
                        onChange={(e) => onChange({ ...filters, subject: e.target.value })}
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                    >
                        <option value="">All Subjects</option>
                        {SUBJECT_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="activity-filter-difficulty" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Difficulty
                    </label>
                    <select
                        id="activity-filter-difficulty"
                        value={filters.difficulty}
                        onChange={(e) => onChange({ ...filters, difficulty: e.target.value })}
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                    >
                        <option value="">All Difficulties</option>
                        {DIFFICULTY_OPTIONS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <button
                        type="button"
                        onClick={() => onChange({ ...EMPTY_ACTIVITY_FILTERS })}
                        disabled={!hasActiveFilters}
                        className={`w-full flex items-center justify-center gap-1.5 p-2 rounded-lg text-sm font-semibold border transition-colors ${
                            hasActiveFilters
                                ? 'text-gray-700 border-gray-300 hover:bg-gray-50'
                                : 'text-gray-300 border-gray-200 cursor-not-allowed'
                        }`}
                    >
                        <X className="w-4 h-4" />
                        Clear Filters
                    </button>
                </div>
            </div>
        </SharedCard>
    );
}
