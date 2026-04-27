import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { 
    Calendar, Award, Sparkles, BrainCircuit, UserCheck, Users, Megaphone, 
    DollarSign, TrendingUp, Clock, AlertCircle, PlusCircle, BarChart3,
    BookOpen, Settings,     ArrowRight, CheckCircle, XCircle, Activity,
    Trophy, Zap, Target, Flame, Star, TrendingDown, X, ChevronRight, Wallet
} from 'lucide-react';
import { getUserBookings, getAllBookings, getTutorBookings, cancelBooking } from '../api/bookings.js';
import { getRemainingSessions } from '../api/memberships.js';
import { getUserAnnouncements } from '../api/announcements.js';
import { getAnalytics } from '../api/analytics.js';
import { getFinancialStats } from '../api/financials.js';
import { getAllUsers } from '../api/users.js';
import { generateStudyPlan, generatePracticeQuestions } from '../api/ai.js';
import { getAllChallenges } from '../api/challenges.js';
import { getTutorDashboardStats, getTutorStudents } from '../api/tutors.js';
import Modal from '../components/common/Modal.jsx';
import { isLearnToEarnEligibleFromUser } from '../utils/learnToEarn.js';
import { useToast } from '../components/common/Toast.jsx';
import { useConfirm } from '../components/common/ConfirmDialog.jsx';

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 transition-all duration-200 hover:shadow-lg ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ icon: Icon, title, rightContent = null, onClick = null }) => (
    <div className={`flex justify-between items-center mb-4 ${onClick ? 'cursor-pointer hover:text-blue-600' : ''}`} onClick={onClick}>
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-3 text-blue-500" />
            <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
        </div>
        {rightContent}
    </div>
);

// Stat Card Component
const StatCard = ({ title, value, change, icon: Icon, iconBgColor = 'bg-blue-100', iconColor = 'text-blue-600', onClick = null }) => (
    <Card className={`${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all' : ''}`} onClick={onClick}>
        <div className="flex items-center">
            <div className={`p-3 ${iconBgColor} rounded-lg mr-4`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-500">{title}</p>
                <div className="flex items-baseline">
                    <p className="text-2xl font-bold text-gray-800">{value}</p>
                    {change && (
                        <span className={`ml-2 text-sm font-semibold ${change.startsWith('+') ? 'text-green-500' : change.startsWith('-') ? 'text-red-500' : 'text-gray-500'}`}>
                            {change}
                        </span>
                    )}
                </div>
            </div>
        </div>
    </Card>
);

// --- AI Modal Component ---
const AIModal = ({ isOpen, onClose, title, content, isLoading, contentType }) => {
    if (!isOpen) return null;
    
    return (
        <Modal
            title={title}
            content={content}
            onClose={onClose}
            isLoading={isLoading}
            contentType={contentType}
        />
    );
};

// --- Student Dashboard Widgets ---

const StudentStatsCard = React.memo(({ user, challenges = [] }) => {
    const navigate = useNavigate();
    const learnToEarnOk = isLearnToEarnEligibleFromUser(user);
    const xp = user?.xp || 0;
    const level = user?.level || 1;
    const xpForNextLevel = level * 100;
    const xpProgress = ((xp % 100) / 100) * 100;
    const completedChallenges = challenges.filter(c => c.status === 'completed').length;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-sm font-medium">Level</p>
                        <p className="text-3xl font-bold mt-1">{level}</p>
                        <p className="text-blue-100 text-xs mt-2">XP: {xp} / {xpForNextLevel}</p>
                    </div>
                    <Trophy className="w-12 h-12 text-blue-200" />
                </div>
                <div className="mt-4 bg-blue-400/30 rounded-full h-2">
                    <div 
                        className="bg-white rounded-full h-2 transition-all duration-500" 
                        style={{ width: `${xpProgress}%` }}
                    />
                </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-purple-100 text-sm font-medium">XP Points</p>
                        <p className="text-3xl font-bold mt-1">{xp}</p>
                        <p className="text-purple-100 text-xs mt-2">Keep learning!</p>
                    </div>
                    <Zap className="w-12 h-12 text-purple-200" />
                </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => navigate('/challenges')}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-green-100 text-sm font-medium">Challenges</p>
                        <p className="text-3xl font-bold mt-1">{completedChallenges}</p>
                        <p className="text-green-100 text-xs mt-2">Completed</p>
                    </div>
                    <Award className="w-12 h-12 text-green-200" />
                </div>
            </Card>

            <Card
                className={`bg-gradient-to-br from-amber-500 to-orange-600 text-white cursor-pointer hover:scale-[1.02] transition-transform ${!learnToEarnOk ? 'opacity-90' : ''}`}
                onClick={() => navigate('/scholarship-fund')}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-amber-100 text-sm font-medium">Scholarship fund</p>
                        <p className="text-lg font-bold mt-1 leading-tight">Balance & payouts</p>
                        <p className="text-amber-100 text-xs mt-2">
                            {learnToEarnOk ? 'Learn-to-earn' : 'Add your school to unlock'}
                        </p>
                    </div>
                    <Wallet className="w-12 h-12 text-amber-200" />
                </div>
            </Card>
        </div>
    );
});

const UpcomingSessionsCard = React.memo(({ sessions = [], onPlanWeek, isPlanningWeek = false, onCancelSession = null, onRefresh = null }) => {
    const navigate = useNavigate();
    const toast = useToast();
    const confirm = useConfirm();
    const [cancellingId, setCancellingId] = React.useState(null);
    
    const handleCancel = async (session) => {
        const sessionDate = new Date(session.sessionDate);
        const now = new Date();
        const hoursUntilSession = (sessionDate - now) / (1000 * 60 * 60);
        const isWithin24Hours = hoursUntilSession < 24;
        
        const message = isWithin24Hours
            ? 'This session is less than 24 hours away. Cancelling now may result in a cancellation penalty. Are you sure you want to proceed?'
            : 'Are you sure you want to cancel this session? You can cancel penalty-free since it\'s more than 24 hours before the session.';
        
        const ok = await confirm({
            title: isWithin24Hours ? 'Cancel within 24 hours?' : 'Cancel session?',
            message,
            confirmLabel: 'Cancel session',
            cancelLabel: 'Keep session',
            danger: isWithin24Hours,
        });
        if (!ok) {
            return;
        }
        
        try {
            setCancellingId(session._id || session.id);
            const result = await cancelBooking(session._id || session.id);
            
            if (result.hasPenalty) {
                toast.warning(result.message);
            } else {
                toast.success(result.message);
            }
            
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error('Failed to cancel booking:', error);
            toast.error('Failed to cancel session: ' + (error.message || 'Please try again.'));
        } finally {
            setCancellingId(null);
        }
    };
    
    return (
        <Card>
            <CardHeader 
                icon={Calendar} 
                title="Upcoming Sessions" 
                rightContent={
                    <button 
                        onClick={onPlanWeek} 
                        disabled={isPlanningWeek}
                        className="flex items-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold hover:from-yellow-500 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-105" 
                        aria-label="Plan My Week"
                    >
                        {isPlanningWeek ? (
                            <>
                                <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin mr-2" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Plan My Week
                            </>
                        )}
                    </button>
                } 
            />
            <div className="space-y-3">
                {sessions.length > 0 ? sessions.map(session => {
                    const isConsultation = session.serviceType === 'consult';
                    const sessionDate = new Date(session.sessionDate);
                    const now = new Date();
                    const hoursUntilSession = (sessionDate - now) / (1000 * 60 * 60);
                    const isWithin24Hours = hoursUntilSession < 24;
                    const isCancelling = cancellingId === (session._id || session.id);
                    
                    const formattedDate = sessionDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                    });
                    
                    return (
                        <div 
                            key={session._id || session.id} 
                            className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg hover:from-blue-50 hover:to-blue-100 transition-all border border-gray-200 hover:border-blue-300"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="font-semibold text-gray-800">{session.subject || 'Session'}</p>
                                    {isConsultation && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Consultation</span>
                                    )}
                                    {isWithin24Hours && (
                                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium flex items-center">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            &lt; 24h
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    {session.tutor?.name ? (
                                        <p className="text-sm text-gray-600">with {session.tutor.name}</p>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">Tutor to be assigned</p>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-2 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formattedDate}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                {!isConsultation && (
                                    <button
                                        onClick={() => navigate(`/classroom?sessionId=${session._id || session.id}`)}
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md"
                                    >
                                        Join
                                    </button>
                                )}
                                <button
                                    onClick={() => handleCancel(session)}
                                    disabled={isCancelling}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md ${
                                        isWithin24Hours
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    title={isWithin24Hours ? 'Cancel (may incur penalty)' : 'Cancel (no penalty)'}
                                >
                                    {isCancelling ? (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <X className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No upcoming sessions.</p>
                        <button
                            onClick={() => navigate('/appointments')}
                            className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center mx-auto"
                        >
                            Book a session <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                )}
            </div>
        </Card>
    );
});

const LearningProgressCard = React.memo(({ subjects = [], onGeneratePractice, isGeneratingPractice = false, generatingSubject = null }) => {
    const navigate = useNavigate();
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-pink-500'];
    const getColor = (index) => colors[index % colors.length];
    
    // Calculate progress percentage (mock for now, could be based on actual data)
    const getProgress = (subject) => {
        // This could be calculated from actual session completion data
        return Math.floor(Math.random() * 40 + 40); // 40-80% for demo
    };

    return (
        <Card>
            <CardHeader 
                icon={Award} 
                title="Learning Progress"
                rightContent={
                    <button
                        onClick={() => navigate('/challenges')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                    >
                        View All <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                }
            />
            {subjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subjects.map((subject, index) => {
                        const progress = getProgress(subject);
                        const isGenerating = isGeneratingPractice && generatingSubject === subject;
                        
                        return (
                            <div 
                                key={subject} 
                                className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:border-blue-300 transition-all"
                            >
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="font-semibold text-gray-800">{subject}</span>
                                    <span className="text-xs font-medium text-gray-500">{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 h-3 rounded-full mb-4 overflow-hidden">
                                    <div 
                                        className={`${getColor(index)} h-3 rounded-full transition-all duration-500 relative`}
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/30 animate-pulse" />
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onGeneratePractice(subject)} 
                                    disabled={isGenerating}
                                    className="w-full flex items-center justify-center text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 font-semibold py-2 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <BrainCircuit className="w-4 h-4 mr-2" />
                                            Generate Practice
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No subjects tracked yet.</p>
                    <p className="text-sm text-gray-400 mb-4">Book a session to get started!</p>
                    <button
                        onClick={() => navigate('/appointments')}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center mx-auto"
                    >
                        Book a session <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            )}
        </Card>
    );
});

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

const QuickActionsCard = React.memo(() => {
    const navigate = useNavigate();
    const quickActions = [
        { icon: Calendar, label: 'Book Session', path: '/appointments', color: 'bg-blue-500 hover:bg-blue-600' },
        { icon: Trophy, label: 'Challenges', path: '/challenges', color: 'bg-purple-500 hover:bg-purple-600' },
        { icon: BookOpen, label: 'Resources', path: '/resources', color: 'bg-green-500 hover:bg-green-600' },
        { icon: BarChart3, label: 'Progress', path: '/dashboard', color: 'bg-orange-500 hover:bg-orange-600' },
    ];

    return (
        <Card>
            <CardHeader icon={Zap} title="Quick Actions" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                    <button
                        key={index}
                        onClick={() => navigate(action.path)}
                        className={`${action.color} text-white p-4 rounded-lg hover:scale-105 transition-all shadow-md hover:shadow-lg flex flex-col items-center justify-center space-y-2`}
                    >
                        <action.icon className="w-6 h-6" />
                        <span className="text-sm font-semibold text-center">{action.label}</span>
                    </button>
                ))}
            </div>
        </Card>
    );
});

// --- Schedule Prompt Banner (for students with remaining membership sessions) ---
const SchedulePromptBanner = ({ remainingSessions, onSchedule }) => {
    if (!remainingSessions) return null;
    const prompt = remainingSessions.students
        ? remainingSessions.students
        : (remainingSessions.promptSchedule ? [{ ...remainingSessions, studentName: 'you' }] : []);
    if (prompt.length === 0) return null;

    return (
        <Card className="border-2 border-blue-200 bg-blue-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">You have sessions left to schedule this month</h3>
                        <p className="text-sm text-gray-700 mt-1">
                            {prompt.length === 1
                                ? `${prompt[0].remaining} of ${prompt[0].sessionsAllowed} sessions remaining${prompt[0].studentName === 'you' ? '' : ` for ${prompt[0].studentName}`}.`
                                : `${prompt.length} child${prompt.length > 1 ? 'ren' : ''} have remaining sessions.`}
                            {' '}Book now to make the most of your membership.
                        </p>
                    </div>
                </div>
                <button
                    onClick={onSchedule}
                    className="flex-shrink-0 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Calendar className="w-5 h-5" />
                    Schedule Session{prompt.some(p => p.remaining > 1) ? 's' : ''}
                </button>
            </div>
        </Card>
    );
};

// --- Student Dashboard Component ---
const StudentDashboard = ({ 
    sessions = [], 
    subjects = [], 
    announcements = [],
    user,
    challenges = [],
    remainingSessions = null,
    onPlanWeek,
    onGeneratePractice,
    isPlanningWeek = false,
    isGeneratingPractice = false,
    generatingSubject = null
}) => {
    const navigate = useNavigate();
    return (
        <div className="space-y-6">
            {/* Schedule prompt for students with remaining membership sessions */}
            <SchedulePromptBanner 
                remainingSessions={remainingSessions} 
                onSchedule={() => navigate('/appointments')} 
            />
            {/* Student Stats */}
            <StudentStatsCard user={user} challenges={challenges} />
            
            {/* Quick Actions */}
            <QuickActionsCard />
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Sessions and Progress */}
                <div className="lg:col-span-2 space-y-6">
                    <UpcomingSessionsCard 
                        sessions={sessions}
                        onRefresh={async () => {
                            // Refresh bookings
                            try {
                                const response = await getUserBookings();
                                // Handle paginated response format
                                const bookings = response.bookings || response;
                                const upcoming = bookings
                                    .filter(b => {
                                        if (!b || !b.sessionDate) return false;
                                        const isScheduled = b.status === 'scheduled';
                                        const sessionDate = new Date(b.sessionDate);
                                        const now = new Date();
                                        const isFuture = sessionDate > now;
                                        return isScheduled && isFuture;
                                    })
                                    .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate))
                                    .slice(0, 5);
                                setSessions(upcoming);
                            } catch (error) {
                                console.error('Failed to refresh bookings:', error);
                            }
                        }} 
                        onPlanWeek={onPlanWeek}
                        isPlanningWeek={isPlanningWeek}
                    />
                    <LearningProgressCard 
                        subjects={subjects}
                        onGeneratePractice={onGeneratePractice}
                        isGeneratingPractice={isGeneratingPractice}
                        generatingSubject={generatingSubject}
                    />
                </div>
                
                {/* Right Column - Announcements */}
                <div className="space-y-6">
                    <AnnouncementsCard announcements={announcements} />
                </div>
            </div>
        </div>
    );
};

// --- Admin Dashboard (unchanged) ---
const AdminDashboard = ({ 
    announcements = [], 
    analytics = null, 
    financialStats = null, 
    recentBookings = [],
    totalUsers = 0,
    activeTutors = 0,
    isLoading = false
}) => {
    const navigate = useNavigate();

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        if (typeof amount === 'string') {
            const num = parseFloat(amount);
            return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `$${amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`;
    };

    const quickActions = [
        { icon: PlusCircle, label: 'Create Booking', path: '/admin-bookings', color: 'bg-blue-600' },
        { icon: Users, label: 'Manage Users', path: '/admin-panel', color: 'bg-green-600' },
        { icon: Megaphone, label: 'New Announcement', path: '/announcements', color: 'bg-purple-600' },
        { icon: BookOpen, label: 'Add Resource', path: '/content-management', color: 'bg-orange-600' },
        { icon: BarChart3, label: 'View Analytics', path: '/analytics', color: 'bg-indigo-600' },
        { icon: DollarSign, label: 'View Financials', path: '/financials', color: 'bg-emerald-600' },
    ];

    return (
        <div className="space-y-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={analytics?.metrics?.totalRevenue?.value !== undefined ? 
                        formatCurrency(analytics.metrics.totalRevenue.value) : 
                        (financialStats?.totalRevenue !== undefined ? formatCurrency(financialStats.totalRevenue) : '$0.00')}
                    change={analytics?.metrics?.totalRevenue?.change !== undefined ? 
                        `${analytics.metrics.totalRevenue.change >= 0 ? '+' : ''}${analytics.metrics.totalRevenue.change.toFixed(1)}%` : 
                        (financialStats?.totalRevenueChange || null)}
                    icon={DollarSign}
                    iconBgColor="bg-green-100"
                    iconColor="text-green-600"
                    onClick={() => navigate('/financials')}
                />
                <StatCard
                    title="Total Users"
                    value={totalUsers}
                    icon={Users}
                    iconBgColor="bg-blue-100"
                    iconColor="text-blue-600"
                    onClick={() => navigate('/admin-panel')}
                />
                <StatCard
                    title="Active Tutors"
                    value={activeTutors}
                    icon={UserCheck}
                    iconBgColor="bg-purple-100"
                    iconColor="text-purple-600"
                    onClick={() => navigate('/tutor-management')}
                />
                <StatCard
                    title="Pending Bookings"
                    value={Array.isArray(recentBookings) ? recentBookings.filter(b => b && b.status === 'scheduled').length : 0}
                    icon={Calendar}
                    iconBgColor="bg-orange-100"
                    iconColor="text-orange-600"
                    onClick={() => navigate('/admin-bookings')}
                />
            </div>

            {/* Second Row - Additional Metrics */}
            {analytics?.metrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard
                        title="Monthly Recurring Revenue"
                        value={financialStats?.mrr !== undefined ? formatCurrency(financialStats.mrr) : '$0.00'}
                        change={financialStats?.mrrChange || null}
                        icon={TrendingUp}
                        iconBgColor="bg-indigo-100"
                        iconColor="text-indigo-600"
                    />
                    <StatCard
                        title="Sessions Completed"
                        value={analytics.metrics.sessionsCompleted?.value ?? 0}
                        change={analytics.metrics.sessionsCompleted?.change !== undefined ? 
                            `${analytics.metrics.sessionsCompleted.change >= 0 ? '+' : ''}${analytics.metrics.sessionsCompleted.change.toFixed(1)}%` : 
                            null}
                        icon={CheckCircle}
                        iconBgColor="bg-pink-100"
                        iconColor="text-pink-600"
                    />
                    <StatCard
                        title="New Signups"
                        value={analytics.metrics.newSignups?.value ?? 0}
                        change={analytics.metrics.newSignups?.change !== undefined ? 
                            `${analytics.metrics.newSignups.change >= 0 ? '+' : ''}${analytics.metrics.newSignups.change.toFixed(1)}%` : 
                            null}
                        icon={Users}
                        iconBgColor="bg-teal-100"
                        iconColor="text-teal-600"
                    />
                    <StatCard
                        title="Active Subscriptions"
                        value={financialStats?.activeSubscriptions ?? 0}
                        change={financialStats?.activeSubscriptionsChange || null}
                        icon={Award}
                        iconBgColor="bg-purple-100"
                        iconColor="text-purple-600"
                    />
                </div>
            )}
            
            {/* Quick Actions */}
            <Card>
                <CardHeader icon={Activity} title="Quick Actions" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {quickActions.map((action, index) => (
                        <button
                            key={index}
                            onClick={() => navigate(action.path)}
                            className={`${action.color} text-white p-4 rounded-lg hover:opacity-90 transition-opacity flex flex-col items-center justify-center space-y-2`}
                        >
                            <action.icon className="w-6 h-6" />
                            <span className="text-sm font-semibold text-center">{action.label}</span>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Recent Bookings */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader 
                            icon={Calendar} 
                            title="Recent Bookings" 
                            rightContent={
                                <button 
                                    onClick={() => navigate('/admin-bookings')}
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                    View All <ArrowRight className="w-4 h-4 ml-1" />
                                </button>
                            }
                        />
                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-500 text-sm">Loading bookings...</p>
                            </div>
                        ) : Array.isArray(recentBookings) && recentBookings.length > 0 ? (
                            <div className="space-y-3">
                                {recentBookings.slice(0, 5).map((booking) => {
                                    if (!booking || !booking._id) return null;
                                    const statusColors = {
                                        scheduled: 'bg-blue-100 text-blue-800',
                                        completed: 'bg-green-100 text-green-800',
                                        cancelled: 'bg-red-100 text-red-800',
                                    };
                                    return (
                                        <div key={booking._id || booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium text-gray-800">{booking.subject || 'Session'}</p>
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                                                        {booking.status || 'scheduled'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    {booking.student?.name || 'Unknown'} 
                                                    {booking.tutor?.name && ` with ${booking.tutor.name}`}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">{formatDate(booking.sessionDate || booking.createdAt)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No recent bookings.</p>
                        )}
                    </Card>

                    {/* Announcements */}
                    <AnnouncementsCard announcements={announcements} />
                </div>

                {/* Right Column - System Status & Alerts */}
                <div className="space-y-6">
                    {/* System Status */}
                    <Card>
                        <CardHeader icon={Activity} title="System Status" />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Database</span>
                                <span className="flex items-center text-green-600">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Online
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">API Server</span>
                                <span className="flex items-center text-green-600">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Running
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Overdue Invoices</span>
                                <span className={`flex items-center ${financialStats?.overdueInvoices > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {financialStats?.overdueInvoices > 0 ? (
                                        <>
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {financialStats.overdueInvoices}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            None
                                        </>
                                    )}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Quick Links */}
                    <Card>
                        <CardHeader icon={Settings} title="Quick Links" />
                        <div className="space-y-2">
                            <button 
                                onClick={() => navigate('/analytics')}
                                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm font-medium text-gray-700">View Analytics</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </button>
                            <button 
                                onClick={() => navigate('/financials')}
                                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm font-medium text-gray-700">Financial Overview</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </button>
                            <button 
                                onClick={() => navigate('/system-config')}
                                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm font-medium text-gray-700">System Configuration</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </button>
                            <button 
                                onClick={() => navigate('/content-management')}
                                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm font-medium text-gray-700">Content Management</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </Card>

                    {/* Recent Activity Summary */}
                    {analytics && analytics.recentActivity && analytics.recentActivity.length > 0 && (
                        <Card>
                            <CardHeader icon={Clock} title="Recent Activity" />
                            <div className="space-y-2">
                                {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                                    <div key={index} className="text-sm text-gray-600 py-2 border-b last:border-0">
                                        <p className="font-medium text-gray-800">{activity.message}</p>
                                        {activity.amount != null && activity.amount > 0 && (
                                            <p className="text-xs text-green-600 mt-1">${activity.amount.toFixed(2)}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">{activity.timeAgo}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

const TutorDashboard = ({ 
    announcements = [], 
    stats = null,
    upcomingSessions = [],
    students = [],
    isLoading = false
}) => {
    const navigate = useNavigate();

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
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

    // Get today's sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = upcomingSessions.filter(session => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= today && sessionDate < tomorrow && session.status === 'scheduled';
    }).sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));

    // Get next 5 upcoming sessions
    const nextSessions = upcomingSessions
        .filter(s => s.status === 'scheduled' && new Date(s.sessionDate) > new Date())
        .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate))
        .slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Today's Sessions"
                    value={stats?.todaySessions || 0}
                    icon={Calendar}
                    iconBgColor="bg-blue-100"
                    iconColor="text-blue-600"
                    onClick={() => navigate('/tutor-appointments')}
                />
                <StatCard
                    title="Upcoming (7 days)"
                    value={stats?.upcomingSessions || 0}
                    icon={Clock}
                    iconBgColor="bg-purple-100"
                    iconColor="text-purple-600"
                    onClick={() => navigate('/tutor-appointments')}
                />
                <StatCard
                    title="Total Students"
                    value={stats?.totalStudents || 0}
                    icon={Users}
                    iconBgColor="bg-green-100"
                    iconColor="text-green-600"
                    onClick={() => navigate('/my-students')}
                />
                <StatCard
                    title="Completed Sessions"
                    value={stats?.completedSessions || 0}
                    icon={CheckCircle}
                    iconBgColor="bg-emerald-100"
                    iconColor="text-emerald-600"
                />
            </div>

            {/* Second Row - Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="This Week"
                    value={stats?.weekSessions || 0}
                    icon={TrendingUp}
                    iconBgColor="bg-indigo-100"
                    iconColor="text-indigo-600"
                />
                <StatCard
                    title="This Month"
                    value={stats?.monthSessions || 0}
                    icon={Calendar}
                    iconBgColor="bg-pink-100"
                    iconColor="text-pink-600"
                />
                <StatCard
                    title="Scheduled"
                    value={stats?.scheduledSessions || 0}
                    icon={Clock}
                    iconBgColor="bg-orange-100"
                    iconColor="text-orange-600"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Today's Schedule & Upcoming Sessions */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Today's Schedule */}
                    {todaySessions.length > 0 && (
                        <Card>
                            <CardHeader 
                                icon={Calendar} 
                                title="Today's Schedule" 
                                rightContent={
                                    <button 
                                                onClick={() => navigate('/tutor-appointments')}
                                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                            >
                                                View All <ArrowRight className="w-4 h-4 ml-1" />
                                            </button>
                                        }
                                    />
                                    <div className="space-y-3">
                                        {todaySessions.map(session => (
                                            <div 
                                                key={session._id} 
                                                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-gray-800">{session.subject}</p>
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-200 text-blue-800">
                                                            {formatTime(session.sessionDate)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        {session.student?.name || 'Unknown Student'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {session.goals || 'No specific goals'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => navigate(`/classroom?sessionId=${session._id}`)}
                                                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                                                >
                                                    Start Session
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                    {/* Upcoming Sessions */}
                    <Card>
                        <CardHeader 
                            icon={Calendar} 
                            title="Upcoming Sessions" 
                            rightContent={
                                <button 
                                    onClick={() => navigate('/tutor-appointments')}
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                    View All <ArrowRight className="w-4 h-4 ml-1" />
                                </button>
                            }
                        />
                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-500 text-sm">Loading sessions...</p>
                            </div>
                        ) : nextSessions.length > 0 ? (
                            <div className="space-y-3">
                                {nextSessions.map(session => {
                                    const sessionDate = new Date(session.sessionDate);
                                    const isToday = sessionDate.toDateString() === new Date().toDateString();
                                    
                                    return (
                                        <div 
                                            key={session._id} 
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium text-gray-800">{session.subject}</p>
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        isToday ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {isToday ? 'Today' : formatDate(session.sessionDate)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    {session.student?.name || 'Unknown Student'}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {formatTime(session.sessionDate)} • {session.duration} min
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No upcoming sessions.</p>
                        )}
                    </Card>

                    {/* Announcements */}
                    <AnnouncementsCard announcements={announcements} />
                </div>

                {/* Right Column - Student Roster & Quick Actions */}
                <div className="space-y-6">
                    {/* Student Roster */}
                    <Card>
                        <CardHeader 
                            icon={Users} 
                            title="My Students" 
                            rightContent={
                                <button 
                                    onClick={() => navigate('/my-students')}
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                    View All <ArrowRight className="w-4 h-4 ml-1" />
                                </button>
                            }
                        />
                        {students.length > 0 ? (
                            <div className="space-y-3">
                                {students.slice(0, 5).map(student => (
                                    <div 
                                        key={student._id || student.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/my-students?student=${student._id || student.id}`)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                                                {student.name?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm">{student.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {student.stats?.totalSessions || 0} sessions
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8 text-sm">No students yet.</p>
                        )}
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader icon={Activity} title="Quick Actions" />
                        <div className="space-y-2">
                            <button 
                                onClick={() => navigate('/tutor-appointments')}
                                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm font-medium text-gray-700">View All Sessions</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </button>
                            <button 
                                onClick={() => navigate('/my-students')}
                                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm font-medium text-gray-700">Manage Students</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </button>
                            <button 
                                onClick={() => navigate('/classroom')}
                                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm font-medium text-gray-700">Classroom</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </button>
                            <button 
                                onClick={() => navigate('/resources')}
                                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm font-medium text-gray-700">Resources</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </button>
                            <button 
                                onClick={() => navigate('/earnings')}
                                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm font-medium text-gray-700">View Earnings</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const ParentDashboard = ({ announcements = [], bookings = [], remainingSessions = null }) => {
    const navigate = useNavigate();
    
    // Get all payment requests across all children
    const paymentRequests = useMemo(() => {
        if (!bookings || !Array.isArray(bookings)) return [];
        return bookings.filter(b => 
            b.customerPayment?.status === 'requested' && 
            b.status === 'scheduled'
        ).sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
    }, [bookings]);

    const handlePayForBooking = (booking) => {
        navigate(`/appointments?bookingId=${booking._id || booking.id}&payForBooking=true`);
    };
    
    return (
        <div className="space-y-6">
            {/* Schedule prompt for children with remaining membership sessions */}
            <SchedulePromptBanner 
                remainingSessions={remainingSessions} 
                onSchedule={() => navigate('/appointments')} 
            />
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
                        Your child{paymentRequests.length > 1 ? 'ren have' : ' has'} requested payment for {paymentRequests.length} session{paymentRequests.length !== 1 ? 's' : ''}. Please complete payment to confirm the booking{paymentRequests.length > 1 ? 's' : ''}.
                    </p>
                    <div className="space-y-3">
                        {paymentRequests.slice(0, 3).map(booking => {
                            const sessionDate = new Date(booking.sessionDate);
                            const formattedDate = sessionDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                            });
                            const studentName = booking.student?.name || 'Your child';
                            const amount = booking.customerPayment?.amount || (booking.duration ? (booking.duration / 60) * 65 : 65);
                            
                            return (
                                <div 
                                    key={booking._id || booking.id}
                                    className="p-4 bg-white border border-yellow-200 rounded-lg"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800">
                                                {booking.subject} - {studentName}
                                            </p>
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
                    {paymentRequests.length > 3 && (
                        <button
                            onClick={() => navigate('/parent-portal?tab=billing')}
                            className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
                        >
                            View all {paymentRequests.length} payment requests <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                    )}
                </Card>
            )}

            {/* Announcements */}
            <AnnouncementsCard announcements={announcements} />
            
            {/* Quick Actions */}
            <Card>
                <CardHeader icon={Users} title="Parent Dashboard" />
                <p className="text-gray-600 mb-4">View your children's progress and schedule.</p>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/parent-portal')}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center"
                    >
                        <Users className="w-5 h-5 mr-2" />
                        Go to Parent Portal
                    </button>
                    <button
                        onClick={() => navigate('/appointments')}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center"
                    >
                        <Calendar className="w-5 h-5 mr-2" />
                        Book Session
                    </button>
                </div>
            </Card>
        </div>
    );
};

// --- Main Dashboard Page Component ---

export default function Dashboard() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // AI Modal state
    const [aiModal, setAiModal] = useState({ isOpen: false, title: '', content: '', isLoading: false, contentType: 'text' });
    
    // Admin-specific state
    const [analytics, setAnalytics] = useState(null);
    const [financialStats, setFinancialStats] = useState(null);
    const [recentBookings, setRecentBookings] = useState([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [activeTutors, setActiveTutors] = useState(0);
    const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
    
    // Tutor-specific state
    const [tutorStats, setTutorStats] = useState(null);
    const [tutorBookings, setTutorBookings] = useState([]);
    const [tutorStudents, setTutorStudents] = useState([]);
    const [isLoadingTutor, setIsLoadingTutor] = useState(true);
    
    // AI loading states
    const [isPlanningWeek, setIsPlanningWeek] = useState(false);
    const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);
    const [generatingSubject, setGeneratingSubject] = useState(null);
    
    // Remaining membership sessions (for students/parents with session-based plans)
    const [remainingSessions, setRemainingSessions] = useState(null);
    
    // Use ref to track if we've already fetched data to prevent re-fetching on user updates
    const hasFetchedRef = useRef(false);
    const userRoleRef = useRef(null);
    const userIdRef = useRef(null);
    const hasRefreshedUserRef = useRef(false);

    useEffect(() => {
        // Only fetch if user exists and either:
        // 1. We haven't fetched yet, OR
        // 2. The user role or ID has changed (user switched accounts)
        const userChanged = user && (userRoleRef.current !== user.role || userIdRef.current !== user._id);
        const shouldFetch = user && (!hasFetchedRef.current || userChanged);
        
        if (!shouldFetch) {
            return;
        }

        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                hasFetchedRef.current = true;
                userRoleRef.current = user.role;
                userIdRef.current = user._id;
                
                // Fetch announcements for all users
                try {
                    const userAnnouncements = await getUserAnnouncements();
                    setAnnouncements(userAnnouncements);
                } catch (error) {
                    console.error('Failed to fetch announcements:', error);
                }
                
                // Fetch bookings and remaining sessions for students and parents
                if (user && (user.role === 'student' || user.role === 'parent')) {
                    try {
                        const [bookingsResponse, remainingData] = await Promise.all([
                            getUserBookings(),
                            getRemainingSessions().catch(() => null),
                        ]);
                        const response = bookingsResponse;
                        // Handle paginated response format
                        const bookings = response.bookings || response;
                        // For parents, include all bookings (including payment requests)
                        // For students, filter for scheduled sessions that are in the future
                        let upcoming;
                        if (user.role === 'parent') {
                            // Parents see all scheduled bookings (including payment requests)
                            upcoming = Array.isArray(bookings) 
                                ? bookings.filter(b => b && b.status === 'scheduled')
                                    .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate))
                                : [];
                        } else {
                            // Students see only upcoming scheduled sessions (limited to 5)
                            upcoming = Array.isArray(bookings) ? bookings
                            .filter(b => {
                                if (!b || !b.sessionDate) return false;
                                const isScheduled = b.status === 'scheduled';
                                const sessionDate = new Date(b.sessionDate);
                                const now = new Date();
                                const isFuture = sessionDate > now;
                                return isScheduled && isFuture;
                            })
                            .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate))
                            .slice(0, 5) : [];
                        }
                        setSessions(upcoming);
                        setRemainingSessions(remainingData);
                    } catch (error) {
                        console.error('Failed to fetch bookings:', error);
                        setSessions([]);
                        setRemainingSessions(null);
                    }
                }
                
                // Fetch challenges for students
                if (user && user.role === 'student') {
                    try {
                        const challengesData = await getAllChallenges();
                        setChallenges(challengesData || []);
                    } catch (error) {
                        console.error('Failed to fetch challenges:', error);
                    }
                }

                // Fetch tutor-specific data
                if (user && user.role === 'tutor') {
                    setIsLoadingTutor(true);
                    try {
                        const [statsData, bookingsData, studentsData] = await Promise.all([
                            getTutorDashboardStats().catch(err => {
                                console.error('Failed to fetch tutor stats:', err);
                                return null;
                            }),
                            getTutorBookings().catch(err => {
                                console.error('Failed to fetch tutor bookings:', err);
                                return [];
                            }),
                            getTutorStudents().catch(err => {
                                console.error('Failed to fetch tutor students:', err);
                                return [];
                            }),
                        ]);

                        setTutorStats(statsData);
                        setTutorBookings(bookingsData || []);
                        setTutorStudents(studentsData || []);
                    } catch (error) {
                        console.error('Failed to fetch tutor dashboard data:', error);
                    } finally {
                        setIsLoadingTutor(false);
                    }
                }

                // Fetch admin-specific data (including super_admin)
                if (user && (user.role === 'admin' || user.role === 'super_admin')) {
                    setIsLoadingAdmin(true);
                    try {
                        const [analyticsData, financialData, bookingsData, usersData] = await Promise.all([
                            getAnalytics(30).catch(err => {
                                console.error('Failed to fetch analytics:', err);
                                return null;
                            }),
                            getFinancialStats().catch(err => {
                                console.error('Failed to fetch financial stats:', err);
                                return null;
                            }),
                            getAllBookings().catch(err => {
                                console.error('Failed to fetch bookings:', err);
                                return [];
                            }),
                            getAllUsers().catch(err => {
                                console.error('Failed to fetch users:', err);
                                return [];
                            }),
                        ]);

                        setAnalytics(analyticsData);
                        setFinancialStats(financialData);
                        
                        // Handle paginated response from getAllBookings
                        const bookingsArray = Array.isArray(bookingsData) 
                            ? bookingsData 
                            : (bookingsData?.bookings || []);
                        
                        const sortedBookings = bookingsArray
                            .filter(b => b && (b.sessionDate || b.createdAt))
                            .sort((a, b) => {
                                const dateA = new Date(b.sessionDate || b.createdAt);
                                const dateB = new Date(a.sessionDate || a.createdAt);
                                return dateA - dateB;
                            })
                            .slice(0, 10);
                        setRecentBookings(sortedBookings);
                        
                        setTotalUsers(Array.isArray(usersData) ? usersData.length : 0);
                        setActiveTutors(Array.isArray(usersData) ? usersData.filter(u => u && u.role === 'tutor' && u.tutorInfo?.status === 'active').length : 0);
                    } catch (error) {
                        console.error('Failed to fetch admin dashboard data:', error);
                    } finally {
                        setIsLoadingAdmin(false);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user?.role, user?._id]); // Only depend on role and id, not the entire user object
    
    // Reset tutor state when user changes
    useEffect(() => {
        if (user?.role !== 'tutor') {
            setTutorStats(null);
            setTutorBookings([]);
            setTutorStudents([]);
            setIsLoadingTutor(true);
        }
    }, [user?.role]);
    
    // Reset admin state when user changes
    useEffect(() => {
        if (user?.role !== 'admin' && user?.role !== 'super_admin') {
            setAnalytics(null);
            setFinancialStats(null);
            setRecentBookings([]);
            setTotalUsers(0);
            setActiveTutors(0);
            setIsLoadingAdmin(true);
        }
    }, [user?.role]);
    
    // Separate effect to refresh user data only once on mount (for XP/level updates)
    // This runs independently and won't cause the dashboard data to re-fetch
    useEffect(() => {
        if (user && !hasRefreshedUserRef.current) {
            hasRefreshedUserRef.current = true;
            // Only refresh user data once when component first mounts
            // Use setTimeout to avoid blocking the initial render
            setTimeout(() => {
                refreshUser();
            }, 100);
        }
    }, [user?._id]); // Only refresh if user ID changes (new login)

    // Extract unique subjects from sessions
    const subjects = useMemo(() => {
        const subjectSet = new Set();
        sessions.forEach(s => {
            if (s.subject) subjectSet.add(s.subject);
        });
        return Array.from(subjectSet);
    }, [sessions]);

    // Handle AI Study Plan Generation
    const handlePlanWeek = useCallback(async () => {
        try {
            setIsPlanningWeek(true);
            
            // Ensure we have arrays
            const sessionsArray = Array.isArray(sessions) ? sessions : [];
            const subjectsArray = Array.isArray(subjects) ? subjects : [];
            
            console.log('[handlePlanWeek] Generating study plan with:', { 
                sessionsCount: sessionsArray.length, 
                subjectsCount: subjectsArray.length,
                subjects: subjectsArray 
            });
            
            setAiModal({ 
                isOpen: true, 
                title: '✨ AI Study Plan', 
                content: 'Generating your personalized study plan...', 
                isLoading: true, 
                contentType: 'text' 
            });
            
            const response = await generateStudyPlan(sessionsArray, subjectsArray);
            
            console.log('[handlePlanWeek] Received response:', { 
                hasStudyPlan: !!response?.studyPlan, 
                hasMessage: !!response?.message,
                responseKeys: response ? Object.keys(response) : []
            });
            
            // Ensure we have valid content
            const studyPlanContent = response?.studyPlan || response?.message || 'Study plan generated successfully!';
            
            if (!studyPlanContent || studyPlanContent.trim() === '') {
                throw new Error('Received empty study plan from server');
            }
            
            setAiModal({ 
                isOpen: true, 
                title: '✨ AI Study Plan', 
                content: studyPlanContent, 
                isLoading: false, 
                contentType: 'text' 
            });
        } catch (error) {
            console.error('Failed to generate study plan:', error);
            
            // Extract error message safely
            let errorMessage = 'Sorry, we encountered an error generating your study plan. Please try again later.';
            
            if (error?.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error?.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error?.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            setAiModal({ 
                isOpen: true, 
                title: '✨ AI Study Plan', 
                content: `Error: ${errorMessage}\n\nPlease try again or contact support if the problem persists.`, 
                isLoading: false, 
                contentType: 'text' 
            });
        } finally {
            setIsPlanningWeek(false);
        }
    }, [sessions, subjects]);

    // Handle AI Practice Questions Generation
    const handleGeneratePractice = useCallback(async (subject) => {
        try {
            setIsGeneratingPractice(true);
            setGeneratingSubject(subject);
            setAiModal({ 
                isOpen: true, 
                title: `✨ Practice Questions: ${subject}`, 
                content: { questions: [] }, 
                isLoading: true, 
                contentType: 'json' 
            });
            
            const response = await generatePracticeQuestions(subject, 'medium', 5);
            
            // Ensure we have valid questions
            const questions = response?.questions || [];
            
            if (!questions || questions.length === 0) {
                throw new Error('No practice questions were generated. Please try again.');
            }
            
            setAiModal({ 
                isOpen: true, 
                title: `✨ Practice Questions: ${subject}`, 
                content: { questions }, 
                isLoading: false, 
                contentType: 'json' 
            });
        } catch (error) {
            console.error('Failed to generate practice questions:', error);
            
            // Extract error message safely
            let errorMessage = 'Sorry, we encountered an error generating practice questions. Please try again later.';
            
            if (error?.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error?.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error?.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            // Show error as text content instead of empty questions
            setAiModal({ 
                isOpen: true, 
                title: `✨ Practice Questions: ${subject}`, 
                content: `Error: ${errorMessage}\n\nPlease try again or contact support if the problem persists.`, 
                isLoading: false, 
                contentType: 'text' 
            });
        } finally {
            setIsGeneratingPractice(false);
            setGeneratingSubject(null);
        }
    }, []);

    const closeAiModal = useCallback(() => {
        setAiModal({ isOpen: false, title: '', content: '', isLoading: false, contentType: 'text' });
    }, []);

    // useMemo ensures this object is not recreated on every render
    const roleComponents = useMemo(() => ({
        admin: AdminDashboard,
        super_admin: AdminDashboard, // super_admin uses the same dashboard as admin
        tutor: TutorDashboard,
        parent: ParentDashboard,
        student: StudentDashboard,
    }), []);

    const renderRoleDashboard = () => {
        // super_admin should see admin dashboard
        const dashboardRole = user?.role === 'super_admin' ? 'admin' : user?.role;
        const RoleComponent = roleComponents[dashboardRole] || roleComponents.student;
        if (user?.role === 'student') {
            return (
                <RoleComponent 
                    sessions={sessions} 
                    subjects={subjects} 
                    announcements={announcements}
                    user={user}
                    challenges={challenges}
                    remainingSessions={remainingSessions}
                    onPlanWeek={handlePlanWeek}
                    onGeneratePractice={handleGeneratePractice}
                    isPlanningWeek={isPlanningWeek}
                    isGeneratingPractice={isGeneratingPractice}
                    generatingSubject={generatingSubject}
                />
            );
        } else if (user?.role === 'tutor') {
            return (
                <RoleComponent 
                    announcements={announcements}
                    stats={tutorStats}
                    upcomingSessions={tutorBookings}
                    students={tutorStudents}
                    isLoading={isLoadingTutor}
                />
            );
        } else if (user?.role === 'admin' || user?.role === 'super_admin') {
            return (
                <RoleComponent 
                    announcements={announcements}
                    analytics={analytics}
                    financialStats={financialStats}
                    recentBookings={recentBookings}
                    totalUsers={totalUsers}
                    activeTutors={activeTutors}
                    isLoading={isLoadingAdmin}
                />
            );
        }
        return <RoleComponent announcements={announcements} bookings={sessions} remainingSessions={remainingSessions} />;
    };

    if (isLoading || ((user?.role === 'admin' || user?.role === 'super_admin') && isLoadingAdmin) || (user?.role === 'tutor' && isLoadingTutor)) {
        return (
            <div>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-gray-600">Welcome back, {user?.name || 'User'}!</p>
                </header>
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user?.name || 'User'}!</p>
            </header>
            {renderRoleDashboard()}
            
            {/* AI Modal */}
            <AIModal
                isOpen={aiModal.isOpen}
                onClose={closeAiModal}
                title={aiModal.title}
                content={aiModal.content}
                isLoading={aiModal.isLoading}
                contentType={aiModal.contentType}
            />
        </div>
    );
}
