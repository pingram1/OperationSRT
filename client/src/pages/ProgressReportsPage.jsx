import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    BarChart2, Calendar, BookOpen, Clock, TrendingUp, Award, 
    Download, FileText, Users, ArrowLeft, CheckCircle, Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getUserBookings } from '../api/bookings.js';
import { getUserProfile } from '../api/users.js';
import SessionSummary from '../components/parent/SessionSummary.jsx';

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ icon: Icon, title, rightContent = null }) => (
    <div className="flex justify-between items-center mb-4 border-b pb-3">
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-3 text-blue-500" />
            <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
        </div>
        {rightContent}
    </div>
);

/**
 * Progress Reports Page for Parents
 * Shows detailed progress statistics for their children
 */
export default function ProgressReportsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [parentData, setParentData] = useState(null);
    const [children, setChildren] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [selectedChildId, setSelectedChildId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('all'); // 'all', 'month', '3months', 'year'

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [profileData, bookingsData] = await Promise.all([
                    getUserProfile(),
                    getUserBookings()
                ]);
                
                setParentData(profileData);
                
                if (profileData.children && profileData.children.length > 0) {
                    const childrenData = profileData.children.map(child => {
                        if (typeof child === 'object' && child.name) {
                            return child;
                        }
                        return { _id: child, name: 'Child', id: child };
                    });
                    setChildren(childrenData);
                    if (childrenData[0]) {
                        setSelectedChildId(childrenData[0]._id || childrenData[0].id);
                    }
                }
                
                setBookings(bookingsData || []);
            } catch (error) {
                console.error('Failed to fetch progress data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        if (user) {
            fetchData();
        }
    }, [user]);

    const selectedChild = useMemo(() => {
        if (!selectedChildId || !children.length) return null;
        return children.find(c => (c._id || c.id) === selectedChildId);
    }, [children, selectedChildId]);

    // Filter bookings by date range
    const filteredBookings = useMemo(() => {
        if (!selectedChild || !bookings.length) return [];
        
        const childId = selectedChild._id || selectedChild.id;
        let childBookings = bookings.filter(b => 
            b.student && ((b.student._id || b.student.id) === childId || (typeof b.student === 'string' && b.student === childId))
        );

        // Filter by date range
        const now = new Date();
        let startDate = null;
        switch (dateRange) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case '3months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = null;
        }

        if (startDate) {
            childBookings = childBookings.filter(b => new Date(b.sessionDate) >= startDate);
        }

        return childBookings;
    }, [selectedChild, bookings, dateRange]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (!filteredBookings.length) {
            return {
                totalSessions: 0,
                completedSessions: 0,
                totalHours: 0,
                subjects: [],
                sessionsBySubject: {},
                sessionsByMonth: {},
                averageSessionDuration: 0,
            };
        }

        const completed = filteredBookings.filter(b => b.status === 'completed');
        const totalHours = completed.reduce((sum, b) => sum + (b.duration || 0) / 60, 0);
        const subjects = [...new Set(completed.map(b => b.subject).filter(Boolean))];
        const sessionsBySubject = {};
        const sessionsByMonth = {};

        completed.forEach(booking => {
            // Count by subject
            const subject = booking.subject || 'Unknown';
            sessionsBySubject[subject] = (sessionsBySubject[subject] || 0) + 1;

            // Count by month
            const date = new Date(booking.sessionDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            sessionsByMonth[monthKey] = (sessionsByMonth[monthKey] || 0) + 1;
        });

        const averageSessionDuration = completed.length > 0 
            ? completed.reduce((sum, b) => sum + (b.duration || 0), 0) / completed.length 
            : 0;

        return {
            totalSessions: filteredBookings.length,
            completedSessions: completed.length,
            totalHours: totalHours.toFixed(1),
            subjects,
            sessionsBySubject,
            sessionsByMonth,
            averageSessionDuration: Math.round(averageSessionDuration),
        };
    }, [filteredBookings]);

    const formatMonth = (monthKey) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    if (isLoading) {
        return (
            <div>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Progress Reports</h1>
                    <p className="text-gray-600">Loading...</p>
                </header>
            </div>
        );
    }

    if (!parentData || children.length === 0) {
        return (
            <div>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Progress Reports</h1>
                    <p className="text-red-600">No children linked to this account.</p>
                </header>
            </div>
        );
    }

    return (
        <div>
            <header className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Progress Reports</h1>
                        <p className="text-gray-600">Track your child's academic progress and achievements</p>
                    </div>
                    <button
                        onClick={() => navigate('/parent-portal')}
                        className="flex items-center text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Portal
                    </button>
                </div>
            </header>

            {/* Child Selector */}
            <div className="mb-6">
                <label htmlFor="child-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Viewing Progress For:
                </label>
                <select
                    id="child-select"
                    value={selectedChildId || ''}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 w-full md:w-1/3 p-2.5"
                >
                    {children.map(child => (
                        <option key={child._id || child.id} value={child._id || child.id}>
                            {child.name || 'Child'}
                        </option>
                    ))}
                </select>
            </div>

            {/* Date Range Filter */}
            <div className="mb-6">
                <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-2">
                    Time Period:
                </label>
                <select
                    id="date-range"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 w-full md:w-1/3 p-2.5"
                >
                    <option value="all">All Time</option>
                    <option value="month">This Month</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="year">This Year</option>
                </select>
            </div>

            {selectedChild && (
                <div className="space-y-6">
                    {/* Key Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Total Sessions</p>
                                    <p className="text-3xl font-bold mt-1">{stats.totalSessions}</p>
                                    <p className="text-blue-100 text-xs mt-2">{stats.completedSessions} completed</p>
                                </div>
                                <Calendar className="w-12 h-12 text-blue-200" />
                            </div>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Total Hours</p>
                                    <p className="text-3xl font-bold mt-1">{stats.totalHours}</p>
                                    <p className="text-green-100 text-xs mt-2">Tutoring time</p>
                                </div>
                                <Clock className="w-12 h-12 text-green-200" />
                            </div>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Subjects</p>
                                    <p className="text-3xl font-bold mt-1">{stats.subjects.length}</p>
                                    <p className="text-purple-100 text-xs mt-2">Different subjects</p>
                                </div>
                                <BookOpen className="w-12 h-12 text-purple-200" />
                            </div>
                        </Card>

                        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-orange-100 text-sm font-medium">Avg Session</p>
                                    <p className="text-3xl font-bold mt-1">{stats.averageSessionDuration}</p>
                                    <p className="text-orange-100 text-xs mt-2">minutes</p>
                                </div>
                                <Target className="w-12 h-12 text-orange-200" />
                            </div>
                        </Card>
                    </div>

                    {/* Sessions by Subject */}
                    {stats.subjects.length > 0 && (
                        <Card>
                            <CardHeader 
                                icon={BarChart2} 
                                title="Sessions by Subject"
                                rightContent={
                                    <button className="text-sm text-blue-600 hover:underline flex items-center">
                                        <Download className="w-4 h-4 mr-1" />
                                        Export
                                    </button>
                                }
                            />
                            <div className="space-y-4">
                                {stats.subjects.map(subject => {
                                    const count = stats.sessionsBySubject[subject] || 0;
                                    const percentage = stats.completedSessions > 0 
                                        ? (count / stats.completedSessions) * 100 
                                        : 0;
                                    return (
                                        <div key={subject}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-semibold text-gray-800">{subject}</span>
                                                <span className="text-sm text-gray-600">{count} session{count !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Progress Over Time */}
                    {Object.keys(stats.sessionsByMonth).length > 0 && (
                        <Card>
                            <CardHeader 
                                icon={TrendingUp} 
                                title="Progress Over Time"
                            />
                            <div className="space-y-3">
                                {Object.entries(stats.sessionsByMonth)
                                    .sort((a, b) => a[0].localeCompare(b[0]))
                                    .map(([monthKey, count]) => (
                                        <div key={monthKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <span className="font-medium text-gray-700">{formatMonth(monthKey)}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="w-32 bg-gray-200 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min((count / Math.max(...Object.values(stats.sessionsByMonth))) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-semibold text-gray-800 w-12 text-right">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </Card>
                    )}

                    {/* Recent Completed Sessions */}
                    {filteredBookings.filter(b => b.status === 'completed').length > 0 && (
                        <Card>
                            <CardHeader 
                                icon={CheckCircle} 
                                title="Recent Completed Sessions"
                                rightContent={
                                    <button
                                        onClick={() => navigate('/parent-portal')}
                                        className="text-sm text-blue-600 hover:underline flex items-center"
                                    >
                                        View All <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                                    </button>
                                }
                            />
                            <div className="space-y-4">
                                {filteredBookings
                                    .filter(b => b.status === 'completed')
                                    .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
                                    .slice(0, 3)
                                    .map(session => {
                                        const sessionDate = new Date(session.sessionDate);
                                        const formattedDate = sessionDate.toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: 'numeric'
                                        });
                                        return (
                                            <div key={session._id || session.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{session.subject}</p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {session.tutor?.name || 'Tutor TBD'} • {formattedDate}
                                                        </p>
                                                    </div>
                                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                                        Completed
                                                    </span>
                                                </div>
                                                <SessionSummary booking={session} showFullDetails={false} />
                                            </div>
                                        );
                                    })}
                            </div>
                        </Card>
                    )}

                    {/* Empty State */}
                    {stats.completedSessions === 0 && (
                        <Card>
                            <div className="text-center py-12">
                                <BarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 mb-2">No completed sessions yet.</p>
                                <p className="text-sm text-gray-400 mb-4">Progress reports will appear here once sessions are completed.</p>
                                <button
                                    onClick={() => navigate('/appointments')}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center mx-auto"
                                >
                                    Book a session
                                </button>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}












