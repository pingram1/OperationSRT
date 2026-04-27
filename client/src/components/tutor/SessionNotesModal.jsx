import React, { useState, useEffect } from 'react';
import { FileText, Save, Loader } from 'lucide-react';
import { updateSessionNotes, getSessionNotes } from '../../api/bookings.js';
import Dialog from '../common/Dialog.jsx';

/**
 * Modal component for tutors to add/edit session notes
 * @param {object} booking - The booking object
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to close the modal
 * @param {function} onSave - Function called after saving notes
 */
export default function SessionNotesModal({ booking, isOpen, onClose, onSave }) {
    const [notes, setNotes] = useState({
        topicsCovered: '',
        conceptsMastered: '',
        areasForImprovement: '',
        homeworkAssigned: '',
        nextSteps: '',
        generalNotes: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (isOpen && booking) {
            loadExistingNotes();
        } else {
            // Reset form when modal closes
            setNotes({
                topicsCovered: '',
                conceptsMastered: '',
                areasForImprovement: '',
                homeworkAssigned: '',
                nextSteps: '',
                generalNotes: '',
            });
            setError(null);
            setSuccess(null);
        }
    }, [isOpen, booking]);

    const loadExistingNotes = async () => {
        if (!booking || !booking._id) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const data = await getSessionNotes(booking._id || booking.id);
            if (data.sessionNotes) {
                setNotes({
                    topicsCovered: data.sessionNotes.topicsCovered || '',
                    conceptsMastered: data.sessionNotes.conceptsMastered || '',
                    areasForImprovement: data.sessionNotes.areasForImprovement || '',
                    homeworkAssigned: data.sessionNotes.homeworkAssigned || '',
                    nextSteps: data.sessionNotes.nextSteps || '',
                    generalNotes: data.sessionNotes.generalNotes || '',
                });
            }
        } catch (err) {
            console.error('Failed to load session notes:', err);
            // Don't show error if notes don't exist yet
            if (err.status !== 404) {
                setError('Failed to load existing notes');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setNotes(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!booking || !booking._id) return;

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await updateSessionNotes(booking._id || booking.id, notes);
            setSuccess('Session notes saved successfully!');
            setTimeout(() => {
                if (onSave) onSave();
                onClose();
            }, 1000);
        } catch (err) {
            console.error('Failed to save session notes:', err);
            setError(err.message || 'Failed to save session notes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            title={
                <span className="flex items-center text-xl font-semibold text-gray-800">
                    <FileText className="w-5 h-5 mr-2 text-blue-500" aria-hidden="true" />
                    Session Notes
                </span>
            }
        >
            <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    {booking && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">Subject:</span> {booking.subject}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                <span className="font-semibold">Student:</span> {booking.student?.name || 'N/A'}
                            </p>
                            {booking.sessionDate && (
                                <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-semibold">Date:</span> {new Date(booking.sessionDate).toLocaleDateString('en-US', { 
                                        weekday: 'long',
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                    })}
                                </p>
                            )}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center py-8">
                            <Loader className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                            <p className="text-gray-500">Loading existing notes...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="topicsCovered" className="block text-sm font-medium text-gray-700 mb-2">
                                    Topics Covered *
                                </label>
                                <textarea
                                    id="topicsCovered"
                                    value={notes.topicsCovered}
                                    onChange={(e) => handleChange('topicsCovered', e.target.value)}
                                    placeholder="What topics did you cover in this session?"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="conceptsMastered" className="block text-sm font-medium text-gray-700 mb-2">
                                    Concepts Mastered
                                </label>
                                <textarea
                                    id="conceptsMastered"
                                    value={notes.conceptsMastered}
                                    onChange={(e) => handleChange('conceptsMastered', e.target.value)}
                                    placeholder="What concepts did the student master?"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                                />
                            </div>

                            <div>
                                <label htmlFor="areasForImprovement" className="block text-sm font-medium text-gray-700 mb-2">
                                    Areas for Improvement
                                </label>
                                <textarea
                                    id="areasForImprovement"
                                    value={notes.areasForImprovement}
                                    onChange={(e) => handleChange('areasForImprovement', e.target.value)}
                                    placeholder="What areas need more work?"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                                />
                            </div>

                            <div>
                                <label htmlFor="homeworkAssigned" className="block text-sm font-medium text-gray-700 mb-2">
                                    Homework Assigned
                                </label>
                                <textarea
                                    id="homeworkAssigned"
                                    value={notes.homeworkAssigned}
                                    onChange={(e) => handleChange('homeworkAssigned', e.target.value)}
                                    placeholder="What homework was assigned?"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                                />
                            </div>

                            <div>
                                <label htmlFor="nextSteps" className="block text-sm font-medium text-gray-700 mb-2">
                                    Next Steps & Recommendations
                                </label>
                                <textarea
                                    id="nextSteps"
                                    value={notes.nextSteps}
                                    onChange={(e) => handleChange('nextSteps', e.target.value)}
                                    placeholder="What should be covered in the next session?"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                                />
                            </div>

                            <div>
                                <label htmlFor="generalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                                    Additional Notes
                                </label>
                                <textarea
                                    id="generalNotes"
                                    value={notes.generalNotes}
                                    onChange={(e) => handleChange('generalNotes', e.target.value)}
                                    placeholder="Any additional notes or observations..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
                            disabled={isSaving || isLoading || !notes.topicsCovered.trim()}
                        >
                            {isSaving ? (
                                <>
                                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Notes
                                </>
                            )}
                        </button>
                    </div>
                </form>
        </Dialog>
    );
}












