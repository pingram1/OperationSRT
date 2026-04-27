import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, CheckCircle, Star, BookCopy, Calendar, User, ClipboardCheck, Sparkles, AlertCircle, Users, Video, MapPin } from 'lucide-react';

// --- Import the separate booking step components ---
import ServiceSelectionStep from '../components/booking/ServiceSelectionStep.jsx';
import ScheduleStep from '../components/booking/ScheduleStep.jsx';
import BookingProgressTracker from '../components/booking/BookingProgressTracker.jsx';
import SessionSetupStep from '../components/membership/SessionSetupStep.jsx';
import PaymentStep from '../components/membership/PaymentStep.jsx';
import { getTutors } from '../api/users.js';
import { getAllMembershipPlans, getCurrentMembership, selectMembershipPlan } from '../api/memberships.js';
import { createBooking, getBookingById } from '../api/bookings.js';
import { getSubjects } from '../api/systemConfig.js';
import { getUserProfile } from '../api/users.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { findTutorMatches } from '../api/matching.js';
import { useToast } from '../components/common/Toast.jsx';

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);

// --- Sub-components for each booking step (except the imported ones) ---

const SubjectAndGoalsStep = ({ onNext, onBack, onFormChange, bookingDetails, subjects = [] }) => {
    const gradeLevels = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'College', 'Independent Learner'];
    
    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-6">2. Subject & Learning Goals</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                    </label>
                    <select 
                        id="subject"
                        name="subject" 
                        value={bookingDetails.subject || ''} 
                        onChange={onFormChange} 
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="" disabled>Select a Subject</option>
                        {subjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 mb-2">
                        Grade Level *
                    </label>
                    <select 
                        id="gradeLevel"
                        name="gradeLevel" 
                        value={bookingDetails.gradeLevel || ''} 
                        onChange={onFormChange} 
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="" disabled>Select a Grade Level</option>
                        {gradeLevels.map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label htmlFor="goals" className="block text-sm font-medium text-gray-700 mb-2">
                        Learning Goals *
                    </label>
                    <textarea 
                        id="goals"
                        name="goals" 
                        value={bookingDetails.goals || ''} 
                        onChange={onFormChange} 
                        placeholder="What would you like to focus on in this session?" 
                        className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
            <div className="flex justify-between mt-8">
                <button 
                    onClick={onBack} 
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 flex items-center"
                >
                    <ArrowLeft className="inline w-4 h-4 mr-2" /> Back
                </button>
                <button 
                    onClick={onNext} 
                    disabled={!bookingDetails.subject || !bookingDetails.gradeLevel || !bookingDetails.goals} 
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                >
                    Next <ArrowRight className="inline w-4 h-4 ml-2" />
                </button>
            </div>
        </div>
);
};

const TutorPreferenceStep = ({ onSelect, onNext, onBack, bookingDetails, tutors = [], isLoading = false, user, subject }) => {
    const [matchingSuggestions, setMatchingSuggestions] = useState([]);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [matchError, setMatchError] = useState('');

    const getAvatarUrl = (tutor) => {
        if (tutor.avatar) return tutor.avatar;
        const initials = tutor.name ? tutor.name.split(' ').map(n => n[0]).join('') : 'T';
        return `https://placehold.co/40x40/E2E8F0/4A5568?text=${initials}`;
    };
    
    const isSelected = (tutor) => {
        const tutorId = tutor._id || tutor.id;
        const selectedId = bookingDetails.tutor?._id || bookingDetails.tutor?.id;
        return tutorId === selectedId;
    };

    const handleNoPreferenceClick = async () => {
        // First select "any" option
        onSelect('tutor', {id: 'any', name: 'Any Available'});
        
        // Then fetch matching suggestions
        if (user && user.learningStyleProfile?.assessmentCompleted) {
            setIsLoadingMatches(true);
            setMatchError('');
            try {
                const studentId = user.role === 'parent' && bookingDetails.studentId 
                    ? bookingDetails.studentId 
                    : user._id || user.id;
                
                const matches = await findTutorMatches(studentId, subject, 3);
                setMatchingSuggestions(matches.tutors || []);
                setShowSuggestions(true);
            } catch (err) {
                console.error('Failed to fetch matches:', err);
                if (err.message && err.message.includes('must complete learning style assessment')) {
                    setMatchError('Please complete your learning style assessment first. You can do this in Settings.');
                } else {
                    setMatchError('Unable to find matches. Proceeding with auto-assignment.');
                }
                setShowSuggestions(false);
            } finally {
                setIsLoadingMatches(false);
            }
        } else {
            setMatchError('Complete your learning style assessment in Settings to see personalized tutor matches.');
            setShowSuggestions(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-6">4. Select a Tutor</h2>
            {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading tutors...</div>
            ) : (
                <div className="space-y-3">
                    {tutors.map(tutor => (
                        <div 
                            key={tutor._id || tutor.id} 
                            onClick={()=>{
                                onSelect('tutor', tutor);
                                setShowSuggestions(false);
                            }} 
                            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${isSelected(tutor) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <img src={getAvatarUrl(tutor)} className="rounded-full mr-4 w-10 h-10" alt={tutor.name}/>
                            <div className="flex-1">
                                <p className="font-semibold">{tutor.name}</p>
                                {tutor.tutorInfo?.subjects && tutor.tutorInfo.subjects.length > 0 && (
                                    <p className="text-sm text-gray-500">{tutor.tutorInfo.subjects.join(', ')}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    <div 
                        onClick={handleNoPreferenceClick}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${bookingDetails.tutor?.id === 'any' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <Sparkles className="w-10 h-10 text-yellow-500 mr-4" />
                        <div className="flex-1">
                            <p className="font-semibold">No Preference (assign best available)</p>
                            <p className="text-xs text-gray-500 mt-1">We'll match you with the best tutor based on your learning style</p>
                        </div>
                        {isLoadingMatches && (
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        )}
                    </div>

                    {/* Matching Suggestions */}
                    {showSuggestions && matchingSuggestions.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                                <Sparkles className="w-5 h-5 mr-2" />
                                Recommended Matches for You
                            </h3>
                            <div className="space-y-3">
                                {matchingSuggestions.map((match, index) => (
                                    <div
                                        key={match.tutor._id || match.tutor.id}
                                        onClick={() => {
                                            onSelect('tutor', match.tutor);
                                            setShowSuggestions(false);
                                        }}
                                        className={`p-4 bg-white border-2 rounded-lg cursor-pointer transition-colors ${
                                            isSelected(match.tutor) ? 'border-green-500 bg-green-50' : 'border-blue-200 hover:border-blue-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center flex-1">
                                                <img 
                                                    src={getAvatarUrl(match.tutor)} 
                                                    className="rounded-full mr-4 w-12 h-12" 
                                                    alt={match.tutor.name}
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold">{match.tutor.name}</p>
                                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                                            {Math.round(match.compatibilityScore * 100)}% Match
                                                        </span>
                                                    </div>
                                                    {match.tutor.tutorInfo?.subjects && match.tutor.tutorInfo.subjects.length > 0 && (
                                                        <p className="text-sm text-gray-500 mb-2">
                                                            {match.tutor.tutorInfo.subjects.join(', ')}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-600 line-clamp-2">
                                                        {match.explanation.split('\n').slice(0, 2).join(' ')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-600 mt-3 italic">
                                You can select one of these matches or proceed with auto-assignment
                            </p>
                        </div>
                    )}

                    {matchError && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">{matchError}</p>
                        </div>
                    )}
                </div>
            )}
            <div className="flex justify-between mt-8">
                <button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300">
                    <ArrowLeft className="inline w-4 h-4" /> Back
                </button>
                <button onClick={onNext} disabled={!bookingDetails.tutor} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300">
                    Next <ArrowRight className="inline w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const SessionTypeStep = ({ onSelect, onNext, onBack, bookingDetails }) => {
    const sessionType = bookingDetails.sessionType || 'in-person';
    
    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-6">5. Session Type</h2>
            <p className="text-center text-gray-600 mb-6">
                Choose how you'd like to meet. In-person sessions are highly encouraged for the best learning experience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                    onClick={() => onSelect('sessionType', 'in-person')}
                    className={`p-6 border-2 rounded-lg transition-all ${
                        sessionType === 'in-person'
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                    <div className="flex items-center justify-center mb-3">
                        <MapPin className={`w-8 h-8 ${sessionType === 'in-person' ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">In-Person</h3>
                    <p className="text-sm text-gray-600 mb-2">Recommended for best results</p>
                    <p className="text-xs text-gray-500">Meet face-to-face at a physical location</p>
                    {sessionType === 'in-person' && (
                        <div className="mt-3 flex items-center justify-center">
                            <Check className="w-5 h-5 text-blue-600" />
                        </div>
                    )}
                </button>
                
                <button
                    onClick={() => onSelect('sessionType', 'virtual')}
                    className={`p-6 border-2 rounded-lg transition-all ${
                        sessionType === 'virtual'
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                    <div className="flex items-center justify-center mb-3">
                        <Video className={`w-8 h-8 ${sessionType === 'virtual' ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Virtual</h3>
                    <p className="text-sm text-gray-600 mb-2">Online video meeting</p>
                    <p className="text-xs text-gray-500">Join from anywhere via video call</p>
                    {sessionType === 'virtual' && (
                        <div className="mt-3 flex items-center justify-center">
                            <Check className="w-5 h-5 text-blue-600" />
                        </div>
                    )}
                </button>
            </div>
            <div className="flex justify-between mt-8">
                <button 
                    onClick={onBack} 
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 flex items-center"
                >
                    <ArrowLeft className="inline w-4 h-4 mr-2" /> Back
                </button>
                <button 
                    onClick={onNext} 
                    disabled={!sessionType}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                >
                    Next <ArrowRight className="inline w-4 h-4 ml-2" />
                </button>
            </div>
        </div>
    );
};

const ReviewAndConfirmStep = ({ onBack, bookingDetails, onSubmit, isProcessing }) => {
    const { service, subject, gradeLevel, goals, date, time, tutor, sessionType } = bookingDetails;
    const isConsultation = service?.id === 'consult';
    
    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-6">6. Review & Confirm</h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <div>
                    <p className="text-sm text-gray-500">SERVICE</p>
                    <p className="font-bold text-lg">{service?.name}</p>
                </div>
                <hr/>
                <div>
                    <p className="text-sm text-gray-500">DETAILS</p>
                    <p className="font-semibold">{subject}{gradeLevel ? ` - Grade ${gradeLevel}` : ''}</p>
                    <p className="text-sm text-gray-600 mt-1">{goals}</p>
                </div>
                <hr/>
                <div>
                    <p className="text-sm text-gray-500">WHEN</p>
                    <p className="font-semibold">{date?.toDateString()} at {time}</p>
                </div>
                <hr/>
                <div>
                    <p className="text-sm text-gray-500">TUTOR</p>
                    <p className="font-semibold">{tutor?.name || 'Tutor TBD'}</p>
                </div>
                <hr/>
                <div>
                    <p className="text-sm text-gray-500">SESSION TYPE</p>
                    <p className="font-semibold capitalize">{sessionType === 'virtual' ? 'Virtual (Video Call)' : 'In-Person'}</p>
                </div>
            </div>
            <div className="flex justify-between mt-8">
                <button 
                    onClick={onBack} 
                    disabled={isProcessing}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    <ArrowLeft className="inline w-4 h-4 mr-2" /> Back
                </button>
                <button 
                    onClick={onSubmit}
                    disabled={isProcessing}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                    {isProcessing ? 'Processing...' : isConsultation ? 'Confirm & Book (Free Consultation)' : `Confirm & Book for $${service?.price.toFixed(2)}`}
                </button>
            </div>
        </div>
    );
};

// --- Appointments Page Main Component ---
export default function AppointmentPage() {
    const { user, isAuthenticated, refreshUser } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [selectedChildId, setSelectedChildId] = useState(null);
    const [children, setChildren] = useState([]);

    // Redirect admins to admin booking management page
    // Redirect tutors to tutor appointments page
    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/admin-bookings', { replace: true });
            return;
        }
        if (user?.role === 'tutor') {
            navigate('/tutor-appointments', { replace: true });
            return;
        }
    }, [user, navigate]);

    // Handle paying for an existing booking
    const handlePayForExistingBooking = useCallback(async (bookingId) => {
        try {
            setIsProcessingBooking(true);
            setBookingError('');
            
            // Fetch the booking details
            const booking = await getBookingById(bookingId);
            
            if (!booking) {
                throw new Error('Booking not found');
            }
            
            // Check if payment is already processed
            if (booking.customerPayment?.status === 'paid' || booking.customerPayment?.status === 'succeeded') {
                toast.info('This booking has already been paid for.');
                navigate(user?.role === 'parent' ? '/parent-portal' : '/dashboard');
                return;
            }
            
            // Use the stored amount from booking, or fallback to service pricing
            let sessionPrice = booking.customerPayment?.amount;
            if (!sessionPrice || sessionPrice === 0) {
                // Fallback: Get price from membership plans or use defaults
                try {
                    const plans = await getAllMembershipPlans();
                    const perSessionPlan = plans.find(plan => plan.priceType === 'per_session');
                    if (perSessionPlan && perSessionPlan.price) {
                        sessionPrice = perSessionPlan.price;
                    }
                } catch (err) {
                    console.error('Failed to fetch membership plans, using default price:', err);
                }
                // Final fallback to service type defaults
                if (!sessionPrice || sessionPrice === 0) {
                    const servicePrices = {
                        'solo': 65,
                        'group': 229.99,
                        'consult': 0
                    };
                    sessionPrice = servicePrices[booking.serviceType] || 65;
                }
            }
            
            // Extract booking details and populate state
            const sessionDate = new Date(booking.sessionDate);
            const date = sessionDate;
            const time = sessionDate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            
            // Get gradeLevel from booking (now stored directly in booking model)
            let gradeLevel = booking.gradeLevel || '';
            // Fallback to student profile if not in booking
            if (!gradeLevel && booking.student?.studentProfile?.grade) {
                gradeLevel = booking.student.studentProfile.grade;
            }
            
            // Create service object based on booking serviceType with the correct price
            const serviceTypes = {
                'solo': { id: 'solo', name: 'Solo Session (1-week plan)', price: sessionPrice, duration: booking.duration || 60 },
                'group': { id: 'group', name: 'Group Sessions (3-4 students)', price: sessionPrice, duration: booking.duration || 90 },
                'consult': { id: 'consult', name: 'Consultation', price: 0, duration: booking.duration || 30 },
            };
            const service = serviceTypes[booking.serviceType] || serviceTypes['solo'];
            
            // Set booking details from existing booking
            setBookingDetails({
                service: service,
                subject: booking.subject || '',
                gradeLevel: gradeLevel,
                goals: booking.goals || '',
                date: date,
                time: time,
                tutor: booking.tutor || null,
                sessionType: booking.sessionType || 'in-person',
            });
            
            // Set the booking ID so we can proceed to payment
            setCreatedBookingId(booking._id || booking.id);
            
            // Switch to booking tab and jump to payment step
            setActiveTab('booking');
            setCurrentStep(7); // Jump to payment step (step 7)
            
            setIsProcessingBooking(false);
        } catch (error) {
            console.error('Failed to load booking for payment:', error);
            setBookingError(error.message || 'Failed to load booking details. Please try again.');
            setIsProcessingBooking(false);
        }
    }, [user, navigate]);

    // Check for childId and payForBooking in URL params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const childIdParam = params.get('childId');
        const bookingIdParam = params.get('bookingId');
        const payForBookingParam = params.get('payForBooking');
        
        if (childIdParam) {
            setSelectedChildId(childIdParam);
        }
        
        // Handle payForBooking flow
        if (payForBookingParam === 'true' && bookingIdParam) {
            handlePayForExistingBooking(bookingIdParam);
        }
    }, [handlePayForExistingBooking]);

    // Fetch children if user is a parent
    useEffect(() => {
        const fetchChildren = async () => {
            if (user?.role === 'parent' && isAuthenticated) {
                try {
                    const profileData = await getUserProfile();
                    if (profileData.children && profileData.children.length > 0) {
                        const childrenData = profileData.children.map(child => {
                            if (typeof child === 'object' && child.name) {
                                return child;
                            }
                            return { _id: child, name: 'Child', id: child };
                        });
                        setChildren(childrenData);
                        // If childId is in URL, use it; otherwise use first child
                        const params = new URLSearchParams(window.location.search);
                        const childIdParam = params.get('childId');
                        if (childIdParam) {
                            setSelectedChildId(childIdParam);
                        } else if (childrenData[0]) {
                            setSelectedChildId(childrenData[0]._id || childrenData[0].id);
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch children:', error);
                }
            }
        };
        fetchChildren();
    }, [user, isAuthenticated]);

    // Show access denied if admin or tutor somehow reaches this page
    if (user?.role === 'admin') {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-600">Admins should use the Booking Management page.</p>
                <button
                    onClick={() => navigate('/admin-bookings')}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                    Go to Booking Management
                </button>
            </div>
        );
    }
    
    const [activeTab, setActiveTab] = useState('booking');
    const [currentStep, setCurrentStep] = useState(1);
    const [bookingDetails, setBookingDetails] = useState({});
    const [tutors, setTutors] = useState([]);
    const [isLoadingTutors, setIsLoadingTutors] = useState(true);
    const [isProcessingBooking, setIsProcessingBooking] = useState(false);
    const [bookingError, setBookingError] = useState('');
    const [createdBookingId, setCreatedBookingId] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
    
    // Membership state
    const [membershipPlans, setMembershipPlans] = useState([]);
    const [currentUserMembership, setCurrentUserMembership] = useState(null);
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [sessionConfiguration, setSessionConfiguration] = useState(null);
    const [membershipFlowStep, setMembershipFlowStep] = useState('select'); // 'select', 'session-setup', 'subject-grade', 'schedule', 'tutor', 'payment', 'complete'
    const [membershipBookingDetails, setMembershipBookingDetails] = useState({});
    const [membershipCurrentStep, setMembershipCurrentStep] = useState(1); // For tracking progress through booking steps
    const [isProcessingMembership, setIsProcessingMembership] = useState(false);
    const [membershipError, setMembershipError] = useState('');

    // Fetch membership plans
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoadingPlans(true);
                const [plans, membership] = await Promise.all([
                    getAllMembershipPlans(),
                    isAuthenticated ? getCurrentMembership().catch(() => null) : Promise.resolve(null),
                ]);
                setMembershipPlans(plans || []);
                setCurrentUserMembership(membership);
            } catch (error) {
                console.error('Failed to fetch membership data:', error);
                setMembershipError('Failed to load membership plans. Please try again.');
            } finally {
                setIsLoadingPlans(false);
            }
        };
        fetchData();
    }, [isAuthenticated]);

    // Fetch tutors
    useEffect(() => {
        const fetchTutors = async () => {
            try {
                setIsLoadingTutors(true);
                const tutorsData = await getTutors();
                setTutors(tutorsData || []);
            } catch (error) {
                console.error('Failed to fetch tutors:', error);
                setTutors([]);
            } finally {
                setIsLoadingTutors(false);
            }
        };
        fetchTutors();
    }, []);

    // Fetch subjects from system config
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                setIsLoadingSubjects(true);
                const data = await getSubjects();
                setSubjects(data.subjects || []);
            } catch (error) {
                console.error('Failed to fetch subjects:', error);
                setSubjects([]);
            } finally {
                setIsLoadingSubjects(false);
            }
        };
        fetchSubjects();
    }, []);

    const handleSelect = (field, value) => setBookingDetails(prev => ({ ...prev, [field]: value }));
    const handleFormChange = (e) => setBookingDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const nextStep = () => setCurrentStep(prev => prev + 1);
    const prevStep = () => setCurrentStep(prev => prev - 1);

    // Membership booking handlers
    const handleMembershipSelect = (field, value) => setMembershipBookingDetails(prev => ({ ...prev, [field]: value }));
    const handleMembershipFormChange = (e) => setMembershipBookingDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const nextMembershipStep = () => setMembershipCurrentStep(prev => prev + 1);
    const prevMembershipStep = () => setMembershipCurrentStep(prev => prev - 1);

    // Handle booking submission
    const handleBookingSubmit = async () => {
        const { service, subject, gradeLevel, goals, date, time, tutor } = bookingDetails;
        const isConsultation = service?.id === 'consult';

        // Determine which student to book for
        // If parent and childId is set, use that; otherwise use the logged-in user
        const studentId = (user?.role === 'parent' && selectedChildId) 
            ? selectedChildId 
            : (user._id || user.id);

        // For consultations, skip payment and create booking directly
        if (isConsultation) {
            try {
                setIsProcessingBooking(true);
                setBookingError('');

                // Combine date and time
                const sessionDateTime = new Date(date);
                if (time) {
                    // Handle both "HH:MM AM/PM" and "HH:MM" formats
                    let timeStr = time;
                    if (time.includes('AM') || time.includes('PM')) {
                        const [timePart, period] = time.split(' ');
                        const [hours, minutes] = timePart.split(':');
                        let hour24 = parseInt(hours);
                        if (period === 'PM' && hour24 !== 12) hour24 += 12;
                        if (period === 'AM' && hour24 === 12) hour24 = 0;
                        sessionDateTime.setHours(hour24, parseInt(minutes));
                    } else {
                        const [hours, minutes] = time.split(':');
                        sessionDateTime.setHours(parseInt(hours), parseInt(minutes));
                    }
                }

                // Create booking data
                // For consultations, tutor can be optional or "any available"
                let tutorId = null;
                if (tutor && tutor._id) {
                    tutorId = tutor._id;
                } else if (tutor && tutor.id && tutor.id !== 'any') {
                    tutorId = tutor.id;
                }

                const bookingData = {
                    student: studentId,
                    tutor: tutorId,
                    subject: subject || 'General Consultation',
                    gradeLevel: bookingDetails.gradeLevel || null,
                    goals: goals || 'General consultation',
                    sessionDate: sessionDateTime.toISOString(),
                    duration: service.duration,
                    serviceType: service.id,
                    sessionType: bookingDetails.sessionType || 'in-person',
                };

                await createBooking(bookingData);
                
                // Success - show message and redirect
                toast.success('Consultation booked successfully!');
                if (user?.role === 'parent') {
                    navigate('/parent-portal');
                } else {
                    navigate('/dashboard');
                }
            } catch (error) {
                console.error('Failed to create booking:', error);
                setBookingError(error.message || 'Failed to book consultation. Please try again.');
            } finally {
                setIsProcessingBooking(false);
            }
        } else {
            // For paid services, create booking first, then show payment step
            try {
                setIsProcessingBooking(true);
                setBookingError('');

                // Combine date and time
                const sessionDateTime = new Date(date);
                if (time) {
                    // Handle both "HH:MM AM/PM" and "HH:MM" formats
                    let timeStr = time;
                    if (time.includes('AM') || time.includes('PM')) {
                        const [timePart, period] = time.split(' ');
                        const [hours, minutes] = timePart.split(':');
                        let hour24 = parseInt(hours);
                        if (period === 'PM' && hour24 !== 12) hour24 += 12;
                        if (period === 'AM' && hour24 === 12) hour24 = 0;
                        sessionDateTime.setHours(hour24, parseInt(minutes));
                    } else {
                        const [hours, minutes] = time.split(':');
                        sessionDateTime.setHours(parseInt(hours), parseInt(minutes));
                    }
                }

                // Create booking data
                let tutorId = null;
                if (tutor && tutor._id) {
                    tutorId = tutor._id;
                } else if (tutor && tutor.id && tutor.id !== 'any') {
                    tutorId = tutor.id;
                }

                const bookingData = {
                    student: studentId,
                    tutor: tutorId,
                    subject: subject || 'General',
                    gradeLevel: bookingDetails.gradeLevel || null,
                    goals: goals || 'General tutoring session',
                    sessionDate: sessionDateTime.toISOString(),
                    duration: service.duration,
                    serviceType: service.id,
                    sessionType: bookingDetails.sessionType || 'in-person',
                    price: service.price, // Include the service price
                };

                const booking = await createBooking(bookingData);
                const bookingId = booking._id || booking.id;
                
                if (!bookingId) {
                    throw new Error('Booking created but no ID returned. Please try again.');
                }
                
                console.log('Booking created successfully with ID:', bookingId);
                
                // Check if payment was requested from parent
                if (booking.customerPayment?.status === 'requested') {
                    // Payment request sent to parent, skip payment step
                    setIsProcessingBooking(false);
                    toast.success('Booking created! A payment request has been sent to your parent. The session will be confirmed once payment is received.');
                    if (user?.role === 'parent') {
                        navigate('/parent-portal');
                    } else {
                        navigate('/dashboard');
                    }
                    return;
                }
                
                setCreatedBookingId(bookingId);
                setIsProcessingBooking(false);
                
                // Move to payment step after state is set
                // Use setTimeout to ensure state update is processed
                setTimeout(() => {
                    nextStep();
                }, 100);
            } catch (error) {
                console.error('Failed to create booking:', error);
                setBookingError(error.message || 'Failed to create booking. Please try again.');
                setIsProcessingBooking(false);
            }
        }
    };

    // Handle payment completion
    const handlePaymentComplete = async (paymentResult) => {
        if (paymentResult.success) {
            // Payment successful, redirect to dashboard
            toast.success('Booking confirmed and payment processed successfully!');
            if (user?.role === 'parent') {
                navigate('/parent-portal');
            } else {
                navigate('/dashboard');
            }
        } else {
            setBookingError('Payment failed. Please try again.');
        }
    };

    // Handle consultation flow - skip review step
    const handleConsultationTutorNext = () => {
        const { service } = bookingDetails;
        if (service?.id === 'consult') {
            // For consultations, create booking directly after tutor selection
            handleBookingSubmit();
        } else {
            // For paid services, go to review step
            nextStep();
        }
    };

    // Membership plan selection handlers
    const handlePlanSelect = async (plan) => {
        if (!isAuthenticated) {
            toast.info('Please log in to select a membership plan');
            navigate('/login');
            return;
        }

        // Check if this is the current plan
        if (currentUserMembership?.plan === plan.name && currentUserMembership?.status === 'active') {
            toast.info('You are already subscribed to this plan');
            return;
        }

        setSelectedPlan(plan);
        setMembershipError('');

        // Reset membership booking details
        setMembershipBookingDetails({});
        setMembershipCurrentStep(1);

        // Cum Laude (free plan) doesn't need tutoring details - activate directly
        if (plan.name === 'Cum Laude') {
            // Activate free membership immediately
            handleFreeMembershipActivation(plan);
            return;
        }

        // If Summa Cum Laude, show session setup step first
        if (plan.name === 'Summa Cum Laude' && plan.sessionConfig) {
            setMembershipFlowStep('session-setup');
        } else {
            // For other paid plans, go to subject/grade selection
            setMembershipFlowStep('subject-grade');
        }
    };

    const handleSessionConfigurationChange = (config) => {
        setSessionConfiguration(config);
    };

    const handleSessionSetupNext = () => {
        // After session setup, go to subject/grade selection
        setMembershipFlowStep('subject-grade');
    };

    const handleMembershipSubjectNext = () => {
        // After subject/grade, go to schedule
        setMembershipFlowStep('schedule');
    };

    const handleMembershipScheduleNext = () => {
        // After schedule, go to tutor selection
        setMembershipFlowStep('tutor');
    };

    const handleMembershipTutorNext = async () => {
        // Create booking before going to payment step
        try {
            setIsProcessingMembership(true);
            setMembershipError('');

            // Determine which student to book for
            // Use selectedChildId if parent has selected a child, otherwise use the logged-in user
            const studentId = (user?.role === 'parent' && selectedChildId) 
                ? selectedChildId 
                : (user._id || user.id);

            // Combine date and time from membershipBookingDetails
            const sessionDateTime = new Date(membershipBookingDetails.date);
            if (membershipBookingDetails.time) {
                let timeStr = membershipBookingDetails.time;
                if (timeStr.includes('AM') || timeStr.includes('PM')) {
                    const [timePart, period] = timeStr.split(' ');
                    const [hours, minutes] = timePart.split(':');
                    let hour24 = parseInt(hours);
                    if (period === 'PM' && hour24 !== 12) hour24 += 12;
                    if (period === 'AM' && hour24 === 12) hour24 = 0;
                    sessionDateTime.setHours(hour24, parseInt(minutes));
                } else {
                    const [hours, minutes] = timeStr.split(':');
                    sessionDateTime.setHours(parseInt(hours), parseInt(minutes));
                }
            }

            // Get tutor ID
            let tutorId = null;
            if (membershipBookingDetails.tutor) {
                tutorId = membershipBookingDetails.tutor._id || membershipBookingDetails.tutor.id;
            }

            // Determine service type; price is computed on the server from plan + session configuration
            const serviceType = 'solo';

            // Create booking data
            const bookingData = {
                student: studentId,
                tutor: tutorId,
                subject: membershipBookingDetails.subject || 'General',
                gradeLevel: membershipBookingDetails.gradeLevel || null,
                goals: membershipBookingDetails.goals || 'Membership booking',
                sessionDate: sessionDateTime.toISOString(),
                duration: sessionConfiguration?.sessionDuration || 60,
                serviceType: serviceType,
                sessionType: membershipBookingDetails.sessionType || 'virtual',
                paymentPurpose: 'membership',
                membershipPlanId: selectedPlan._id,
                membershipSessionConfiguration: sessionConfiguration || null,
            };

            const booking = await createBooking(bookingData);
            const bookingId = booking._id || booking.id;
            
            if (!bookingId) {
                throw new Error('Booking created but no ID returned. Please try again.');
            }

            // Store the booking ID for payment step
            setCreatedBookingId(bookingId);
            
            // Now go to payment step
        setMembershipFlowStep('payment');
        } catch (error) {
            console.error('Failed to create booking for membership:', error);
            setMembershipError(error.message || 'Failed to create booking. Please try again.');
        } finally {
            setIsProcessingMembership(false);
        }
    };

    // Handle free membership activation (Cum Laude)
    const handleFreeMembershipActivation = async (plan) => {
        try {
            setIsProcessingMembership(true);
            setMembershipError('');

            // Determine if parent is selecting for a child
            const targetStudentId = (user?.role === 'parent' && selectedChildId) ? selectedChildId : null;

            // Activate the free membership plan
            await selectMembershipPlan(plan._id, null, targetStudentId);

            // Update local state
            setMembershipFlowStep('complete');
            
            // Refresh user data to sync membership with linked accounts
            try {
                if (isAuthenticated && refreshUser) {
                    await refreshUser();
                }
                // Try to get updated membership, but don't fail if it errors
                try {
                const updatedMembership = await getCurrentMembership();
                setCurrentUserMembership(updatedMembership);
                } catch (membershipError) {
                    console.warn('Could not fetch updated membership:', membershipError);
                    // Don't throw - membership was still activated
                }
            } catch (refreshError) {
                console.warn('Could not refresh user:', refreshError);
                // Don't throw - membership was still activated
            }

            // Show success message
            const targetName = targetStudentId 
                ? children.find(c => (c._id || c.id) === targetStudentId)?.name || 'selected child'
                : 'your account';
            toast.success(`Cum Laude membership activated successfully for ${targetName}! The membership has been synced with linked accounts.`);
            
            // Reset after a moment - use navigate instead of reload to avoid errors
            setTimeout(() => {
                setSelectedPlan(null);
                setSessionConfiguration(null);
                setMembershipFlowStep('select');
                // Reload membership plans instead of full page reload
                getAllMembershipPlans()
                    .then(setMembershipPlans)
                    .catch(err => console.error('Error reloading plans:', err));
            }, 2000);
        } catch (error) {
            console.error('Failed to activate free membership:', error);
            setMembershipError(error.message || 'Failed to activate membership. Please try again.');
        } finally {
            setIsProcessingMembership(false);
        }
    };

    const handleMembershipPaymentComplete = async (paymentData) => {
        if (!selectedPlan) return;

        try {
            setIsProcessingMembership(true);
            setMembershipError('');

            // Membership is activated server-side after Stripe reports success (webhook or confirm); do not call select here.

            // Update local state
            setMembershipFlowStep('complete');
            
            // Refresh user data to sync membership with linked accounts
            try {
                if (isAuthenticated && refreshUser) {
                    await refreshUser();
                }
                // Try to get updated membership, but don't fail if it errors
                try {
                const updatedMembership = await getCurrentMembership();
                setCurrentUserMembership(updatedMembership);
                } catch (membershipError) {
                    console.warn('Could not fetch updated membership:', membershipError);
                    // Don't throw - membership was still activated
                }
            } catch (refreshError) {
                console.warn('Could not refresh user:', refreshError);
                // Don't throw - membership was still activated
            }

            // Show success message
            const targetName = targetStudentId 
                ? children.find(c => (c._id || c.id) === targetStudentId)?.name || 'selected child'
                : 'your account';
            toast.success(`${selectedPlan.name} membership activated successfully for ${targetName}! The membership has been synced with linked accounts.`);
            
            // Reset after a moment - reload membership plans instead of full page reload
            setTimeout(() => {
                setSelectedPlan(null);
                setSessionConfiguration(null);
                setMembershipFlowStep('select');
                // Reload membership plans instead of full page reload
                getAllMembershipPlans()
                    .then(setMembershipPlans)
                    .catch(err => console.error('Error reloading plans:', err));
            }, 2000);
        } catch (error) {
            console.error('Failed to select membership plan:', error);
            setMembershipError(error.message || 'Failed to activate membership plan. Please try again.');
        } finally {
            setIsProcessingMembership(false);
        }
    };

    const handleBackToPlanSelection = () => {
        setSelectedPlan(null);
        setSessionConfiguration(null);
        setMembershipFlowStep('select');
        setMembershipError('');
    };

    const renderBookingStep = () => {
        const isConsultation = bookingDetails.service?.id === 'consult';
        const totalSteps = isConsultation ? 6 : 7;
        
        switch (currentStep) {
            case 1: return <ServiceSelectionStep onSelect={handleSelect} onNext={nextStep} bookingDetails={bookingDetails} />;
            case 2: return <SubjectAndGoalsStep onNext={nextStep} onBack={prevStep} onFormChange={handleFormChange} bookingDetails={bookingDetails} subjects={subjects} />;
            case 3: return <ScheduleStep onSelect={handleSelect} onNext={nextStep} onBack={prevStep} bookingDetails={bookingDetails} />;
            case 4: return <TutorPreferenceStep onSelect={handleSelect} onNext={isConsultation ? handleConsultationTutorNext : nextStep} onBack={prevStep} bookingDetails={bookingDetails} tutors={tutors} isLoading={isLoadingTutors} user={user} subject={bookingDetails.subject} />;
            case 5: return <SessionTypeStep onSelect={handleSelect} onNext={nextStep} onBack={prevStep} bookingDetails={bookingDetails} />;
            case 6: return <ReviewAndConfirmStep onBack={prevStep} bookingDetails={bookingDetails} onSubmit={handleBookingSubmit} isProcessing={isProcessingBooking} />;
            case 7: 
                if (!isConsultation) {
                    if (createdBookingId) {
                        // Get session price dynamically - prefer from service, fallback to membership plan
                        let sessionPrice = bookingDetails.service?.price || 0;
                        if (sessionPrice === 0 || !sessionPrice) {
                            // Fetch from membership plans if not available
                            getAllMembershipPlans().then(plans => {
                                const perSessionPlan = plans.find(plan => plan.priceType === 'per_session');
                                if (perSessionPlan && perSessionPlan.price) {
                                    sessionPrice = perSessionPlan.price;
                                    // Update service price if it wasn't set
                                    if (!bookingDetails.service?.price) {
                                        setBookingDetails(prev => ({
                                            ...prev,
                                            service: {
                                                ...prev.service,
                                                price: sessionPrice
                                            }
                                        }));
                                    }
                                }
                            }).catch(err => console.error('Failed to fetch session price:', err));
                        }
                        
                        // Get the correct price - use stored amount from booking if available, otherwise use service price
                        const paymentPrice = bookingDetails.service?.price || sessionPrice || 65;
                        
                        return (
                            <PaymentStep
                                bookingId={createdBookingId}
                                plan={{ 
                                    name: bookingDetails.service?.name || 'Tutoring Session',
                                    price: paymentPrice,
                                    priceType: 'per_session'
                                }}
                                sessionConfiguration={null}
                                bookingDetails={bookingDetails}
                                onBack={() => {
                                    // If we came from payForBooking, go back to dashboard/parent portal instead
                                    const params = new URLSearchParams(window.location.search);
                                    if (params.get('payForBooking') === 'true') {
                                        navigate(user?.role === 'parent' ? '/parent-portal' : '/dashboard');
                                    } else {
                                        prevStep();
                                    }
                                }}
                                onComplete={handlePaymentComplete}
                            />
                        );
                    } else {
                        // Booking ID not set - this shouldn't happen, but handle gracefully
                        return (
                            <div className="text-center py-8">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                                    <h3 className="text-lg font-semibold text-red-800 mb-2">Payment Setup Error</h3>
                                    <p className="text-red-700 mb-4">
                                        {bookingError || 'Failed to create booking. Please go back and try again.'}
                                    </p>
                                    <button
                                        onClick={() => {
                                            const params = new URLSearchParams(window.location.search);
                                            if (params.get('payForBooking') === 'true') {
                                                navigate(user?.role === 'parent' ? '/parent-portal' : '/dashboard');
                                            } else {
                                                prevStep();
                                            }
                                        }}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
                                    >
                                        Go Back
                                    </button>
                                </div>
                            </div>
                        );
                    }
                }
                return <p>Thank you for booking!</p>;
            default: return <p>Thank you for booking!</p>;
        }
    };
    
    return (
        <div className="bg-gray-100 min-h-screen font-sans p-8">
            <header className="mb-8"><h1 className="text-3xl font-bold text-gray-800">Appointments & Memberships</h1><p className="text-gray-600">Schedule your sessions or manage your membership plan.</p></header>
            
            <div className="flex justify-center border-b mb-8"><div className="flex items-center bg-gray-200 rounded-lg p-1">
                <button onClick={() => {
                    setActiveTab('booking');
                    // Reset booking state when switching to booking tab
                    setCurrentStep(1);
                    setBookingDetails({});
                    setCreatedBookingId(null);
                    setBookingError('');
                }} className={`px-6 py-2 rounded-md text-sm font-semibold ${activeTab === 'booking' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>Booking</button>
                <button onClick={() => setActiveTab('membership')} className={`px-6 py-2 rounded-md text-sm font-semibold ${activeTab === 'membership' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>Membership Plans</button>
            </div></div>

            {activeTab === 'booking' && (
                <Card className="max-w-4xl mx-auto">
                    {/* Show child selector if user is a parent */}
                    {user?.role === 'parent' && children.length > 0 && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <label htmlFor="child-select" className="block text-sm font-medium text-gray-700 mb-2">
                                Booking for:
                            </label>
                            <select
                                id="child-select"
                                value={selectedChildId || ''}
                                onChange={(e) => setSelectedChildId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {children.map(child => (
                                    <option key={child._id || child.id} value={child._id || child.id}>
                                        {child.name || 'Child'}
                                    </option>
                                ))}
                            </select>
                            {selectedChildId && (
                                <p className="text-xs text-gray-500 mt-2">
                                    You are booking a session for {children.find(c => (c._id || c.id) === selectedChildId)?.name || 'selected child'}.
                                </p>
                            )}
                        </div>
                    )}
                    <BookingProgressTracker 
                        currentStep={currentStep} 
                        totalSteps={bookingDetails.service?.id === 'consult' ? 6 : 7}
                        steps={bookingDetails.service?.id === 'consult'
                            ? ['Service', 'Details', 'Schedule', 'Tutor', 'Session Type', 'Confirm']
                            : ['Service', 'Details', 'Schedule', 'Tutor', 'Session Type', 'Confirm', 'Payment']}
                    />
                    <hr className="my-8" />
                    {bookingError && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-600">{bookingError}</p>
                        </div>
                    )}
                    {renderBookingStep()}
                </Card>
            )}

            {activeTab === 'membership' && (
                <div>
                    {membershipFlowStep === 'select' && (
                        <>
                            {/* Show child selector if user is a parent */}
                            {user?.role === 'parent' && children.length > 0 && (
                                <Card className="max-w-4xl mx-auto mb-6">
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <label htmlFor="membership-child-select" className="block text-sm font-medium text-gray-700 mb-2">
                                            Change membership for:
                                        </label>
                                        <select
                                            id="membership-child-select"
                                            value={selectedChildId || ''}
                                            onChange={(e) => setSelectedChildId(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {children.map(child => (
                                                <option key={child._id || child.id} value={child._id || child.id}>
                                                    {child.name || 'Child'}
                                                </option>
                                            ))}
                                        </select>
                                        {selectedChildId && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                You are changing the membership plan for {children.find(c => (c._id || c.id) === selectedChildId)?.name || 'selected child'}. The membership will be synced to your account as well.
                                            </p>
                                        )}
                                    </div>
                                </Card>
                            )}
                            {isLoadingPlans ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Loading membership plans...</p>
                                </div>
                            ) : membershipError ? (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                    <p className="text-red-600">{membershipError}</p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="mt-4 text-blue-600 hover:underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                                    {membershipPlans.map(plan => {
                                        const isCurrentPlan = currentUserMembership?.plan === plan.name && 
                                                           currentUserMembership?.status === 'active';
                                        return (
                                            <Card 
                                                key={plan._id || plan.name} 
                                                className={`flex flex-col relative ${isCurrentPlan ? 'border-2 border-blue-500' : ''} ${plan.isFeatured ? 'relative' : ''}`}
                                            >
                                                {plan.isFeatured && (
                                                    <div className="absolute top-0 -right-4 bg-yellow-400 text-gray-800 font-bold px-4 py-1 rounded-full text-sm transform rotate-12 z-10">
                                                        <Star className="w-4 h-4 inline-block mr-1 -mt-1" />
                                                        Best Value
                                                    </div>
                                                )}
                                                <div className="text-center mb-4">
                                                    <h3 className="text-2xl font-bold text-gray-800">{plan.name}</h3>
                                                    <p className="text-gray-500">{plan.subtitle}</p>
                                                </div>
                                                <div className="text-center my-4">
                                                    <span className="text-4xl font-bold">{plan.priceDisplay}</span>
                                                    {plan.name === 'Summa Cum Laude' && plan.sessionConfig?.additionalSessionOptions?.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="text-sm text-gray-500">Extended options:</p>
                                                            <p className="text-lg font-semibold text-blue-600">
                                                                $389.99/mo
                                                            </p>
                                                            <p className="text-xs text-gray-500">(8 hours/month)</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <ul className="space-y-3 my-4 flex-grow">
                                                    {plan.features.map((feature, idx) => (
                                                        <li key={idx} className="flex items-start">
                                                            <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-1" />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <button
                                                    disabled={isCurrentPlan || isProcessingMembership}
                                                    onClick={() => handlePlanSelect(plan)}
                                                    className={`w-full py-2 mt-4 rounded-lg font-semibold ${
                                                        isCurrentPlan 
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    } ${isProcessingMembership ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {isCurrentPlan ? 'Your Current Plan' : 'Select Plan'}
                                                </button>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {membershipFlowStep === 'session-setup' && selectedPlan && (
                        <Card className="max-w-4xl mx-auto">
                            <BookingProgressTracker 
                                currentStep={1} 
                                totalSteps={5}
                                steps={['Plan', 'Subject', 'Schedule', 'Tutor', 'Payment']}
                            />
                            <hr className="my-8" />
                            <SessionSetupStep
                                plan={selectedPlan}
                                onNext={handleSessionSetupNext}
                                onBack={handleBackToPlanSelection}
                                selectedConfiguration={sessionConfiguration}
                                onConfigurationChange={handleSessionConfigurationChange}
                            />
                        </Card>
                    )}

                    {membershipFlowStep === 'subject-grade' && selectedPlan && (
                        <Card className="max-w-4xl mx-auto">
                            <BookingProgressTracker 
                                currentStep={selectedPlan.name === 'Summa Cum Laude' ? 2 : 1} 
                                totalSteps={selectedPlan.name === 'Summa Cum Laude' ? 5 : 4}
                                steps={selectedPlan.name === 'Summa Cum Laude' 
                                    ? ['Plan', 'Subject', 'Schedule', 'Tutor', 'Payment']
                                    : ['Plan', 'Subject', 'Schedule', 'Tutor', 'Payment']}
                            />
                            <hr className="my-8" />
                            <SubjectAndGoalsStep
                                subjects={subjects}
                                onNext={handleMembershipSubjectNext}
                                onBack={() => {
                                    if (selectedPlan.name === 'Summa Cum Laude') {
                                        setMembershipFlowStep('session-setup');
                                    } else {
                                        handleBackToPlanSelection();
                                    }
                                }}
                                onFormChange={handleMembershipFormChange}
                                bookingDetails={membershipBookingDetails}
                            />
                        </Card>
                    )}

                    {membershipFlowStep === 'schedule' && selectedPlan && (
                        <Card className="max-w-4xl mx-auto">
                            <BookingProgressTracker 
                                currentStep={selectedPlan.name === 'Summa Cum Laude' ? 3 : 2} 
                                totalSteps={selectedPlan.name === 'Summa Cum Laude' ? 5 : 4}
                                steps={selectedPlan.name === 'Summa Cum Laude' 
                                    ? ['Plan', 'Subject', 'Schedule', 'Tutor', 'Payment']
                                    : ['Plan', 'Subject', 'Schedule', 'Tutor', 'Payment']}
                            />
                            <hr className="my-8" />
                            <ScheduleStep
                                onSelect={handleMembershipSelect}
                                onNext={handleMembershipScheduleNext}
                                onBack={() => setMembershipFlowStep('subject-grade')}
                                bookingDetails={membershipBookingDetails}
                            />
                        </Card>
                    )}

                    {membershipFlowStep === 'tutor' && selectedPlan && (
                        <Card className="max-w-4xl mx-auto">
                            <BookingProgressTracker 
                                currentStep={selectedPlan.name === 'Summa Cum Laude' ? 4 : 3} 
                                totalSteps={selectedPlan.name === 'Summa Cum Laude' ? 5 : 4}
                                steps={selectedPlan.name === 'Summa Cum Laude' 
                                    ? ['Plan', 'Subject', 'Schedule', 'Tutor', 'Payment']
                                    : ['Plan', 'Subject', 'Schedule', 'Tutor', 'Payment']}
                            />
                            <hr className="my-8" />
                            <TutorPreferenceStep user={user} subject={membershipBookingDetails.subject}
                                onSelect={handleMembershipSelect}
                                onNext={handleMembershipTutorNext}
                                onBack={() => setMembershipFlowStep('schedule')}
                                bookingDetails={membershipBookingDetails}
                                tutors={tutors}
                                isLoading={isLoadingTutors}
                            />
                        </Card>
                    )}

                    {membershipFlowStep === 'payment' && selectedPlan && (
                        <Card className="max-w-4xl mx-auto">
                            <BookingProgressTracker 
                                currentStep={selectedPlan.name === 'Summa Cum Laude' ? 5 : 4} 
                                totalSteps={selectedPlan.name === 'Summa Cum Laude' ? 5 : 4}
                                steps={selectedPlan.name === 'Summa Cum Laude' 
                                    ? ['Plan', 'Subject', 'Schedule', 'Tutor', 'Payment']
                                    : ['Plan', 'Subject', 'Schedule', 'Tutor', 'Payment']}
                            />
                            <hr className="my-8" />
                            <PaymentStep
                                plan={selectedPlan}
                                sessionConfiguration={sessionConfiguration}
                                bookingDetails={membershipBookingDetails}
                                bookingId={createdBookingId}
                                onBack={() => setMembershipFlowStep('tutor')}
                                onComplete={handleMembershipPaymentComplete}
                            />
                            {membershipError && (
                                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-600">{membershipError}</p>
                                </div>
                            )}
                        </Card>
                    )}

                    {membershipFlowStep === 'complete' && (
                        <Card className="max-w-2xl mx-auto text-center py-12">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold mb-2">Membership Activated!</h2>
                            <p className="text-gray-600">Your {selectedPlan?.name} membership has been successfully activated.</p>
                    </Card>
                    )}
                </div>
            )}
        </div>
    );
}
