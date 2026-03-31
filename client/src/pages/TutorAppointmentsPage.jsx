import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Calendar, Clock, CheckCircle, XCircle, User, AlertCircle, 
    ChevronRight, Filter, Search, Check, X, FileText, Edit
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTutorBookings, acceptBooking, declineBooking, completeBooking } from '../api/bookings';
import SessionNotesModal from '../components/tutor/SessionNotesModal';

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ icon: Icon, title, rightContent = null }) => (
    <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-3 text-blue-500" />
            <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
        </div>
        {rightContent}
    </div>
);

const Button = ({ children, variant = 'primary', Icon, onClick, isLoading = false, disabled = false, className = '' }) => {
    const baseStyles = 'flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variantStyles = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    const disabledStyles = 'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed';
    return (
        <button 
            className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`} 
            onClick={onClick}
            disabled={isLoading || disabled}
        >
            {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : Icon && (
                <Icon className="w-4 h-4 mr-2" />
            )}
            {children}
        </button>
    );
};

// --- Tutor Appointments Page Component ---
export default function TutorAppointmentsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'pending', 'completed', 'all'
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [selectedBookingForNotes, setSelectedBookingForNotes] = useState(null);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

    // Check if user is tutor or super_admin
    if (user?.role !== 'tutor' && user?.role !== 'super_admin') {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-600">Only tutors can access this page.</p>
            </div>
        );
    }

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            setIsLoading(true);
            setError('');
            const data = await getTutorBookings();
            setBookings(data || []);
        } catch (err) {
            console.error('Failed to fetch tutor bookings:', err);
            setError('Failed to load sessions. Please refresh the page.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric', 
            minute: '2-digit'
        });
    };

    const handleAccept = async (bookingId) => {
        try {
            setProcessingId(bookingId);
            setError('');
            setSuccess('');
            
            await acceptBooking(bookingId);
            setSuccess('Session accepted successfully!');
            await fetchBookings();
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to accept booking:', err);
            setError(err.message || 'Failed to accept session. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDecline = async (bookingId) => {
        if (!window.confirm('Are you sure you want to decline this session?')) {
            return;
        }

        try {
            setProcessingId(bookingId);
            setError('');
            setSuccess('');
            
            await declineBooking(bookingId);
            setSuccess('Session declined.');
            await fetchBookings();
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to decline booking:', err);
            setError(err.message || 'Failed to decline session. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleComplete = async (bookingId) => {
        if (!window.confirm('Mark this session as completed? You can add session notes after completing.')) {
            return;
        }

        try {
            setProcessingId(bookingId);
            setError('');
            setSuccess('');
            
            await completeBooking(bookingId);
            setSuccess('Session marked as complete!');
            await fetchBookings();
            
            // Open notes modal after completing
            const completedBooking = bookings.find(b => (b._id || b.id) === bookingId);
            if (completedBooking) {
                setSelectedBookingForNotes({ ...completedBooking, status: 'completed' });
                setIsNotesModalOpen(true);
            }
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to complete booking:', err);
            setError(err.message || 'Failed to complete session. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleAddNotes = (booking) => {
        setSelectedBookingForNotes(booking);
        setIsNotesModalOpen(true);
    };

    const handleNotesSaved = () => {
        fetchBookings();
        setIsNotesModalOpen(false);
        setSelectedBookingForNotes(null);
    };

    // Filter and categorize bookings
    const filteredBookings = useMemo(() => {
        let filtered = bookings;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(booking => 
                booking.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                booking.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                booking.goals?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by tab
        const now = new Date();
        switch (activeTab) {
            case 'pending':
                // Pending: scheduled sessions that haven't been accepted or declined yet (future only)
                return filtered.filter(b => 
                    b.status === 'scheduled' && 
                    b.tutorAcceptanceStatus === 'pending' &&
                    new Date(b.sessionDate) > now
                ).sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
            case 'missed_requests':
                // Missed requests: session date passed before tutor accepted
                return filtered.filter(b => 
                    b.status === 'scheduled' && 
                    b.tutorAcceptanceStatus === 'request_expired'
                ).sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
            case 'upcoming':
                // Upcoming: accepted sessions that are scheduled and in the future
                // Include accepted OR legacy bookings (null acceptance status with tutor assigned)
                return filtered.filter(b => {
                    const isAccepted = b.tutorAcceptanceStatus === 'accepted' || 
                                     (b.tutorAcceptanceStatus === null && b.tutor); // Legacy bookings
                    return b.status === 'scheduled' && 
                           isAccepted &&
                           b.tutorAcceptanceStatus !== 'pending' &&
                           b.tutorAcceptanceStatus !== 'declined' &&
                           new Date(b.sessionDate) > now;
                }).sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
            case 'completed':
                return filtered.filter(b => 
                    b.status === 'completed'
                ).sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
            case 'all':
            default:
                return filtered.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
        }
    }, [bookings, activeTab, searchTerm, user?._id]);

    const pendingCount = bookings.filter(b => 
        b.status === 'scheduled' && 
        b.tutorAcceptanceStatus === 'pending' &&
        new Date(b.sessionDate) > new Date()
    ).length;

    const missedRequestsCount = bookings.filter(b => 
        b.status === 'scheduled' && 
        b.tutorAcceptanceStatus === 'request_expired'
    ).length;

    const upcomingCount = bookings.filter(b => {
        // Upcoming: scheduled sessions that are accepted OR have no acceptance status set (legacy/auto-accepted)
        // Exclude pending and declined
        const isAccepted = b.tutorAcceptanceStatus === 'accepted' || 
                           (b.tutorAcceptanceStatus === null && b.tutor); // Legacy bookings with tutor assigned
        return b.status === 'scheduled' && 
               isAccepted &&
               b.tutorAcceptanceStatus !== 'pending' &&
               b.tutorAcceptanceStatus !== 'declined' &&
               new Date(b.sessionDate) > new Date();
    }).length;

    const completedCount = bookings.filter(b => 
        b.status === 'completed'
    ).length;

    if (isLoading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading sessions...</p>
            </div>
        );
    }

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">My Sessions</h1>
                <p className="text-gray-600">Manage your tutoring sessions and student appointments.</p>
            </header>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {success}
                </div>
            )}

            {/* Tabs */}
            <Card className="mb-6">
                <div className="flex flex-wrap gap-2 border-b">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors ${
                            activeTab === 'upcoming'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        Upcoming ({upcomingCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors ${
                            activeTab === 'pending'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        Pending ({pendingCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('missed_requests')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors ${
                            activeTab === 'missed_requests'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        Missed Requests ({missedRequestsCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors ${
                            activeTab === 'completed'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        Completed ({completedCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors ${
                            activeTab === 'all'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        All Sessions
                    </button>
                </div>

                {/* Search */}
                <div className="mt-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by student name, subject, or goals..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </Card>

            {/* Bookings List */}
            <div className="space-y-4">
                {filteredBookings.length > 0 ? (
                    filteredBookings.map(booking => {
                        const sessionDate = new Date(booking.sessionDate);
                        const isPast = sessionDate < new Date();
                        const isToday = sessionDate.toDateString() === new Date().toDateString();
                        const isUpcoming = sessionDate > new Date();

                        return (
                            <Card key={booking._id} className="hover:shadow-lg transition-shadow">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                                                {booking.student?.name?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-800">{booking.student?.name || 'Unknown Student'}</h3>
                                                <p className="text-sm text-gray-500">{booking.subject}</p>
                                            </div>
                                        </div>

                                        <div className="ml-15 space-y-2">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Calendar className="w-4 h-4 mr-2" />
                                                {formatDate(booking.sessionDate)}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Clock className="w-4 h-4 mr-2" />
                                                {formatTime(booking.sessionDate)} • {booking.duration} minutes
                                            </div>
                                            {booking.goals && (
                                                <div className="text-sm text-gray-600 mt-2">
                                                    <strong>Goals:</strong> {booking.goals}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 flex gap-2 flex-wrap">
                                            {(booking.tutorAcceptanceStatus === 'accepted' || (booking.tutorAcceptanceStatus === null && booking.tutor)) && (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                    Accepted
                                                </span>
                                            )}
                                            {booking.tutorAcceptanceStatus === 'declined' && (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                    Declined
                                                </span>
                                            )}
                                            {booking.tutorAcceptanceStatus === 'pending' && (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    Pending
                                                </span>
                                            )}
                                            {booking.tutorAcceptanceStatus === 'request_expired' && (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                                    Request Expired – Reschedule Needed
                                                </span>
                                            )}
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                booking.status === 'completed' 
                                                    ? 'bg-green-100 text-green-800'
                                                    : booking.status === 'cancelled'
                                                    ? 'bg-red-100 text-red-800'
                                                    : booking.status === 'no_show'
                                                    ? 'bg-orange-100 text-orange-800'
                                                    : isPast
                                                    ? 'bg-gray-100 text-gray-800'
                                                    : isToday
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {booking.status === 'completed' 
                                                    ? 'Completed'
                                                    : booking.status === 'cancelled'
                                                    ? 'Cancelled'
                                                    : booking.status === 'no_show'
                                                    ? 'No-Show'
                                                    : isPast
                                                    ? 'Past'
                                                    : isToday
                                                    ? 'Today'
                                                    : 'Upcoming'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 md:items-end">
                                        {booking.status === 'scheduled' && isUpcoming && (
                                            <>
                                                {booking.tutorAcceptanceStatus === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="success"
                                                            Icon={Check}
                                                            onClick={() => handleAccept(booking._id)}
                                                            isLoading={processingId === booking._id}
                                                            disabled={processingId !== null && processingId !== booking._id}
                                                        >
                                                            Accept Session
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            Icon={X}
                                                            onClick={() => handleDecline(booking._id)}
                                                            isLoading={processingId === booking._id}
                                                            disabled={processingId !== null && processingId !== booking._id}
                                                        >
                                                            Decline Session
                                                        </Button>
                                                    </>
                                                )}
                                                {(booking.tutorAcceptanceStatus === 'accepted' || (booking.tutorAcceptanceStatus === null && booking.tutor)) && (
                                                    <>
                                                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center justify-center">
                                                            <Check className="w-3 h-3 mr-1" />
                                                            Accepted
                                                        </span>
                                                        <Button
                                                            variant="primary"
                                                            onClick={() => navigate(`/classroom?sessionId=${booking._id}`)}
                                                        >
                                                            Start Session
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => handleComplete(booking._id)}
                                                            isLoading={processingId === booking._id}
                                                            disabled={processingId !== null && processingId !== booking._id}
                                                        >
                                                            Mark Complete
                                                        </Button>
                                                    </>
                                                )}
                                                {booking.tutorAcceptanceStatus === 'declined' && (
                                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center justify-center">
                                                        <X className="w-3 h-3 mr-1" />
                                                        Declined
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        {booking.status === 'scheduled' && isPast && (booking.tutorAcceptanceStatus === 'accepted' || (booking.tutorAcceptanceStatus === null && booking.tutor)) && (
                                            <Button
                                                variant="secondary"
                                                Icon={CheckCircle}
                                                onClick={() => handleComplete(booking._id)}
                                                isLoading={processingId === booking._id}
                                                disabled={processingId !== null && processingId !== booking._id}
                                            >
                                                Mark Complete
                                            </Button>
                                        )}
                                        {booking.status === 'completed' && (
                                            <>
                                                <span className="text-sm text-green-600 font-semibold flex items-center mb-2">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Completed
                                                </span>
                                                <Button
                                                    variant="secondary"
                                                    Icon={FileText}
                                                    onClick={() => handleAddNotes(booking)}
                                                >
                                                    {booking.sessionNotes && booking.sessionNotes.notesAddedAt ? 'Edit Notes' : 'Add Notes'}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })
                ) : (
                    <Card>
                        <div className="text-center py-12">
                            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg font-semibold">No sessions found</p>
                            <p className="text-gray-400 text-sm mt-2">
                                {searchTerm 
                                    ? 'Try adjusting your search filters.' 
                                    : activeTab === 'pending'
                                    ? 'You have no pending session requests.'
                                    : activeTab === 'upcoming'
                                    ? 'You have no upcoming sessions scheduled.'
                                    : activeTab === 'completed'
                                    ? 'You have no completed sessions yet.'
                                    : 'You have no sessions.'}
                            </p>
                        </div>
                    </Card>
                )}
            </div>

            {/* Session Notes Modal */}
            <SessionNotesModal
                booking={selectedBookingForNotes}
                isOpen={isNotesModalOpen}
                onClose={() => {
                    setIsNotesModalOpen(false);
                    setSelectedBookingForNotes(null);
                }}
                onSave={handleNotesSaved}
            />
        </div>
    );
}

