import React from 'react';
import { Zap, Clock, RotateCcw } from 'lucide-react';

/**
 * Format the remaining time until a partial reward unlocks, e.g. "5d 3h".
 */
function formatTimeUntil(target) {
    if (!target) return null;
    const ms = new Date(target).getTime() - Date.now();
    if (ms <= 0) return null;

    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

/**
 * Renders the dynamic reward badge for an activity card based on the
 * student's history with that activity.
 *
 * Expected `reward` shape (from the backend reward engine preview):
 *   { state, payoutType, xpAvailable, baseXp, nextPartialAvailableAt }
 *
 *   - first_completion -> "250 XP Available"
 *   - weekly_partial   -> "Cooldown Bonus: 25 XP"
 *   - practice_only    -> "Practice Mode (0 XP)" + countdown
 */
export default function ActivityRewardBadge({ reward, baseXp, className = '' }) {
    const effectiveBase = reward?.baseXp ?? baseXp ?? 0;

    // No history yet (or no reward payload) -> full first-time reward.
    const payoutType = reward?.payoutType || 'first_completion';

    if (payoutType === 'first_completion') {
        return (
            <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 ${className}`}
                title="Earn the full reward the first time you complete this activity"
            >
                <Zap className="w-3.5 h-3.5" />
                {reward?.xpAvailable ?? effectiveBase} XP Available
            </span>
        );
    }

    if (payoutType === 'weekly_partial') {
        return (
            <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 ${className}`}
                title="Weekly replay bonus: 10% of the base reward is available"
            >
                <RotateCcw className="w-3.5 h-3.5" />
                Cooldown Bonus: {reward?.xpAvailable ?? 0} XP
            </span>
        );
    }

    // practice_only
    const remaining = formatTimeUntil(reward?.nextPartialAvailableAt);
    return (
        <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 ${className}`}
            title={
                remaining
                    ? `Replay bonus unlocks in ${remaining}`
                    : 'Replay for practice — no XP right now'
            }
        >
            <Clock className="w-3.5 h-3.5" />
            Practice Mode (0 XP){remaining ? ` · ${remaining}` : ''}
        </span>
    );
}
