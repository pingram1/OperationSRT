import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, Award, AlertCircle, FileText, CheckCircle, User, Calendar as CalendarIcon } from 'lucide-react';
import { getSessionNotes } from '../../api/bookings.js';

/**
 * Component to display session summary/notes for a booking
 * @param {object} booking - The booking object
 * @param {boolean} showFullDetails - Whether to show full details or just a summary
 */
export default function SessionSummary({ booking, showFullDetails = false }) {
    const [notes, setNotes] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchNotes = async () => {
            if (!booking || !booking._id) return;
            
            setIsLoading(true);
            setError(null);
            try {
                const data = await getSessionNotes(booking._id || booking.id);
                setNotes(data.sessionNotes);
            } catch (err) {
                console.error('Failed to fetch session notes:', err);
                setError('Failed to load session notes');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotes();
    }, [booking]);

    if (!booking) return null;

    const hasNotes = notes && (
        notes.topicsCovered || 
        notes.conceptsMastered || 
        notes.areasForImprovement || 
        notes.homeworkAssigned || 
        notes.nextSteps || 
        notes.generalNotes
    );

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
            </div>
        );
    }

    if (!hasNotes) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center text-gray-500">
                    <FileText className="w-4 h-4 mr-2" />
                    <p className="text-sm">No session notes available yet.</p>
                </div>
            </div>
        );
    }

    if (showFullDetails) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-blue-500" />
                        Session Summary
                    </h3>
                    {notes.notesAddedAt && (
                        <span className="text-xs text-gray-500">
                            Added {formatDate(notes.notesAddedAt)}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {notes.topicsCovered && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <BookOpen className="w-4 h-4 mr-2 text-blue-500" />
                                Topics Covered
                            </h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes.topicsCovered}</p>
                        </div>
                    )}

                    {notes.conceptsMastered && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <Award className="w-4 h-4 mr-2 text-green-500" />
                                Concepts Mastered
                            </h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes.conceptsMastered}</p>
                        </div>
                    )}

                    {notes.areasForImprovement && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                                Areas for Improvement
                            </h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes.areasForImprovement}</p>
                        </div>
                    )}

                    {notes.homeworkAssigned && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-purple-500" />
                                Homework Assigned
                            </h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes.homeworkAssigned}</p>
                        </div>
                    )}

                    {notes.nextSteps && (
                        <div className="md:col-span-2">
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                                Next Steps
                            </h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes.nextSteps}</p>
                        </div>
                    )}

                    {notes.generalNotes && (
                        <div className="md:col-span-2">
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-gray-500" />
                                Additional Notes
                            </h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes.generalNotes}</p>
                        </div>
                    )}
                </div>

                {notes.notesAddedBy && (
                    <div className="pt-4 border-t text-xs text-gray-500">
                        Notes added by {typeof notes.notesAddedBy === 'object' ? notes.notesAddedBy.name : 'Tutor'}
                    </div>
                )}
            </div>
        );
    }

    // Compact view
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-800 text-sm flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-blue-500" />
                    Session Notes Available
                </h4>
                {notes.notesAddedAt && (
                    <span className="text-xs text-gray-500">
                        {formatDate(notes.notesAddedAt)}
                    </span>
                )}
            </div>
            <div className="space-y-1 text-sm text-gray-600">
                {notes.topicsCovered && (
                    <p className="truncate">
                        <span className="font-medium">Topics:</span> {notes.topicsCovered.substring(0, 60)}
                        {notes.topicsCovered.length > 60 && '...'}
                    </p>
                )}
                {notes.conceptsMastered && !notes.topicsCovered && (
                    <p className="truncate">
                        <span className="font-medium">Mastered:</span> {notes.conceptsMastered.substring(0, 60)}
                        {notes.conceptsMastered.length > 60 && '...'}
                    </p>
                )}
            </div>
        </div>
    );
}












