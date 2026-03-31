import React from 'react';
import { Award, Trophy, Star, Crown, Gem, GraduationCap, Target } from 'lucide-react';

/**
 * Component to display an achievement badge
 * @param {object} achievement - The achievement object
 * @param {boolean} showDetails - Whether to show detailed information
 */
export default function AchievementBadge({ achievement, showDetails = false }) {
    if (!achievement) return null;

    const getIcon = (icon) => {
        // Return emoji if provided, otherwise use default icon
        if (icon && icon.match(/[\u{1F300}-\u{1F9FF}]/u)) {
            return <span className="text-4xl">{icon}</span>;
        }
        
        // Fallback to icon based on category
        switch (achievement.category) {
            case 'milestone':
                return <Trophy className="w-8 h-8 text-yellow-500" />;
            case 'subject':
                return <GraduationCap className="w-8 h-8 text-blue-500" />;
            case 'improvement':
                return <Star className="w-8 h-8 text-purple-500" />;
            case 'attendance':
                return <Target className="w-8 h-8 text-green-500" />;
            default:
                return <Award className="w-8 h-8 text-blue-500" />;
        }
    };

    const getColorClass = (category) => {
        switch (category) {
            case 'milestone':
                return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
            case 'subject':
                return 'bg-gradient-to-br from-blue-400 to-blue-600';
            case 'improvement':
                return 'bg-gradient-to-br from-purple-400 to-purple-600';
            case 'attendance':
                return 'bg-gradient-to-br from-green-400 to-green-600';
            case 'homework':
                return 'bg-gradient-to-br from-orange-400 to-orange-600';
            case 'dedication':
                return 'bg-gradient-to-br from-pink-400 to-pink-600';
            default:
                return 'bg-gradient-to-br from-gray-400 to-gray-600';
        }
    };

    if (showDetails) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                    <div className={`${getColorClass(achievement.category)} rounded-full p-4 flex items-center justify-center text-white shadow-md`}>
                        {getIcon(achievement.icon)}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-lg">{achievement.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                        {achievement.createdAt && (
                            <p className="text-xs text-gray-500 mt-2">
                                Earned {new Date(achievement.createdAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Compact view
    return (
        <div 
            className={`${getColorClass(achievement.category)} rounded-full p-3 flex items-center justify-center text-white shadow-md hover:shadow-lg transition-all cursor-pointer`}
            title={achievement.name}
        >
            {getIcon(achievement.icon)}
        </div>
    );
}

/**
 * Component to display a grid of achievement badges
 * @param {Array} achievements - Array of achievement objects
 * @param {boolean} showDetails - Whether to show detailed information
 */
export function AchievementBadges({ achievements = [], showDetails = false }) {
    if (!achievements || achievements.length === 0) {
        return (
            <div className="text-center py-8">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No achievements yet.</p>
            </div>
        );
    }

    if (showDetails) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                    <AchievementBadge 
                        key={achievement._id || achievement.id} 
                        achievement={achievement} 
                        showDetails={true}
                    />
                ))}
            </div>
        );
    }

    // Compact grid view
    return (
        <div className="flex flex-wrap gap-3">
            {achievements.map((achievement) => (
                <AchievementBadge 
                    key={achievement._id || achievement.id} 
                    achievement={achievement} 
                    showDetails={false}
                />
            ))}
        </div>
    );
}












