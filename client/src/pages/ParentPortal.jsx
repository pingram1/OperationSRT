import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Bell, User, BarChart2, Calendar, DollarSign, BookOpen, Clock, Award, PlusCircle, Download, CheckCircle, Megaphone, ArrowRight, Users as UsersIcon, FileText, Eye, Trophy, MessageCircle } from 'lucide-react';

// --- Import the separate components ---
import ChildProfileCard from '../components/parent/ChildProfileCard.jsx';
import SessionSummary from '../components/parent/SessionSummary.jsx';
import { AchievementBadges } from '../components/parent/AchievementBadge.jsx';
import TutorCommunicationHub from '../components/parent/TutorCommunicationHub.jsx';
import Button from '../components/common/Button.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getUserProfile } from '../api/users.js';
import { getUserBookings } from '../api/bookings.js';
import { getUserAnnouncements } from '../api/announcements.js';
import { getStudentAchievements } from '../api/achievements.js';
import { getAllMembershipPlans } from '../api/memberships.js';
import { getTransactions } from '../api/financials.js';

// --- Reusable Components (can be moved to their own files) ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
const CardHeader = ({ icon: Icon, title, rightContent = null }) => (
    <div className="flex justify-between items-center mb-4 border-b pb-3"><div className="flex items-center"><Icon className="w-6 h-6 mr-3 text-blue-500" /><h3 className="font-semibold text-lg text-gray-800">{title}</h3></div>{rightContent}</div>
);



// --- Extracted BillingHistory Component ---
const BillingHistory = ({ billing }) => (
    <div>
        <h4 className="font-semibold text-gray-700 mb-3">Payment History</h4>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                    <tr>
                        <th className="px-6 py-3">Invoice #</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {billing.history.map((invoice) => (
                        <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{invoice.id}</td>
                            <td className="px-6 py-4">{invoice.date}</td>
                            <td className="px-6 py-4">${invoice.amount.toFixed(2)}</td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">
                                    <CheckCircle className="w-4 h-4 mr-1" />Paid
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button className="text-blue-600 hover:underline"><Download className="w-5 h-5" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);


// --- Announcements Card Component (matching Dashboard style) ---
const AnnouncementsCard = React.memo(({ announcements = [] }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <Card>
            <CardHeader icon={Megaphone} title="Announcements" />
            {announcements.length > 0 ? (
                <div className="space-y-3">
                    {announcements.slice(0, 3).map((announcement) => (
                        <div 
                            key={announcement._id} 
                            className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-lg hover:shadow-md transition-all"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-gray-800">{announcement.title}</h4>
                                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{formatDate(announcement.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-600">{announcement.message}</p>
                        </div>
                    ))}
                    {announcements.length > 3 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                            + {announcements.length - 3} more announcement{announcements.length - 3 !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
            ) : (
                <div className="text-center py-8">
                    <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No announcements at this time.</p>
                </div>
            )}
        </Card>
    );
});

// --- Parent Portal Main Component ---
export default function ParentPortal() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [parentData, setParentData] = useState(null);
    const [children, setChildren] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [selectedChildId, setSelectedChildId] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [sessionPrice, setSessionPrice] = useState(65); // Default to $65, will be fetched dynamically

    useEffect(() => {
        const fetchParentData = async () => {
            try {
                setIsLoading(true);
                const [profileData, bookingsData, announcementsData, membershipPlans] = await Promise.all([
                    getUserProfile(),
                    getUserBookings(),
                    getUserAnnouncements().catch(err => {
                        console.error('Failed to fetch announcements:', err);
                        return [];
                    }),
                    getAllMembershipPlans().catch(err => {
                        console.error('Failed to fetch membership plans:', err);
                        return [];
                    })
                ]);
                
                setParentData(profileData);
                
                // Fetch session price from membership plan with priceType 'per_session'
                if (membershipPlans && membershipPlans.length > 0) {
                    const perSessionPlan = membershipPlans.find(plan => plan.priceType === 'per_session');
                    if (perSessionPlan && perSessionPlan.price) {
                        setSessionPrice(perSessionPlan.price);
                    }
                }
                
                // Fetch children if they exist in the user's children array
                if (profileData.children && profileData.children.length > 0) {
                    // If children are populated objects, use them directly
                    const childrenData = profileData.children.map(child => {
                        if (typeof child === 'object' && child.name) {
                            return child;
                        }
                        // If it's just an ID reference, return a placeholder
                        return { _id: child, name: 'Child', id: child };
                    });
                    setChildren(childrenData);
                    if (childrenData[0]) {
                        setSelectedChildId(childrenData[0]._id || childrenData[0].id);
                    }
                }
                
                // Handle paginated response format from getUserBookings
                const bookings = bookingsData?.bookings || bookingsData || [];
                setBookings(Array.isArray(bookings) ? bookings : []);
                setAnnouncements(announcementsData || []);
            } catch (error) {
                console.error('Failed to fetch parent data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        if (user) {
            fetchParentData();
        }
    }, [user]);

    // Fetch achievements when selected child changes
    useEffect(() => {
        const fetchAchievements = async () => {
            if (!selectedChildId) {
                setAchievements([]);
                return;
            }
            
            try {
                const data = await getStudentAchievements(selectedChildId);
                setAchievements(data.achievements || []);
            } catch (error) {
                console.error('Failed to fetch achievements:', error);
                setAchievements([]);
            }
        };
        
        if (selectedChildId) {
            fetchAchievements();
        }
    }, [selectedChildId]);

    const selectedChild = useMemo(() => {
        if (!selectedChildId || !children.length) return null;
        return children.find(c => (c._id || c.id) === selectedChildId);
    }, [children, selectedChildId]);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart2 },
        { id: 'sessions', label: 'Session Summaries', icon: FileText },
        { id: 'achievements', label: 'Achievements', icon: Trophy },
        { id: 'communication', label: 'Tutor Communication', icon: MessageCircle },
        { id: 'academics', label: 'Academics', icon: BookOpen },
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'billing', label: 'Billing', icon: DollarSign },
    ];

    const formatDate = (dateString) => new Date(dateString).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' });

    // --- Tab Content Components ---

    const OverviewTab = ({ child }) => {
        if (!child) return <div className="text-center py-8 text-gray-500">No child selected.</div>;
        const childId = child._id || child.id;
        const childBookingsForTab = useMemo(() => {
            if (!child || !bookings.length) return [];
            const childIdStr = String(childId);
            return bookings.filter(b => {
                if (!b || !b.student) return false;
                if (typeof b.student === 'string') {
                    return String(b.student) === childIdStr;
                }
                if (typeof b.student === 'object') {
                    const studentId = b.student._id || b.student.id;
                    return studentId && String(studentId) === childIdStr;
                }
                return false;
            }).filter(b => b.status === 'scheduled' && new Date(b.sessionDate) > new Date())
            .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate))
            .slice(0, 5);
        }, [child, bookings, childId]);

        // Get payment requests for this child
        const paymentRequests = useMemo(() => {
            if (!child || !bookings.length) return [];
            const childIdStr = String(childId);
            return bookings.filter(b => {
                if (!b || !b.student) return false;
                if (typeof b.student === 'string') {
                    return String(b.student) === childIdStr;
                }
                if (typeof b.student === 'object') {
                    const studentId = b.student._id || b.student.id;
                    return studentId && String(studentId) === childIdStr;
                }
                return false;
            }).filter(b => 
                b.customerPayment?.status === 'requested' && 
                b.status === 'scheduled'
            ).sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
        }, [child, bookings, childId]);

        const handlePayForBooking = (booking) => {
            navigate(`/appointments?bookingId=${booking._id || booking.id}&payForBooking=true`);
        };

        return (
        <div className="space-y-6">
            <ChildProfileCard child={child} />
            
            {/* Payment Requests - Show prominently if any exist */}
            {paymentRequests.length > 0 && (
                <Card className="border-2 border-yellow-300 bg-yellow-50">
                    <CardHeader 
                        icon={DollarSign} 
                        title={`Payment Requests (${paymentRequests.length})`}
                        rightContent={
                            <span className="text-sm font-semibold text-yellow-800 bg-yellow-200 px-3 py-1 rounded-full">
                                Action Required
                            </span>
                        }
                    />
                    <p className="text-gray-700 mb-4">
                        {child.name || 'Your child'} has requested payment for {paymentRequests.length} session{paymentRequests.length !== 1 ? 's' : ''}. Please complete payment to confirm the booking{paymentRequests.length > 1 ? 's' : ''}.
                    </p>
                    <div className="space-y-3">
                        {paymentRequests.map(booking => {
                            const sessionDate = new Date(booking.sessionDate);
                            const formattedDate = sessionDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                            });
                            // Use the stored amount from booking, or fallback to service pricing
                            const amount = booking.customerPayment?.amount || (booking.duration ? (booking.duration / 60) * 65 : 65);
                            
                            return (
                                <div 
                                    key={booking._id || booking.id}
                                    className="p-4 bg-white border border-yellow-200 rounded-lg"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800">{booking.subject}</p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {booking.tutor?.name || 'Tutor TBD'} • {formattedDate}
                                            </p>
                                            <p className="text-sm font-medium text-yellow-800 mt-2">
                                                Amount: ${amount.toFixed(2)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handlePayForBooking(booking)}
                                            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                                        >
                                            Pay Now
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader 
                            icon={Calendar} 
                            title="Upcoming Sessions" 
                            rightContent={
                                <button 
                                    onClick={() => navigate(`/appointments?childId=${childId}`)}
                                    className="text-sm font-semibold text-blue-600 hover:underline flex items-center"
                                >
                                    Book Session <ArrowRight className="w-4 h-4 ml-1" />
                                </button>
                            } 
                        />
                        <div className="space-y-3">
                            {childBookingsForTab.length > 0 ? childBookingsForTab.map(session => {
                                const tutorName = session.tutor?.name || 'Tutor TBD';
                                const sessionDate = new Date(session.sessionDate);
                                const formattedDate = sessionDate.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                });
                                const isConsultation = session.serviceType === 'consult';
                                return (
                                    <div 
                                        key={session._id || session.id} 
                                        className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg hover:from-blue-50 hover:to-blue-100 transition-all border border-gray-200 hover:border-blue-300"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <p className="font-semibold text-gray-800">{session.subject}</p>
                                                {isConsultation && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Consultation</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">with {tutorName}</p>
                                            <p className="text-xs text-gray-400 mt-2 flex items-center">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {formattedDate}
                                            </p>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-8">
                                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No upcoming sessions.</p>
                                    <button
                                        onClick={() => navigate(`/appointments?childId=${childId}`)}
                                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center mx-auto"
                                    >
                                        Book a session <ArrowRight className="w-4 h-4 ml-1" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card>
                    
                    {/* Achievements */}
                    <Card>
                        <CardHeader 
                            icon={Trophy} 
                            title="Achievements" 
                            rightContent={
                                achievements.length > 0 && (
                                    <span className="text-sm text-gray-500">
                                        {achievements.length} earned
                                    </span>
                                )
                            } 
                        />
                        {achievements.length > 0 ? (
                            <AchievementBadges achievements={achievements} showDetails={false} />
                        ) : (
                            <div className="text-center py-8">
                                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">No achievements yet.</p>
                                <p className="text-xs text-gray-400 mt-1">Achievements unlock as sessions are completed.</p>
                            </div>
                        )}
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader icon={BarChart2} title="Quick Actions" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => navigate(`/progress-reports?childId=${childId}`)}
                                className="flex items-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                            >
                                <BarChart2 className="w-5 h-5 mr-3" />
                                <div className="text-left">
                                    <p className="font-semibold">View Progress Reports</p>
                                    <p className="text-xs text-blue-100">See detailed analytics</p>
                                </div>
                            </button>
                            <button
                                onClick={() => navigate(`/appointments?childId=${childId}`)}
                                className="flex items-center p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
                            >
                                <Calendar className="w-5 h-5 mr-3" />
                                <div className="text-left">
                                    <p className="font-semibold">Book New Session</p>
                                    <p className="text-xs text-green-100">Schedule tutoring</p>
                                </div>
                            </button>
                        </div>
                    </Card>
                </div>
                <div>
                    <AnnouncementsCard announcements={announcements} />
                </div>
            </div>
        </div>
    );
    };
    
    const AcademicsTab = ({ child }) => {
        if (!child) return <div className="text-center py-8 text-gray-500">No child selected.</div>;
        // Extract subjects from bookings for this child
        const childId = child._id || child.id;
        const subjects = [...new Set(
            bookings
                .filter(b => b.student && ((b.student._id || b.student.id) === childId || (typeof b.student === 'string' && b.student === childId)))
                .map(b => b.subject)
                .filter(Boolean)
        )];
        return (
        <Card>
            <CardHeader icon={BookOpen} title="Academic Performance" />
                {subjects.length > 0 ? (
                    <div className="space-y-4">
                        <p className="text-gray-500 mb-4">Academic performance data will be displayed here once available.</p>
                        <div className="space-y-2">
                            {subjects.map(subject => (
                                <div key={subject} className="p-3 bg-gray-50 rounded-lg">
                                    <p className="font-semibold">{subject}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-4">No academic data available yet.</p>
                )}
        </Card>
    );
    };

    const ScheduleTab = ({ child }) => {
        if (!child) return <div className="text-center py-8 text-gray-500">No child selected.</div>;
        const childId = child._id || child.id;
        const allChildBookings = useMemo(() => {
            if (!child || !bookings.length) return [];
            const childIdStr = String(childId);
            return bookings.filter(b => {
                if (!b || !b.student) return false;
                // Handle different student field formats
                if (typeof b.student === 'string') {
                    return String(b.student) === childIdStr;
                }
                if (typeof b.student === 'object') {
                    const studentId = b.student._id || b.student.id;
                    return studentId && String(studentId) === childIdStr;
                }
                return false;
            }).sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
        }, [child, bookings, childId]);

        const upcomingBookings = allChildBookings.filter(b => 
            b.status === 'scheduled' && new Date(b.sessionDate) > new Date()
        );
        const pastBookings = allChildBookings.filter(b => 
            b.status === 'completed' || new Date(b.sessionDate) < new Date()
        );

        return (
        <div className="space-y-6">
            <Card>
                <CardHeader 
                    icon={Calendar} 
                    title={`${child.name || 'Child'}'s Schedule`} 
                    rightContent={
                        <button 
                            onClick={() => navigate(`/appointments?childId=${childId}`)}
                            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                        >
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Book New Session
                        </button>
                    } 
                />
                <div className="space-y-6">
                    {upcomingBookings.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-4">Upcoming Sessions</h4>
                            <div className="space-y-3">
                                {upcomingBookings.map(session => {
                                    const sessionDate = new Date(session.sessionDate);
                                    const formattedDate = sessionDate.toLocaleDateString('en-US', { 
                                        weekday: 'long',
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                    });
                                    return (
                                        <div 
                                            key={session._id || session.id}
                                            className={`flex items-center justify-between p-4 rounded-lg border ${
                                                session.customerPayment?.status === 'requested' 
                                                    ? 'bg-yellow-50 border-yellow-200' 
                                                    : 'bg-blue-50 border-blue-200'
                                            }`}
                                        >
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">{session.subject}</p>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {session.tutor?.name || 'Tutor TBD'} • {session.duration} min
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {formattedDate}
                                                </p>
                                                {session.customerPayment?.status === 'requested' && (
                                                    <p className="text-xs text-yellow-700 mt-2 font-medium">
                                                        ⚠️ Payment pending - Please complete payment
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                    session.customerPayment?.status === 'requested'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {session.customerPayment?.status === 'requested' ? 'Payment Pending' : session.status}
                                            </span>
                                                {session.customerPayment?.status === 'requested' && (
                                                    <button
                                                        onClick={() => navigate(`/appointments?bookingId=${session._id || session.id}&payForBooking=true`)}
                                                        className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-all"
                                                    >
                                                        Pay Now
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {pastBookings.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-4">Past Sessions</h4>
                            <div className="space-y-3">
                                {pastBookings.slice(0, 5).map(session => {
                                    const sessionDate = new Date(session.sessionDate);
                                    const formattedDate = sessionDate.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                    });
                                    return (
                                        <div key={session._id || session.id}>
                                            <div 
                                                className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800">{session.subject}</p>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {session.tutor?.name || 'Tutor TBD'}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        {formattedDate}
                                                    </p>
                                                </div>
                                                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                                                    {session.status}
                                                </span>
                                            </div>
                                            {session.status === 'completed' && (
                                                <div className="mt-2">
                                                    <SessionSummary booking={session} showFullDetails={false} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {allChildBookings.length === 0 && (
                        <div className="text-center py-12">
                            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-2">No sessions scheduled yet.</p>
                            <button
                                onClick={() => navigate(`/appointments?childId=${childId}`)}
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center mx-auto"
                            >
                                Book a session <ArrowRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
    };

    const AchievementsTab = ({ child }) => {
        if (!child) return <div className="text-center py-8 text-gray-500">No child selected.</div>;
        const childId = child._id || child.id;
        const childAchievements = useMemo(() => {
            if (!achievements || !achievements.length) return [];
            return achievements.filter(a => 
                (a.student?._id || a.student?.id || a.student) === childId
            ).sort((a, b) => new Date(b.createdAt || b.earnedAt) - new Date(a.createdAt || a.earnedAt));
        }, [achievements, childId]);

        // Group achievements by category
        const groupedAchievements = useMemo(() => {
            const grouped = {};
            childAchievements.forEach(achievement => {
                const category = achievement.category || 'milestone';
                if (!grouped[category]) {
                    grouped[category] = [];
                }
                grouped[category].push(achievement);
            });
            return grouped;
        }, [childAchievements]);

        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader 
                        icon={Trophy} 
                        title="Achievements" 
                        rightContent={
                            childAchievements.length > 0 && (
                                <span className="text-sm text-gray-500">
                                    {childAchievements.length} total
                                </span>
                            )
                        } 
                    />
                    {childAchievements.length > 0 ? (
                        <div className="space-y-6">
                            {Object.entries(groupedAchievements).map(([category, achievements]) => (
                                <div key={category}>
                                    <h4 className="font-semibold text-gray-800 mb-4 capitalize">
                                        {category} Achievements ({achievements.length})
                                    </h4>
                                    <AchievementBadges achievements={achievements} showDetails={true} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-2">No achievements yet.</p>
                            <p className="text-sm text-gray-400">Achievements unlock as sessions are completed.</p>
                        </div>
                    )}
                </Card>
            </div>
        );
    };

    const CommunicationTab = ({ child }) => {
        if (!child) return <div className="text-center py-8 text-gray-500">No child selected.</div>;
        const childId = child._id || child.id;
        const childBookings = useMemo(() => {
            if (!child || !bookings.length) return [];
            const childIdStr = String(childId);
            return bookings.filter(b => {
                if (!b || !b.student) return false;
                if (typeof b.student === 'string') {
                    return String(b.student) === childIdStr;
                }
                if (typeof b.student === 'object') {
                    const studentId = b.student._id || b.student.id;
                    return studentId && String(studentId) === childIdStr;
                }
                return false;
            });
        }, [child, bookings, childId]);

        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader 
                        icon={MessageCircle} 
                        title="Tutor Communication" 
                        rightContent={
                            <p className="text-sm text-gray-500">
                                Connect with your child's tutors
                            </p>
                        } 
                    />
                    <TutorCommunicationHub child={child} bookings={childBookings} />
                </Card>
            </div>
        );
    };

    const SessionsTab = ({ child }) => {
        if (!child) return <div className="text-center py-8 text-gray-500">No child selected.</div>;
        const childId = child._id || child.id;
        const completedBookings = useMemo(() => {
            if (!child || !bookings.length) return [];
            return bookings.filter(b => 
                b.student && ((b.student._id || b.student.id) === childId || (typeof b.student === 'string' && b.student === childId))
            ).filter(b => b.status === 'completed')
            .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
        }, [child, bookings, childId]);

        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader 
                        icon={FileText} 
                        title="Session Summaries" 
                        rightContent={
                            <p className="text-sm text-gray-500">
                                {completedBookings.length} completed session{completedBookings.length !== 1 ? 's' : ''}
                            </p>
                        } 
                    />
                    {completedBookings.length > 0 ? (
                        <div className="space-y-6">
                            {completedBookings.map(session => {
                                const sessionDate = new Date(session.sessionDate);
                                const formattedDate = sessionDate.toLocaleDateString('en-US', { 
                                    weekday: 'long',
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                });
                                return (
                                    <div key={session._id || session.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-gray-800">{session.subject}</h4>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {session.tutor?.name || 'Tutor TBD'} • {session.duration} min
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-gray-700">{formattedDate}</p>
                                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full mt-1 inline-block">
                                                        Completed
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <SessionSummary booking={session} showFullDetails={true} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-2">No completed sessions yet.</p>
                            <p className="text-sm text-gray-400">Session summaries will appear here after sessions are completed.</p>
                        </div>
                    )}
                </Card>
            </div>
        );
    };

    const BillingTab = ({ child }) => {
        if (!child) return <div className="text-center py-8 text-gray-500">No child selected.</div>;
        const childId = child._id || child.id;
        const [transactions, setTransactions] = useState([]);
        const [loadingTransactions, setLoadingTransactions] = useState(false);
        
        // Fetch transactions for this child
        useEffect(() => {
            const fetchTransactions = async () => {
                if (!childId) return;
                try {
                    setLoadingTransactions(true);
                    const data = await getTransactions({ limit: 100, childId });
                    setTransactions(Array.isArray(data) ? data : []);
                } catch (error) {
                    console.error('Failed to fetch transactions:', error);
                    setTransactions([]);
                } finally {
                    setLoadingTransactions(false);
                }
            };
            fetchTransactions();
        }, [childId]);
        
        // Get bookings with payment requests for this child
        const paymentRequests = useMemo(() => {
            if (!child || !bookings.length) return [];
            const childIdStr = String(childId);
            return bookings.filter(b => {
                if (!b || !b.student) return false;
                if (typeof b.student === 'string') {
                    return String(b.student) === childIdStr;
                }
                if (typeof b.student === 'object') {
                    const studentId = b.student._id || b.student.id;
                    return studentId && String(studentId) === childIdStr;
                }
                return false;
            }).filter(b => 
                b.customerPayment?.status === 'requested' && 
                b.status === 'scheduled'
            ).sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
        }, [child, bookings, childId]);

        const handlePayForBooking = (booking) => {
            // Navigate to payment page with booking ID
            navigate(`/appointments?bookingId=${booking._id || booking.id}&payForBooking=true`);
        };

        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric',
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        };

        return (
        <Card>
            <CardHeader icon={DollarSign} title="Billing & Invoices" />
            <div className="space-y-6">
                {/* Pending Payment Requests */}
                {paymentRequests.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-4">Pending Payment Requests ({paymentRequests.length})</h4>
                        <div className="space-y-3">
                            {paymentRequests.map(booking => {
                                const sessionDate = new Date(booking.sessionDate);
                                const formattedDate = sessionDate.toLocaleDateString('en-US', { 
                                    weekday: 'long',
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                });
                                // Use the stored amount from booking, or fallback to service pricing
                                const amount = booking.customerPayment?.amount || (booking.duration ? (booking.duration / 60) * 65 : 65);
                                
                                return (
                                    <div 
                                        key={booking._id || booking.id}
                                        className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">{booking.subject}</p>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {booking.tutor?.name || 'Tutor TBD'} • {booking.duration} min
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {formattedDate}
                                                </p>
                                                <p className="text-sm font-medium text-yellow-800 mt-2">
                                                    Amount: ${amount.toFixed(2)}
                                                </p>
                </div>
                                            <button
                                                onClick={() => handlePayForBooking(booking)}
                                                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                                            >
                                                Pay Now
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                </div>
                )}
                
                {/* Payment History */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Payment History</h4>
                    {loadingTransactions ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-500 mt-2">Loading payment history...</p>
                        </div>
                    ) : transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3">Transaction ID</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Description</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Payment Method</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((txn) => (
                                        <tr key={txn.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-sm">{txn.id}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(txn.date)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {txn.description || (txn.booking ? `${txn.booking.subject} session` : 'Payment')}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                                                ${txn.amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${
                                                    txn.status === 'Completed' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : txn.status === 'Pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {txn.status === 'Completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                    {txn.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{txn.paymentMethod || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-4">No payment history yet.</p>
                    )}
                </div>
            </div>
        </Card>
    );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview': return <OverviewTab child={selectedChild} />;
            case 'sessions': return <SessionsTab child={selectedChild} />;
            case 'achievements': return <AchievementsTab child={selectedChild} />;
            case 'communication': return <CommunicationTab child={selectedChild} />;
            case 'academics': return <AcademicsTab child={selectedChild} />;
            case 'schedule': return <ScheduleTab child={selectedChild} />;
            case 'billing': return <BillingTab child={selectedChild} />;
            default: return null;
        }
    };

    if (isLoading) {
        return (
            <div className="font-sans">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Parent Portal</h1>
                    <p className="text-gray-600">Loading...</p>
                </header>
            </div>
        );
    }

    if (!parentData) {
        return (
            <div className="font-sans">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Parent Portal</h1>
                    <p className="text-red-600">Failed to load parent data.</p>
                </header>
            </div>
        );
    }

    return (
        <div className="font-sans">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Parent Portal</h1>
                <p className="text-gray-600">Welcome, {parentData.name || user?.name || 'Parent'}</p>
            </header>
            {children.length > 0 ? (
            <div className="mb-8">
                <label htmlFor="child-select" className="block text-sm font-medium text-gray-700 mb-2">Viewing Dashboard For:</label>
                    <select id="child-select" value={selectedChildId || ''} onChange={e => setSelectedChildId(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 w-full md:w-1/3 p-2.5">
                        {children.map(child => (
                            <option key={child._id || child.id} value={child._id || child.id}>
                                {child.name || 'Child'}
                            </option>
                        ))}
                </select>
            </div>
            ) : (
                <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800">No children linked to this account. Please contact support to add children.</p>
                </div>
            )}
            {selectedChild && (
                <>
            <nav className="flex space-x-2 md:space-x-4 border-b mb-8">
                {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center px-3 md:px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}><tab.icon className="w-5 h-5 mr-2" /> {tab.label}</button>))}
            </nav>
            <main>
                {renderTabContent()}
            </main>
                </>
            )}
            {!selectedChild && children.length > 0 && (
                <p className="text-center text-gray-500 py-8">Please select a child to view their information.</p>
            )}
        </div>
    );
}
