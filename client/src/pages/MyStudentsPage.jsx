import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Users, User, Calendar, Clock, Award, ChevronRight, Search, 
    Mail, BookOpen, AlertCircle, TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTutorStudents } from '../api/tutors';
import Card from '../components/common/Card.jsx';
import { getTutorBookings } from '../api/bookings';

// --- Reusable Components ---
const CardHeader = ({ icon: Icon, title, rightContent = null }) => (
    <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-3 text-blue-500" />
            <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
        </div>
        {rightContent}
    </div>
);

// --- My Students Page Component ---
export default function MyStudentsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const selectedStudentId = searchParams.get('student');

    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentBookings, setStudentBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingStudent, setIsLoadingStudent] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

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
        fetchStudents();
    }, []);

    useEffect(() => {
        if (selectedStudentId) {
            const student = students.find(s => (s._id || s.id) === selectedStudentId);
            if (student) {
                handleSelectStudent(student);
            }
        }
    }, [selectedStudentId, students]);

    const fetchStudents = async () => {
        try {
            setIsLoading(true);
            setError('');
            const data = await getTutorStudents();
            setStudents(data || []);
            
            // If a student is selected in URL, load their details
            if (selectedStudentId) {
                const student = data?.find(s => (s._id || s.id) === selectedStudentId);
                if (student) {
                    handleSelectStudent(student);
                }
            }
        } catch (err) {
            console.error('Failed to fetch students:', err);
            setError('Failed to load students. Please refresh the page.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectStudent = async (student) => {
        try {
            setIsLoadingStudent(true);
            setSelectedStudent(student);
            
            // Fetch bookings for this student
            const bookings = await getTutorBookings();
            const studentBookings = bookings.filter(b => 
                (b.student?._id || b.student?.id) === (student._id || student.id)
            ).sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
            
            setStudentBookings(studentBookings);
            
            // Update URL
            navigate(`/my-students?student=${student._id || student.id}`, { replace: true });
        } catch (err) {
            console.error('Failed to fetch student bookings:', err);
            setError('Failed to load student details.');
        } finally {
            setIsLoadingStudent(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
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

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        return students.filter(student =>
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.studentProfile?.gradeLevel?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    if (isLoading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading students...</p>
            </div>
        );
    }

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">My Students</h1>
                <p className="text-gray-600">View and manage your student roster.</p>
            </header>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Student List */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader icon={Users} title="Student Roster" />
                        
                        {/* Search */}
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Student List */}
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map(student => {
                                    const isSelected = (selectedStudent?._id || selectedStudent?.id) === (student._id || student.id);
                                    return (
                                        <div
                                            key={student._id || student.id}
                                            onClick={() => handleSelectStudent(student)}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                                isSelected
                                                    ? 'bg-blue-50 border-2 border-blue-500'
                                                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                                        isSelected
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                        {student.name?.charAt(0) || 'S'}
                                                    </div>
                                                    <div>
                                                        <p className={`font-medium text-sm ${
                                                            isSelected ? 'text-blue-900' : 'text-gray-800'
                                                        }`}>
                                                            {student.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {student.stats?.totalSessions || 0} sessions
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className={`w-5 h-5 ${
                                                    isSelected ? 'text-blue-600' : 'text-gray-400'
                                                }`} />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    {searchTerm ? 'No students found matching your search.' : 'No students yet.'}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column - Student Details */}
                <div className="lg:col-span-2">
                    {selectedStudent ? (
                        <div className="space-y-6">
                            {/* Student Profile */}
                            <Card>
                                <CardHeader icon={User} title="Student Profile" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center font-bold text-2xl text-blue-600">
                                                {selectedStudent.name?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h3>
                                                <p className="text-sm text-gray-500">{selectedStudent.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {selectedStudent.studentProfile?.gradeLevel && (
                                            <div>
                                                <p className="text-sm text-gray-500">Grade Level</p>
                                                <p className="font-semibold text-gray-800">{selectedStudent.studentProfile.gradeLevel}</p>
                                            </div>
                                        )}
                                        {selectedStudent.studentProfile?.grade && (
                                            <div>
                                                <p className="text-sm text-gray-500">Grade</p>
                                                <p className="font-semibold text-gray-800">{selectedStudent.studentProfile.grade}</p>
                                            </div>
                                        )}
                                        {selectedStudent.studentProfile?.subjectOfFocus && selectedStudent.studentProfile.subjectOfFocus.length > 0 && (
                                            <div>
                                                <p className="text-sm text-gray-500">Subjects of Focus</p>
                                                <p className="font-semibold text-gray-800">
                                                    {selectedStudent.studentProfile.subjectOfFocus.join(', ')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Student Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 mb-2">Total Sessions</p>
                                        <p className="text-3xl font-bold text-blue-600">
                                            {selectedStudent.stats?.totalSessions || 0}
                                        </p>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 mb-2">Completed</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            {selectedStudent.stats?.completedSessions || 0}
                                        </p>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 mb-2">Upcoming</p>
                                        <p className="text-3xl font-bold text-orange-600">
                                            {selectedStudent.stats?.upcomingSessions || 0}
                                        </p>
                                    </div>
                                </Card>
                            </div>

                            {/* Session History */}
                            <Card>
                                <CardHeader 
                                    icon={Calendar} 
                                    title="Session History"
                                    rightContent={
                                        <button
                                            onClick={() => navigate('/tutor-appointments')}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            View All
                                        </button>
                                    }
                                />
                                {isLoadingStudent ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-2 text-gray-500 text-sm">Loading sessions...</p>
                                    </div>
                                ) : studentBookings.length > 0 ? (
                                    <div className="space-y-3">
                                        {studentBookings.slice(0, 10).map(booking => (
                                            <div
                                                key={booking._id}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-medium text-gray-800">{booking.subject}</p>
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                            booking.status === 'completed'
                                                                ? 'bg-green-100 text-green-800'
                                                                : booking.status === 'cancelled'
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {booking.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                        <span className="flex items-center">
                                                            <Calendar className="w-4 h-4 mr-1" />
                                                            {formatDate(booking.sessionDate)}
                                                        </span>
                                                        <span className="flex items-center">
                                                            <Clock className="w-4 h-4 mr-1" />
                                                            {formatTime(booking.sessionDate)} • {booking.duration} min
                                                        </span>
                                                    </div>
                                                    {booking.goals && (
                                                        <p className="text-xs text-gray-500 mt-1">{booking.goals}</p>
                                                    )}
                                                </div>
                                                {booking.status === 'scheduled' && new Date(booking.sessionDate) > new Date() && (
                                                    <button
                                                        onClick={() => navigate(`/classroom?sessionId=${booking._id}`)}
                                                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                                                    >
                                                        View Session
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        No sessions found for this student.
                                    </div>
                                )}
                            </Card>
                        </div>
                    ) : (
                        <Card>
                            <div className="text-center py-12">
                                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg font-semibold">Select a Student</p>
                                <p className="text-gray-400 text-sm mt-2">
                                    Choose a student from the list to view their profile and session history.
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

