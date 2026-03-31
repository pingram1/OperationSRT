import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, X, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getBookingById } from '../api/bookings';

/**
 * Video Call Page - Join a Whereby video room for a virtual session
 */
export default function VideoCallPage() {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
        const loadBooking = async () => {
            try {
                setLoading(true);
                const bookingData = await getBookingById(bookingId);
                setBooking(bookingData);

                // Check if user is the tutor (host) or student
                const isTutor = bookingData.tutor?._id === user?._id || bookingData.tutor?.id === user?.id;
                const isStudent = bookingData.student?._id === user?._id || bookingData.student?.id === user?.id;
                const isParent = bookingData.user?._id === user?._id || bookingData.user?.id === user?.id;

                // Tutor is the host, student/parent is a participant
                setIsHost(isTutor || user?.role === 'admin' || user?.role === 'super_admin');

                // Verify user has access to this booking
                if (!isTutor && !isStudent && !isParent && user?.role !== 'admin' && user?.role !== 'super_admin') {
                    setError('You do not have access to this session.');
                    return;
                }

                // Check if session is virtual
                if (bookingData.sessionType !== 'virtual') {
                    setError('This session is not a virtual session. Please contact support if you need to convert it to virtual.');
                    return;
                }

                // Check if room exists
                if (!bookingData.wherebyRoom?.roomUrl) {
                    setError('Video room has not been created for this session. Please contact support.');
                    return;
                }
            } catch (err) {
                console.error('Failed to load booking:', err);
                setError(err.message || 'Failed to load session information.');
            } finally {
                setLoading(false);
            }
        };

        if (bookingId && user) {
            loadBooking();
        }
    }, [bookingId, user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading session...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!booking) {
        return null;
    }

    // Determine which URL to use (host or participant)
    const roomUrl = isHost && booking.wherebyRoom?.hostRoomUrl 
        ? booking.wherebyRoom.hostRoomUrl 
        : booking.wherebyRoom?.roomUrl;

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Video className="w-6 h-6 text-blue-600" />
                    <div>
                        <h1 className="text-lg font-semibold text-gray-800">Virtual Session</h1>
                        <p className="text-sm text-gray-600">
                            {booking.subject} - {booking.student?.name}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Close"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Video Room Container */}
            <div className="flex-1 relative">
                {roomUrl ? (
                    <iframe
                        src={roomUrl}
                        allow="camera; microphone; fullscreen; speaker; display-capture"
                        className="absolute inset-0 w-full h-full border-0"
                        title="Whereby Video Room"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-white">
                            <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-lg">Video room URL not available</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Session Info Footer */}
            <div className="bg-gray-800 text-white p-4 text-sm">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div>
                        <p className="font-semibold">
                            {booking.tutor?.name || 'Tutor TBD'} → {booking.student?.name}
                        </p>
                        <p className="text-gray-400">
                            {new Date(booking.sessionDate).toLocaleString()} • {booking.duration} minutes
                        </p>
                    </div>
                    <div className="text-gray-400">
                        {isHost ? 'Host Mode' : 'Participant Mode'}
                    </div>
                </div>
            </div>
        </div>
    );
}


