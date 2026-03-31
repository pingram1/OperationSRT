import React from 'react';
import { Brain, Check, Users, Target } from 'lucide-react';
import { getCompatibilityAnalysis } from '../../api/matching';

// Reusable Card component (matching your existing pattern)
const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="border-b pb-4 mb-6">
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-3 text-blue-500" />
            <div>
                <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
        </div>
    </div>
);

const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'bg-blue-100 text-blue-800',
        secondary: 'bg-gray-100 text-gray-800',
        outline: 'border border-gray-300 text-gray-700',
        success: 'bg-green-100 text-green-800'
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};

/**
 * LearningStyleVisualizer Component
 * Displays learning style profiles and match analysis
 * 
 * @param {Object} props
 * @param {Object} props.student - Student user object with learningStyleProfile
 * @param {Object} props.tutor - Tutor user object with learningStyleProfile (optional)
 * @param {Object} props.matchAnalysis - Pre-fetched match analysis (optional)
 * @param {boolean} props.showComparison - Whether to show side-by-side comparison
 * @param {Function} props.onTutorSelect - Callback when tutor is selected (optional)
 */
export default function LearningStyleVisualizer({ 
    student, 
    tutor = null, 
    matchAnalysis = null,
    showComparison = false,
    onTutorSelect = null 
}) {
    if (!student || !student.learningStyleProfile) {
        return (
            <Card>
                <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No learning style profile available for this student.</p>
                </div>
            </Card>
        );
    }

    const studentProfile = student.learningStyleProfile;
    const dimensions = studentProfile.dimensions || {};

    /**
     * Render a style meter for a dimension
     */
    const renderStyleMeter = (value, label, comparisonValue = null) => {
        const rawValue = value || 5;
        const displayValue = Math.round(rawValue);
        const displayComparison = comparisonValue !== null ? Math.round(comparisonValue) : null;
        const displayLabel = label.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        return (
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-700">{displayLabel}</span>
                    <span className="font-semibold text-gray-800">
                        {displayValue}/10
                        {displayComparison !== null && (
                            <span className="ml-2 text-blue-600">
                                (Tutor: {displayComparison}/10)
                            </span>
                        )}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 relative">
                    <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, rawValue * 10)}%` }}
                    />
                    {comparisonValue !== null && (
                        <div 
                            className="absolute top-0 bg-green-500 h-3 rounded-full opacity-50 transition-all duration-500"
                            style={{ 
                                width: `${Math.min(100, comparisonValue * 10)}%`,
                                left: 0
                            }}
                        />
                    )}
                </div>
            </div>
        );
    };

    /**
     * Render match score as circular progress
     */
    const renderMatchScore = (score) => {
        const percentage = Math.round(score * 100);
        const circumference = 2 * Math.PI * 60; // radius = 60
        const offset = circumference - (score * circumference);
        
        return (
            <div className="relative w-32 h-32 flex-shrink-0">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{percentage}%</div>
                        <div className="text-xs text-gray-500">Match</div>
                    </div>
                </div>
                <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                        cx="64"
                        cy="64"
                        r="60"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                    />
                    <circle
                        cx="64"
                        cy="64"
                        r="60"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                    />
                </svg>
            </div>
        );
    };

    /**
     * Render match explanation breakdown
     */
    const renderMatchExplanation = (analysis) => {
        if (!analysis || !analysis.breakdown) return null;

        const { breakdown, explanation } = analysis;
        const matchingStrengths = analysis.tutor?.teachingStrengths?.filter(
            strength => studentProfile.learningNeeds?.includes(strength)
        ) || [];

        return (
            <div className="space-y-4 mt-4">
                <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Compatibility Breakdown</h5>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Style Match</p>
                            <p className="text-lg font-bold text-blue-600">
                                {Math.round(breakdown.styleCompatibility * 100)}%
                            </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Subject Match</p>
                            <p className="text-lg font-bold text-blue-600">
                                {Math.round(breakdown.subjectMatch * 100)}%
                            </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Teaching Fit</p>
                            <p className="text-lg font-bold text-blue-600">
                                {Math.round(breakdown.teachingAlignment * 100)}%
                            </p>
                        </div>
                    </div>
                </div>

                {matchingStrengths.length > 0 && (
                    <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Matching Strengths</h5>
                        <div className="flex flex-wrap gap-2">
                            {matchingStrengths.map((strength, index) => (
                                <div key={index} className="flex items-center space-x-1">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <Badge variant="success">{strength}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="text-sm font-semibold text-blue-900 mb-2">Match Explanation</h5>
                        <p className="text-sm text-blue-800 whitespace-pre-line">{explanation}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader 
                    icon={Brain} 
                    title="Learning Style Profile" 
                    subtitle={student.name || 'Student Profile'}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Student Profile */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xl font-bold text-blue-600">
                                    {student.name?.charAt(0)?.toUpperCase() || 'S'}
                                </span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-gray-800">{student.name || 'Student'}</h3>
                                {student.studentProfile?.subjectOfFocus && student.studentProfile.subjectOfFocus.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {student.studentProfile.subjectOfFocus.slice(0, 3).map((subject, index) => (
                                            <Badge key={index} variant="secondary">{subject}</Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-800">Learning Style Dimensions</h4>
                            {Object.entries(dimensions).map(([key, value]) => (
                                <div key={key}>
                                    {renderStyleMeter(
                                    value, 
                                    key,
                                    tutor?.learningStyleProfile?.dimensions?.[key] || null
                            )}
                                </div>
                            ))}
                        </div>

                        {studentProfile.learningNeeds && studentProfile.learningNeeds.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Learning Needs</h4>
                                <div className="flex flex-wrap gap-2">
                                    {studentProfile.learningNeeds.map((need, index) => (
                                        <Badge key={index} variant="default">{need}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tutor Match or Comparison */}
                    {tutor && (
                        <div className="space-y-6">
                            {matchAnalysis ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                                <span className="text-xl font-bold text-green-600">
                                                    {tutor.name?.charAt(0)?.toUpperCase() || 'T'}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg text-gray-800">{tutor.name || 'Tutor'}</h3>
                                                {tutor.tutorInfo?.subjects && tutor.tutorInfo.subjects.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {tutor.tutorInfo.subjects.slice(0, 3).map((subject, index) => (
                                                            <Badge key={index} variant="outline">{subject}</Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {renderMatchScore(matchAnalysis.compatibilityScore)}
                                    </div>
                                    {renderMatchExplanation(matchAnalysis)}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p>Loading match analysis...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}






