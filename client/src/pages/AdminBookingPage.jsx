import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, User, Plus, Edit3, Trash2, Search, AlertCircle, CheckCircle, Filter, Clock, DollarSign, UserPlus } from 'lucide-react';
import { getAllUsers } from '../api/users';
import { getTutors } from '../api/users';
import { createBooking, getAllBookings, updateBooking, deleteBooking, markBookingAsPaid, markBookingsAsPaidBatch, markBookingAsNoShow } from '../api/bookings';
import { getSubjects } from '../api/systemConfig';
import { useAuth } from '../contexts/AuthContext';
import { getCompatibilityAnalysis } from '../api/matching';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Dialog from '../components/common/Dialog.jsx';
import LearningStyleVisualizer from '../components/matching/LearningStyleVisualizer';
import { useToast } from '../components/common/Toast.jsx';
import { useConfirm } from '../components/common/ConfirmDialog.jsx';

// --- Reusable Components ---
export default function AdminBookingPage() {
    const { user, isLoading: authLoading } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState('bookings');
    const [bookings, setBookings] = useState([]);
    const [students, setStudents] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
    const [hasAttemptedBookingsFetch, setHasAttemptedBookingsFetch] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');
    const [bookingsError, setBookingsError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingBooking, setEditingBooking] = useState(null);
    const [selectedBookings, setSelectedBookings] = useState([]);
    const [isMarkingPaid, setIsMarkingPaid] = useState(false);
    const [markingNoShowId, setMarkingNoShowId] = useState(null);
    
    // Tutor assignment state
    const [assigningTutorBooking, setAssigningTutorBooking] = useState(null);
    const [showAssignTutorModal, setShowAssignTutorModal] = useState(false);
    const [selectedTutorForAssignment, setSelectedTutorForAssignment] = useState('');
    const [isAssigningTutor, setIsAssigningTutor] = useState(false);
    
    // Filter states
    const [filters, setFilters] = useState({
        status: '',
        student: '',
        tutor: '',
        subject: '',
        startDate: '',
        endDate: '',
        paymentStatus: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    
    // Compatibility scores state
    const [compatibilityScores, setCompatibilityScores] = useState({});
    const [loadingCompatibility, setLoadingCompatibility] = useState({});
    const [selectedMatchDetails, setSelectedMatchDetails] = useState(null);
    const [showMatchModal, setShowMatchModal] = useState(false);

    const [bookingForm, setBookingForm] = useState({
        student: '',
        tutor: '',
        subject: '',
        goals: '',
        sessionDate: '',
        sessionTime: '',
        duration: 60,
        serviceType: 'solo',
        sessionType: 'in-person',
    });

    // Check if user is admin (wait for auth to load first)
    if (authLoading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
            </div>
        );
    }

    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-600">Only administrators can access booking management.</p>
            </div>
        );
    }

    // Fetch data only after auth is loaded and user is confirmed admin or super_admin
    useEffect(() => {
        if (!authLoading && (user?.role === 'admin' || user?.role === 'super_admin')) {
            fetchData();
            fetchSubjects();
        }
    }, [authLoading, user]);

    // Fetch subjects from system config
    const fetchSubjects = async () => {
        try {
            const data = await getSubjects();
            setSubjects(data.subjects || []);
        } catch (error) {
            console.error('Failed to fetch subjects:', error);
            setSubjects([]);
        }
    };

    // Fetch bookings when filters change or when switching to bookings tab
    useEffect(() => {
        if (!authLoading && (user?.role === 'admin' || user?.role === 'super_admin') && activeTab === 'bookings') {
            fetchBookings();
        }
    }, [filters, activeTab, authLoading, user]);

    // Clear booking errors when switching to create tab
    useEffect(() => {
        if (activeTab === 'create') {
            setBookingsError('');
        }
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError('');
            setHasAttemptedFetch(true);

            console.log('[AdminBookingPage] Fetching students and tutors...');
            
            // Fetch students and tutors
            const [usersData, tutorsData] = await Promise.all([
                getAllUsers(),
                getTutors(),
            ]);

            console.log('[AdminBookingPage] Received users:', usersData?.length || 0);
            console.log('[AdminBookingPage] Received tutors:', tutorsData?.length || 0);

            // Filter students (include both student and parent roles)
            const studentsList = (usersData || []).filter(u => u.role === 'student' || u.role === 'parent');
            console.log('[AdminBookingPage] Filtered students:', studentsList.length);
            
            setStudents(studentsList);
            setTutors(tutorsData || []);
            setError(''); // Clear any errors on success
            
            if (studentsList.length === 0) {
                console.warn('[AdminBookingPage] No students found in database');
            }
            if (!tutorsData || tutorsData.length === 0) {
                console.warn('[AdminBookingPage] No tutors found in database');
            }
        } catch (err) {
            console.error('[AdminBookingPage] Failed to fetch data:', err);
            const errorMessage = err.message || 'Failed to load students/tutors';
            if (errorMessage.includes('Network') || errorMessage.includes('connection')) {
                setError('Network error. Please check your connection and try again.');
            } else if (err.status === 401 || errorMessage.includes('unauthorized')) {
                setError('Authentication required. Please log in again.');
            } else {
                setError(`Failed to load students/tutors: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            setIsLoadingBookings(true);
            setBookingsError('');
            setHasAttemptedBookingsFetch(true);
            console.log('[AdminBookingPage] Fetching bookings with filters:', filters);
            const response = await getAllBookings(filters);
            // Handle paginated response format
            const bookingsData = response.bookings || response;
            console.log('[AdminBookingPage] Received bookings:', bookingsData);
            // Empty array is a valid result, not an error
            setBookings(Array.isArray(bookingsData) ? bookingsData : []);
            setBookingsError(''); // Ensure error is cleared on success
            
            // Fetch compatibility scores for bookings with both student and tutor
            if (bookingsData && Array.isArray(bookingsData) && bookingsData.length > 0) {
                fetchCompatibilityScores(bookingsData);
            }
        } catch (err) {
            console.error('[AdminBookingPage] Failed to fetch bookings:', err);
            console.error('[AdminBookingPage] Error details:', {
                message: err.message,
                status: err.status,
                stack: err.stack
            });
            // Only set error if it's an actual API failure
            const errorMessage = err.message || 'Failed to load bookings';
            if (errorMessage.includes('Network') || errorMessage.includes('connection')) {
                setBookingsError('Network error. Please check your connection and try again.');
            } else if (err.status === 401 || errorMessage.includes('unauthorized')) {
                setBookingsError('Authentication required. Please log in again.');
            } else if (err.status === 403) {
                setBookingsError('You do not have permission to view all bookings.');
            } else if (err.status === 404 || errorMessage.includes('not found')) {
                setBookingsError('The bookings endpoint was not found. Please check the server configuration.');
            } else if (err.status === 500) {
                setBookingsError('Server error. Please refresh the page.');
            } else {
                setBookingsError(errorMessage);
            }
            setBookings([]); // Clear bookings on error
        } finally {
            setIsLoadingBookings(false);
        }
    };

    const fetchCompatibilityScores = async (bookingsList) => {
        const scores = {};
        const loading = {};
        
        // Filter bookings that have both student and tutor
        const bookingsWithBoth = bookingsList.filter(
            b => b.student?._id && b.tutor?._id
        );
        
        bookingsWithBoth.forEach(booking => {
            loading[booking._id] = true;
        });
        setLoadingCompatibility(prev => ({ ...prev, ...loading }));
        
        // Fetch compatibility for each booking
        const promises = bookingsWithBoth.map(async (booking) => {
            try {
                const analysis = await getCompatibilityAnalysis(
                    booking.tutor._id,
                    booking.student._id
                );
                scores[booking._id] = analysis;
            } catch (err) {
                console.error(`Failed to fetch compatibility for booking ${booking._id}:`, err);
                scores[booking._id] = null;
            } finally {
                loading[booking._id] = false;
            }
        });
        
        await Promise.all(promises);
        setCompatibilityScores(prev => ({ ...prev, ...scores }));
        setLoadingCompatibility(prev => {
            const updated = { ...prev };
            Object.keys(loading).forEach(id => {
                updated[id] = false;
            });
            return updated;
        });
    };

    const handleViewMatchDetails = async (booking) => {
        if (!booking.student?._id || !booking.tutor?._id) {
            return;
        }
        
        // Use cached score if available, otherwise fetch
        if (compatibilityScores[booking._id]) {
            setSelectedMatchDetails({ booking, analysis: compatibilityScores[booking._id] });
            setShowMatchModal(true);
        } else {
            try {
                const analysis = await getCompatibilityAnalysis(
                    booking.tutor._id,
                    booking.student._id
                );
                setCompatibilityScores(prev => ({ ...prev, [booking._id]: analysis }));
                setSelectedMatchDetails({ booking, analysis });
                setShowMatchModal(true);
            } catch (err) {
                console.error('Failed to fetch match details:', err);
                toast.error('Failed to load match details. Please try again.');
            }
        }
    };

    const getCompatibilityBadgeColor = (score) => {
        if (!score && score !== 0) return 'bg-gray-100 text-gray-600';
        if (score >= 0.8) return 'bg-green-100 text-green-800';
        if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setBookingForm(prev => ({
            ...prev,
            [name]: value,
        }));
        setError('');
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleMarkAsPaid = async (bookingId) => {
        try {
            setIsMarkingPaid(true);
            setError('');
            setSuccess('');
            await markBookingAsPaid(bookingId);
            setSuccess('Booking marked as paid successfully!');
            setSelectedBookings(prev => prev.filter(id => id !== bookingId));
            await fetchBookings();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to mark booking as paid:', err);
            setError(err.message || 'Failed to mark booking as paid. Please try again.');
        } finally {
            setIsMarkingPaid(false);
        }
    };

    const handleMarkAsNoShow = async (bookingId) => {
        const ok = await confirm({
            title: 'Mark as no-show?',
            message: 'Mark this session as no-show? This will notify the tutor and all admins.',
            confirmLabel: 'Mark no-show',
            danger: true,
        });
        if (!ok) return;
        try {
            setMarkingNoShowId(bookingId);
            setError('');
            setSuccess('');
            await markBookingAsNoShow(bookingId);
            setSuccess('Booking marked as no-show. Notifications sent to tutor and admins.');
            await fetchBookings();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to mark no-show:', err);
            setError(err.message || 'Failed to mark as no-show. Please try again.');
        } finally {
            setMarkingNoShowId(null);
        }
    };

    const handleAssignTutor = (booking) => {
        setAssigningTutorBooking(booking);
        setSelectedTutorForAssignment(booking.tutor?._id || '');
        setShowAssignTutorModal(true);
        setError('');
    };

    const handleConfirmAssignTutor = async () => {
        if (!assigningTutorBooking) return;

        try {
            setIsAssigningTutor(true);
            setError('');
            
            const tutorId = selectedTutorForAssignment || null;
            await updateBooking(assigningTutorBooking._id, {
                tutor: tutorId,
            });
            
            setSuccess('Tutor assigned successfully!');
            setShowAssignTutorModal(false);
            setAssigningTutorBooking(null);
            setSelectedTutorForAssignment('');
            fetchBookings();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to assign tutor:', err);
            setError(err.message || 'Failed to assign tutor. Please try again.');
        } finally {
            setIsAssigningTutor(false);
        }
    };

    const handleBatchMarkAsPaid = async () => {
        if (selectedBookings.length === 0) {
            setError('Please select at least one booking to mark as paid.');
            return;
        }

        const ok = await confirm({
            title: 'Mark bookings as paid?',
            message: `Mark ${selectedBookings.length} booking(s) as paid?`,
            confirmLabel: 'Mark paid',
        });
        if (!ok) {
            return;
        }

        try {
            setIsMarkingPaid(true);
            setError('');
            setSuccess('');
            await markBookingsAsPaidBatch(selectedBookings);
            setSuccess(`${selectedBookings.length} booking(s) marked as paid successfully!`);
            setSelectedBookings([]);
            await fetchBookings();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to mark bookings as paid:', err);
            setError(err.message || 'Failed to mark bookings as paid. Please try again.');
        } finally {
            setIsMarkingPaid(false);
        }
    };

    const handleToggleBookingSelection = (bookingId) => {
        setSelectedBookings(prev => {
            if (prev.includes(bookingId)) {
                return prev.filter(id => id !== bookingId);
            } else {
                return [...prev, bookingId];
            }
        });
    };

    const handleSelectAll = () => {
        const completedUnpaidBookings = filteredBookings.filter(b => 
            b.status === 'completed' && (b.paymentStatus === 'Unpaid' || !b.paymentStatus)
        ).map(b => b._id);
        if (selectedBookings.length === completedUnpaidBookings.length && completedUnpaidBookings.length > 0) {
            setSelectedBookings([]);
        } else {
            setSelectedBookings(completedUnpaidBookings);
        }
    };

    const handleCreateBooking = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsCreating(true);

        try {
            // Validate form
            if (!bookingForm.student || !bookingForm.subject || !bookingForm.goals || 
                !bookingForm.sessionDate || !bookingForm.sessionTime) {
                setError('Please fill in all required fields.');
                setIsCreating(false);
                return;
            }

            // Combine date and time
            const sessionDateTime = new Date(`${bookingForm.sessionDate}T${bookingForm.sessionTime}`);
            if (isNaN(sessionDateTime.getTime())) {
                setError('Invalid date or time. Please check your input.');
                setIsCreating(false);
                return;
            }

            // Create booking data
            const bookingData = {
                student: bookingForm.student,
                tutor: bookingForm.tutor || null,
                subject: bookingForm.subject,
                goals: bookingForm.goals,
                sessionDate: sessionDateTime.toISOString(),
                duration: parseInt(bookingForm.duration, 10),
                serviceType: bookingForm.serviceType,
                sessionType: bookingForm.sessionType || 'in-person',
            };

            console.log('[AdminBookingPage] Creating booking with data:', bookingData);
            const createdBooking = await createBooking(bookingData);
            console.log('[AdminBookingPage] Booking created successfully:', createdBooking);

            setSuccess('Booking created successfully!');
            setBookingForm({
                student: '',
                tutor: '',
                subject: '',
                goals: '',
                sessionDate: '',
                sessionTime: '',
                duration: 60,
                serviceType: 'solo',
                sessionType: 'in-person',
            });
            
            // Refresh bookings and switch to bookings tab
            setTimeout(() => {
                handleSwitchToBookings();
                setSuccess('');
                fetchBookings();
            }, 1500);
        } catch (err) {
            console.error('Failed to create booking:', err);
            setError(err.message || 'Failed to create booking. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditBooking = (booking) => {
        // Parse session date and time
        const sessionDate = new Date(booking.sessionDate);
        const dateStr = sessionDate.toISOString().split('T')[0];
        const timeStr = sessionDate.toTimeString().slice(0, 5);

        setEditingBooking(booking);
        setBookingForm({
            student: booking.student._id || booking.student,
            tutor: booking.tutor?._id || booking.tutor || '',
            subject: booking.subject,
            goals: booking.goals,
            sessionDate: dateStr,
            sessionTime: timeStr,
            duration: booking.duration,
            serviceType: booking.serviceType,
            sessionType: booking.sessionType || 'in-person',
        });
        setActiveTab('create');
        setError('');
        setSuccess('');
    };

    const handleUpdateBooking = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsUpdating(true);

        try {
            // Validate form
            if (!bookingForm.student || !bookingForm.subject || !bookingForm.goals || 
                !bookingForm.sessionDate || !bookingForm.sessionTime) {
                setError('Please fill in all required fields.');
                setIsUpdating(false);
                return;
            }

            // Combine date and time
            const sessionDateTime = new Date(`${bookingForm.sessionDate}T${bookingForm.sessionTime}`);
            if (isNaN(sessionDateTime.getTime())) {
                setError('Invalid date or time. Please check your input.');
                setIsUpdating(false);
                return;
            }

            // Update booking data
            const bookingData = {
                student: bookingForm.student,
                tutor: bookingForm.tutor || null,
                subject: bookingForm.subject,
                goals: bookingForm.goals,
                sessionDate: sessionDateTime.toISOString(),
                duration: parseInt(bookingForm.duration, 10),
                serviceType: bookingForm.serviceType,
                sessionType: bookingForm.sessionType || 'in-person',
            };

            await updateBooking(editingBooking._id, bookingData);

            setSuccess('Booking updated successfully!');
            setEditingBooking(null);
            setBookingForm({
                student: '',
                tutor: '',
                subject: '',
                goals: '',
                sessionDate: '',
                sessionTime: '',
                duration: 60,
                serviceType: 'solo',
                sessionType: 'in-person',
            });
            
            // Refresh bookings and switch to bookings tab
            setTimeout(() => {
                handleSwitchToBookings();
                setSuccess('');
                fetchBookings();
            }, 1500);
        } catch (err) {
            console.error('Failed to update booking:', err);
            setError(err.message || 'Failed to update booking. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        const ok = await confirm({
            title: 'Delete booking?',
            message: 'Are you sure you want to delete this booking? This action cannot be undone.',
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!ok) {
            return;
        }

        try {
            await deleteBooking(bookingId);
            setSuccess('Booking deleted successfully!');
            fetchBookings();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to delete booking:', err);
            setError(err.message || 'Failed to delete booking. Please try again.');
        }
    };

    const handleCancel = () => {
        setEditingBooking(null);
        setBookingForm({
            student: '',
            tutor: '',
            subject: '',
            goals: '',
            sessionDate: '',
            sessionTime: '',
            duration: 60,
            serviceType: 'solo',
        });
        setError('');
        setSuccess('');
    };

    const handleSwitchToCreate = () => {
        // Clear form state first
        setEditingBooking(null);
        setBookingForm({
            student: '',
            tutor: '',
            subject: '',
            goals: '',
            sessionDate: '',
            sessionTime: '',
            duration: 60,
            serviceType: 'solo',
        });
        setError('');
        setSuccess('');
        // Immediately switch tab - React will batch the state updates
        setActiveTab('create');
        // Scroll to top after tab switches
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };

    const handleSwitchToBookings = () => {
        handleCancel();
        setActiveTab('bookings');
        // Scroll to top when switching tabs
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
    };

    const filteredStudents = students.filter(student =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter bookings by search term (client-side for name/email search)
    const filteredBookings = useMemo(() => {
        if (!searchTerm) return bookings;
        const term = searchTerm.toLowerCase();
        return bookings.filter(booking =>
            booking.student?.name?.toLowerCase().includes(term) ||
            booking.student?.email?.toLowerCase().includes(term) ||
            booking.tutor?.name?.toLowerCase().includes(term) ||
            booking.subject?.toLowerCase().includes(term)
        );
    }, [bookings, searchTerm]);

    const statusOptions = ['scheduled', 'completed', 'cancelled', 'no_show'];

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-700';
            case 'completed': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            case 'no_show': return 'bg-orange-100 text-orange-700';
            case 'past': return 'bg-gray-100 text-gray-700';
            case 'Request expired': return 'bg-amber-100 text-amber-700';
            case 'missed': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getDisplayStatus = (booking) => {
        if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'no_show') {
            return booking.status;
        }
        if (booking.status === 'scheduled' && booking.tutorAcceptanceStatus === 'request_expired') {
            return 'Request expired';
        }
        if (booking.status === 'scheduled') {
            const sessionDate = new Date(booking.sessionDate);
            const now = new Date();
            if (sessionDate < now) return 'past';
        }
        return booking.status;
    };

    const getPaymentStatusColor = (paymentStatus) => {
        switch (paymentStatus) {
            case 'Paid': return 'bg-green-100 text-green-700';
            case 'Unpaid': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="w-full min-w-0">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Booking Management</h1>
                <p className="text-gray-600">Create and manage bookings for students. No payment required.</p>
            </header>

            <div className="flex border-b mb-6">
                <button
                    onClick={handleSwitchToBookings}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${
                        activeTab === 'bookings'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    All Bookings
                </button>
                <button
                    onClick={handleSwitchToCreate}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${
                        activeTab === 'create'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {editingBooking ? 'Edit Booking' : 'Create Booking'}
                </button>
            </div>

            {activeTab === 'bookings' && (
                <Card className="w-full min-w-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <h2 className="text-xl font-semibold">All Bookings</h2>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            {selectedBookings.length > 0 && (
                                <Button
                                    variant="primary"
                                    Icon={DollarSign}
                                    onClick={handleBatchMarkAsPaid}
                                    isLoading={isMarkingPaid}
                                >
                                    Mark {selectedBookings.length} as Paid
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                Icon={Filter}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                {showFilters ? 'Hide Filters' : 'Filters'}
                            </Button>
                            <Button Icon={Plus} onClick={handleSwitchToCreate}>
                                Create New Booking
                            </Button>
                        </div>
                    </div>

                    {hasAttemptedFetch && error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            {error}
                        </div>
                    )}

                    {hasAttemptedBookingsFetch && bookingsError && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            {bookingsError}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            {success}
                        </div>
                    )}

                    {/* Filters */}
                    {showFilters && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={filters.status}
                                    onChange={handleFilterChange}
                                    className="w-full p-2 border rounded-lg text-sm"
                                >
                                    <option value="">All</option>
                                    {statusOptions.map(status => (
                                        <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Status</label>
                                <select
                                    name="paymentStatus"
                                    value={filters.paymentStatus}
                                    onChange={handleFilterChange}
                                    className="w-full p-2 border rounded-lg text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Unpaid">Unpaid</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Student</label>
                                <select
                                    name="student"
                                    value={filters.student}
                                    onChange={handleFilterChange}
                                    className="w-full p-2 border rounded-lg text-sm"
                                >
                                    <option value="">All</option>
                                    {students.map(student => (
                                        <option key={student._id || student.id} value={student._id || student.id}>
                                            {student.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tutor</label>
                                <select
                                    name="tutor"
                                    value={filters.tutor}
                                    onChange={handleFilterChange}
                                    className="w-full p-2 border rounded-lg text-sm"
                                >
                                    <option value="">All</option>
                                    {tutors.map(tutor => (
                                        <option key={tutor._id || tutor.id} value={tutor._id || tutor.id}>
                                            {tutor.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                                <select
                                    name="subject"
                                    value={filters.subject}
                                    onChange={handleFilterChange}
                                    className="w-full p-2 border rounded-lg text-sm"
                                >
                                    <option value="">All</option>
                                    {subjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={filters.startDate}
                                    onChange={handleFilterChange}
                                    className="w-full p-2 border rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={filters.endDate}
                                    onChange={handleFilterChange}
                                    className="w-full p-2 border rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="mb-4 w-full">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search bookings by student, tutor, or subject..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {isLoadingBookings ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading bookings...</p>
                        </div>
                    ) : !bookingsError && filteredBookings.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="font-semibold">No bookings found.</p>
                            <p>Create a booking to get started.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-6 px-6" style={{ width: 'calc(100% + 3rem)' }}>
                            <table className="w-full text-left border-collapse" style={{ minWidth: '1200px' }}>
                                <thead className="text-sm text-gray-500 uppercase bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 w-12 bg-gray-50">
                                            {filteredBookings.filter(b => b.status === 'completed' && (b.paymentStatus === 'Unpaid' || !b.paymentStatus)).length > 0 && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBookings.length > 0 && selectedBookings.length === filteredBookings.filter(b => b.status === 'completed' && (b.paymentStatus === 'Unpaid' || !b.paymentStatus)).length}
                                                    onChange={handleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    title="Select all unpaid completed sessions"
                                                />
                                            )}
                                        </th>
                                        <th className="px-6 py-3 bg-gray-50">Student</th>
                                        <th className="px-6 py-3 bg-gray-50">Tutor</th>
                                        <th className="px-6 py-3 bg-gray-50">Subject</th>
                                        <th className="px-6 py-3 bg-gray-50">Session Date</th>
                                        <th className="px-6 py-3 bg-gray-50">Duration</th>
                                        <th className="px-6 py-3 bg-gray-50">Service Type</th>
                                        <th className="px-6 py-3 bg-gray-50">Status</th>
                                        <th className="px-6 py-3 bg-gray-50">Payment</th>
                                        <th className="px-6 py-3 bg-gray-50">Match Score</th>
                                        <th className="px-6 py-3 text-right bg-gray-50">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredBookings.map((booking) => {
                                        const displayStatus = getDisplayStatus(booking);
                                        const isCompletedUnpaid = booking.status === 'completed' && booking.paymentStatus === 'Unpaid';
                                        const isSelected = selectedBookings.includes(booking._id);
                                        const isPastSession = displayStatus === 'past';
                                        return (
                                        <tr key={booking._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                {isCompletedUnpaid && (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleBookingSelection(booking._id)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    {booking.student?.avatar && (
                                                        <img src={booking.student.avatar} alt={booking.student.name} className="w-8 h-8 rounded-full mr-2" loading="lazy" decoding="async" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium">{booking.student?.name || 'N/A'}</p>
                                                        <p className="text-xs text-gray-500">{booking.student?.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {booking.tutor ? (
                                                    <div className="flex items-center">
                                                        {booking.tutor.avatar && (
                                                            <img src={booking.tutor.avatar} alt={booking.tutor.name} className="w-8 h-8 rounded-full mr-2" loading="lazy" decoding="async" />
                                                        )}
                                                        <span>{booking.tutor.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">TBD</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">{booking.subject}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                                    <span className="text-sm">{formatDate(booking.sessionDate)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{booking.duration} min</td>
                                            <td className="px-6 py-4 capitalize">{booking.serviceType}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(getDisplayStatus(booking))}`}>
                                                    {getDisplayStatus(booking)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {booking.status === 'completed' ? (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(booking.paymentStatus || 'Unpaid')}`}>
                                                        {booking.paymentStatus || 'Unpaid'}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {booking.student?._id && booking.tutor?._id ? (
                                                    loadingCompatibility[booking._id] ? (
                                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : compatibilityScores[booking._id] ? (
                                                        <button
                                                            onClick={() => handleViewMatchDetails(booking)}
                                                            className={`px-2 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${getCompatibilityBadgeColor(compatibilityScores[booking._id].compatibilityScore)}`}
                                                            title="Click to view match details"
                                                        >
                                                            {Math.round(compatibilityScores[booking._id].compatibilityScore * 100)}%
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">N/A</span>
                                                    )
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!booking.tutor && booking.status === 'scheduled' && !isPastSession && (
                                                        <button
                                                            onClick={() => handleAssignTutor(booking)}
                                                            className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                                                            title="Assign Tutor"
                                                        >
                                                            <UserPlus className="w-3 h-3" />
                                                            Assign Tutor
                                                        </button>
                                                    )}
                                                    {isCompletedUnpaid && (
                                                        <button
                                                            onClick={() => handleMarkAsPaid(booking._id)}
                                                            disabled={isMarkingPaid}
                                                            className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                                            title="Mark as Paid"
                                                        >
                                                            Mark Paid
                                                        </button>
                                                    )}
                                                    {booking.status === 'scheduled' && isPastSession && (
                                                        <button
                                                            onClick={() => handleMarkAsNoShow(booking._id)}
                                                            disabled={markingNoShowId === booking._id}
                                                            className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                                            title="Mark as No-Show (notifies tutor and admins)"
                                                        >
                                                            {markingNoShowId === booking._id ? '...' : 'Mark No-Show'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleEditBooking(booking)}
                                                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit3 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBooking(booking._id)}
                                                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {activeTab === 'create' && (
                <Card>
                    <h2 className="text-xl font-semibold mb-6">
                        {editingBooking ? 'Edit Booking' : 'Create New Booking'}
                    </h2>
                    
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

                    <form onSubmit={editingBooking ? handleUpdateBooking : handleCreateBooking} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Student <span className="text-red-500">*</span>
                            </label>
                            <div className="mb-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search students..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>
                            <select
                                name="student"
                                value={bookingForm.student}
                                onChange={handleFormChange}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="">Select a student...</option>
                                {filteredStudents.map(student => (
                                    <option key={student._id || student.id} value={student._id || student.id}>
                                        {student.name} ({student.email}) - {student.role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tutor (Optional)
                            </label>
                            <select
                                name="tutor"
                                value={bookingForm.tutor}
                                onChange={handleFormChange}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">No preference (assign best available)</option>
                                {tutors.map(tutor => (
                                    <option key={tutor._id || tutor.id} value={tutor._id || tutor.id}>
                                        {tutor.name} {tutor.tutorInfo?.subjects?.length > 0 && `- ${tutor.tutorInfo.subjects.join(', ')}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subject <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="subject"
                                    value={bookingForm.subject}
                                    onChange={handleFormChange}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select a subject...</option>
                                    {subjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Service Type
                                </label>
                                <select
                                    name="serviceType"
                                    value={bookingForm.serviceType}
                                    onChange={handleFormChange}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="solo">Solo Session</option>
                                    <option value="group">Group Session</option>
                                    <option value="consult">Consultation</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Session Type
                                </label>
                                <select
                                    name="sessionType"
                                    value={bookingForm.sessionType}
                                    onChange={handleFormChange}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="in-person">In-Person (Recommended)</option>
                                    <option value="virtual">Virtual (Video Call)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    In-person sessions are highly encouraged for the best learning experience.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Learning Goals <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="goals"
                                value={bookingForm.goals}
                                onChange={handleFormChange}
                                rows="3"
                                placeholder="What should be covered in this session?"
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Session Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="sessionDate"
                                    value={bookingForm.sessionDate}
                                    onChange={handleFormChange}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Session Time <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    name="sessionTime"
                                    value={bookingForm.sessionTime}
                                    onChange={handleFormChange}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Duration (minutes)
                                </label>
                                <select
                                    name="duration"
                                    value={bookingForm.duration}
                                    onChange={handleFormChange}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="30">30 minutes</option>
                                    <option value="60">60 minutes</option>
                                    <option value="90">90 minutes</option>
                                    <option value="120">120 minutes</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                <strong>Note:</strong> As an admin, you can create bookings without payment. 
                                The student/parent will handle payment separately through their portal.
                            </p>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleSwitchToBookings}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={editingBooking ? isUpdating : isCreating}>
                                {editingBooking ? 'Update Booking' : 'Create Booking'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Assign Tutor Modal */}
            {showAssignTutorModal && assigningTutorBooking && (
                <Dialog
                    isOpen
                    onClose={() => {
                        setShowAssignTutorModal(false);
                        setAssigningTutorBooking(null);
                        setSelectedTutorForAssignment('');
                    }}
                    size="md"
                    title="Assign Tutor"
                >
                    <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-2">
                                    <strong>Student:</strong> {assigningTutorBooking.student?.name || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-600 mb-4">
                                    <strong>Subject:</strong> {assigningTutorBooking.subject || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-600 mb-4">
                                    <strong>Date:</strong> {formatDate(assigningTutorBooking.sessionDate)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Tutor <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedTutorForAssignment}
                                    onChange={(e) => setSelectedTutorForAssignment(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Select a Tutor --</option>
                                    {tutors.filter(tutor => tutor.tutorInfo?.status === 'active').map(tutor => (
                                        <option key={tutor._id || tutor.id} value={tutor._id || tutor.id}>
                                            {tutor.name} {tutor.tutorInfo?.subjects?.length > 0 ? `(${tutor.tutorInfo.subjects.join(', ')})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {tutors.filter(tutor => tutor.tutorInfo?.status === 'active').length === 0 && (
                                    <p className="text-xs text-gray-500 mt-2">No active tutors available.</p>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center">
                                    <AlertCircle className="w-5 h-5 mr-2" />
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAssignTutorModal(false);
                                        setAssigningTutorBooking(null);
                                        setSelectedTutorForAssignment('');
                                    }}
                                    disabled={isAssigningTutor}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmAssignTutor}
                                    disabled={isAssigningTutor || !selectedTutorForAssignment}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                                >
                                    {isAssigningTutor ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                            Assigning...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Assign Tutor
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                </Dialog>
            )}

            {/* Match Details Modal */}
            {showMatchModal && selectedMatchDetails && (
                <Dialog
                    isOpen
                    onClose={() => {
                        setShowMatchModal(false);
                        setSelectedMatchDetails(null);
                    }}
                    size="xl"
                    title="Match Compatibility Analysis"
                >
                        {selectedMatchDetails.analysis && (
                            <LearningStyleVisualizer
                                student={selectedMatchDetails.booking.student}
                                tutor={selectedMatchDetails.booking.tutor}
                                matchAnalysis={selectedMatchDetails.analysis}
                                showComparison={true}
                            />
                        )}

                        <div className="flex justify-end mt-6 pt-4 border-t">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowMatchModal(false);
                                    setSelectedMatchDetails(null);
                                }}
                            >
                                Close
                            </Button>
                        </div>
                </Dialog>
            )}
        </div>
    );
}
