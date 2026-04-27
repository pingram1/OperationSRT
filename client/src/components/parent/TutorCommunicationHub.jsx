import React, { useState, useEffect, useMemo } from 'react';
import { MessageCircle, Mail, User, Calendar, Clock } from 'lucide-react';

/**
 * Tutor Communication Hub Component
 * Displays tutor information and recent communication for a child
 * @param {object} child - The child object
 * @param {Array} bookings - Array of bookings for the child
 */
export default function TutorCommunicationHub({ child, bookings = [] }) {
    const [tutors, setTutors] = useState([]);
    const [selectedTutor, setSelectedTutor] = useState(null);

    // Extract unique tutors from bookings
    const uniqueTutors = useMemo(() => {
        if (!bookings || !bookings.length) return [];
        
        const tutorMap = new Map();
        bookings.forEach(booking => {
            if (booking.tutor && booking.tutor._id) {
                const tutorId = booking.tutor._id || booking.tutor.id;
                if (!tutorMap.has(tutorId)) {
                    tutorMap.set(tutorId, {
                        ...booking.tutor,
                        sessions: [],
                        recentNotes: [],
                    });
                }
                
                const tutor = tutorMap.get(tutorId);
                if (booking.status === 'completed' || booking.status === 'scheduled') {
                    tutor.sessions.push(booking);
                }
                
                // Extract session notes
                if (booking.sessionNotes && booking.sessionNotes.generalNotes) {
                    tutor.recentNotes.push({
                        booking,
                        note: booking.sessionNotes.generalNotes,
                        date: booking.sessionNotes.notesAddedAt || booking.sessionDate,
                    });
                }
            }
        });
        
        // Sort sessions by date (most recent first)
        tutorMap.forEach(tutor => {
            tutor.sessions.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
            tutor.recentNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
        });
        
        return Array.from(tutorMap.values());
    }, [bookings]);

    useEffect(() => {
        if (uniqueTutors.length > 0 && !selectedTutor) {
            setSelectedTutor(uniqueTutors[0]);
        }
    }, [uniqueTutors]);

    if (!child) {
        return (
            <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No child selected.</p>
            </div>
        );
    }

    if (uniqueTutors.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No tutors assigned yet.</p>
                <p className="text-sm text-gray-400 mt-2">Tutors will appear here once sessions are scheduled.</p>
            </div>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const tutor = selectedTutor || uniqueTutors[0];
    const completedSessions = tutor.sessions.filter(s => s.status === 'completed');
    const upcomingSessions = tutor.sessions.filter(s => s.status === 'scheduled' && new Date(s.sessionDate) > new Date());

    return (
        <div className="space-y-6">
            {/* Tutor Selector */}
            {uniqueTutors.length > 1 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Tutor:
                    </label>
                    <select
                        value={tutor._id || tutor.id}
                        onChange={(e) => {
                            const selected = uniqueTutors.find(t => (t._id || t.id) === e.target.value);
                            setSelectedTutor(selected);
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {uniqueTutors.map(t => (
                            <option key={t._id || t.id} value={t._id || t.id}>
                                {t.name || 'Tutor'}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Tutor Profile Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                        {tutor.avatar ? (
                            <img 
                                src={tutor.avatar} 
                                alt={tutor.name} 
                                className="w-16 h-16 rounded-full object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                        ) : (
                            <User className="w-8 h-8 text-blue-600" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">
                            {tutor.name || 'Tutor'}
                        </h3>
                        {tutor.email && (
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                                <Mail className="w-4 h-4 mr-2" />
                                {tutor.email}
                            </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {completedSessions.length} completed session{completedSessions.length !== 1 ? 's' : ''}
                            </div>
                            {upcomingSessions.length > 0 && (
                                <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {upcomingSessions.length} upcoming
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tutor Subjects */}
                {tutor.tutorInfo && tutor.tutorInfo.subjects && tutor.tutorInfo.subjects.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Subjects:</h4>
                        <div className="flex flex-wrap gap-2">
                            {tutor.tutorInfo.subjects.map((subject, index) => (
                                <span 
                                    key={index}
                                    className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full"
                                >
                                    {subject}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Session Notes */}
                {tutor.recentNotes.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <MessageCircle className="w-4 h-4 mr-2 text-blue-500" />
                            Recent Session Notes
                        </h4>
                        <div className="space-y-3">
                            {tutor.recentNotes.slice(0, 3).map((noteItem, index) => (
                                <div 
                                    key={index}
                                    className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-800">
                                            {noteItem.booking.subject}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatDate(noteItem.date)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-3">
                                        {noteItem.note}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upcoming Sessions */}
                {upcomingSessions.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-green-500" />
                            Upcoming Sessions
                        </h4>
                        <div className="space-y-2">
                            {upcomingSessions.slice(0, 3).map(session => (
                                <div 
                                    key={session._id || session.id}
                                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                                >
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">
                                            {session.subject}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {formatDate(session.sessionDate)}
                                        </p>
                                    </div>
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                                        {session.duration} min
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contact Information */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h4>
                    <div className="space-y-2">
                        {tutor.email && (
                            <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-4 h-4 mr-2 text-blue-500" />
                                <a 
                                    href={`mailto:${tutor.email}`}
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    {tutor.email}
                                </a>
                            </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                            <MessageCircle className="w-4 h-4 mr-2 text-blue-500" />
                            <span>Contact through session notes and booking system</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* All Tutors Summary */}
            {uniqueTutors.length > 1 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">All Tutors ({uniqueTutors.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {uniqueTutors.map(t => (
                            <div 
                                key={t._id || t.id}
                                onClick={() => setSelectedTutor(t)}
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                    selectedTutor?._id === t._id 
                                        ? 'border-blue-500 bg-blue-50' 
                                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        {t.avatar ? (
                                            <img 
                                                src={t.avatar} 
                                                alt={t.name} 
                                                className="w-10 h-10 rounded-full object-cover"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        ) : (
                                            <User className="w-5 h-5 text-blue-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">
                                            {t.name || 'Tutor'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {t.sessions.filter(s => s.status === 'completed').length} sessions
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

