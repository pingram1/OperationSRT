import React, { useState, useMemo, useEffect } from 'react';
import { UserPlus, Users, DollarSign, Search, Check, X, FileText, AlertCircle, CheckCircle, Plus, Copy, Mail, Clock } from 'lucide-react';
import { getPendingApplications, getActiveTutors, getTutorStats, approveTutor, denyTutor, createTutor, updateTutor } from '../api/tutors';
import { getSystemConfig } from '../api/systemConfig';
import { useAuth } from '../contexts/AuthContext';
import { getMyAvailability, updateMyAvailability } from '../api/availability';
import { getSecureToken } from '../api/authStorage';
import { useConfirm } from '../components/common/ConfirmDialog.jsx';

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
        {children}
    </div>
);

const StatCard = ({ title, value, icon: Icon, iconBgColor = 'bg-blue-100', iconColor = 'text-blue-600' }) => (
    <Card className="flex items-center">
        <div className={`p-3 ${iconBgColor} rounded-lg mr-4`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </Card>
);

const Button = ({ children, variant = 'primary', Icon, isLoading = false, className = '', ...rest }) => {
    const baseStyles = 'flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variantStyles = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
    };
    const disabledStyles = 'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed';
    return (
        <button className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`} disabled={isLoading} {...rest}>
            {Icon && <Icon className="w-5 h-5 mr-2 -ml-1" />}
            {children}
        </button>
    );
};

// --- Tutor Management Page Component ---
export default function HRPage() {
    const { user } = useAuth();
    const confirm = useConfirm();
    const [applications, setApplications] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [stats, setStats] = useState({
        pendingApplications: 0,
        activeTutors: 0,
        newTutorsLast30Days: 0,
        totalMonthlyPayroll: 0
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [processingId, setProcessingId] = useState(null);
    
    // Add Tutor Modal State
    const [showAddTutorModal, setShowAddTutorModal] = useState(false);
    const [newTutor, setNewTutor] = useState({
        name: '',
        email: '',
        subjects: [],
        bio: '',
        hourlyRate: '',
        monthlySalary: '',
        payTier: '',
        contractorType: '',
        taxFormStatus: 'Pending',
    });
    const [editingTutor, setEditingTutor] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isUpdatingTutor, setIsUpdatingTutor] = useState(false);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [isCreatingTutor, setIsCreatingTutor] = useState(false);
    const [createdTutorPassword, setCreatedTutorPassword] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    
    // Edit Tutor Modal - Availability state
    const [tutorAvailability, setTutorAvailability] = useState({
        weeklySchedule: [],
        timezone: 'America/New_York',
        hasCustomAvailability: false,
    });
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    
    // Days of the week for tutor schedule
    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Check if user is admin or super_admin
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-600">Only administrators can access tutor management.</p>
            </div>
        );
    }

    // Fetch data on mount
    useEffect(() => {
        fetchData();
        fetchAvailableSubjects();
    }, []);

    const fetchAvailableSubjects = async () => {
        try {
            const config = await getSystemConfig();
            if (config && config.subjects && Array.isArray(config.subjects)) {
                setAvailableSubjects(config.subjects);
            }
        } catch (err) {
            console.error('Failed to fetch available subjects:', err);
            // Set default subjects if fetch fails
            setAvailableSubjects(['Math', 'Science', 'English', 'History', 'Foreign Language']);
        }
    };

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError('');
            
            const [applicationsData, tutorsData, statsData] = await Promise.all([
                getPendingApplications(),
                getActiveTutors(),
                getTutorStats(),
            ]);
            
            setApplications(applicationsData || []);
            setTutors(tutorsData || []);
            setStats(statsData || {
                pendingApplications: 0,
                activeTutors: 0,
                newTutorsLast30Days: 0,
                totalMonthlyPayroll: 0
            });
        } catch (err) {
            console.error('Failed to fetch tutor data:', err);
            setError('Failed to load tutor data. Please refresh the page.');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTutors = useMemo(() => {
        if (!tutors || tutors.length === 0) return [];
        return tutors.filter(tutor =>
            tutor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tutor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tutor.tutorInfo?.subjects?.some(subject => 
                subject.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [tutors, searchTerm]);

    const handleApprove = async (application) => {
        try {
            setProcessingId(application._id);
            setError('');
            setSuccess('');
            
            await approveTutor(application._id);
            
            setSuccess(`Tutor ${application.name} approved successfully!`);
            // Refresh data
            await fetchData();
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to approve tutor:', err);
            setError(err.message || 'Failed to approve tutor. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };
    
    const handleDeny = async (application) => {
        const ok = await confirm({
            title: 'Deny tutor application?',
            message: `Are you sure you want to deny ${application.name}'s application? This action cannot be undone.`,
            confirmLabel: 'Deny application',
            danger: true,
        });
        if (!ok) {
            return;
        }
        
        try {
            setProcessingId(application._id);
            setError('');
            setSuccess('');
            
            await denyTutor(application._id);
            
            setSuccess(`Tutor application for ${application.name} has been denied.`);
            // Refresh data
            await fetchData();
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to deny tutor:', err);
            setError(err.message || 'Failed to deny tutor. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } catch (err) {
            return 'N/A';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleAddTutor = () => {
        setShowAddTutorModal(true);
        setNewTutor({
            name: '',
            email: '',
            subjects: [],
            bio: '',
            hourlyRate: '',
            monthlySalary: '',
            payTier: '',
            contractorType: '',
            taxFormStatus: 'Pending',
        });
        setError('');
        setSuccess('');
        setCreatedTutorPassword(null);
    };

    const handleEditTutor = async (tutor) => {
        setEditingTutor(tutor);
        setShowEditModal(true);
        setError('');
        setSuccess('');
        
        // Fetch tutor availability (always fetch to get system defaults if no custom availability)
        try {
            setAvailabilityLoading(true);
            // Use the tutor's ID to fetch their availability (returns system default if no custom)
            const token = getSecureToken();
            const response = await fetch(`/api/availability/tutor/${tutor._id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (response.ok) {
                const data = await response.json();
                // Initialize schedule with all days
                let weeklySchedule = DAYS_OF_WEEK.map(day => {
                    // Check if custom schedule exists for this day
                    if (tutor.tutorInfo?.hasCustomAvailability && tutor.tutorInfo?.availability?.weeklySchedule) {
                        const customDay = tutor.tutorInfo.availability.weeklySchedule.find(s => s.day === day);
                        if (customDay) {
                            return customDay;
                        }
                    }
                    // Otherwise use system default from API response
                    const systemDay = data.schedule?.find(s => s.day === day);
                    if (systemDay) {
                        return systemDay;
                    }
                    // Fallback
                    return {
                        day,
                        available: false,
                        startTime: '09:00',
                        endTime: '17:00',
                    };
                });
                
                setTutorAvailability({
                    weeklySchedule,
                    timezone: data.timezone || 'America/New_York',
                    hasCustomAvailability: tutor.tutorInfo?.hasCustomAvailability || false,
                });
            } else {
                // If fetch fails, initialize with empty schedule
                setTutorAvailability({
                    weeklySchedule: DAYS_OF_WEEK.map(day => ({
                        day,
                        available: false,
                        startTime: '09:00',
                        endTime: '17:00',
                    })),
                    timezone: 'America/New_York',
                    hasCustomAvailability: false,
                });
            }
        } catch (err) {
            console.error('Failed to fetch tutor availability:', err);
            // Initialize with empty schedule if fetch fails
            setTutorAvailability({
                weeklySchedule: DAYS_OF_WEEK.map(day => ({
                    day,
                    available: false,
                    startTime: '09:00',
                    endTime: '17:00',
                })),
                timezone: 'America/New_York',
                hasCustomAvailability: false,
            });
        } finally {
            setAvailabilityLoading(false);
        }
    };

    const handleUpdateTutor = async (e) => {
        e.preventDefault();
        if (!editingTutor) return;

        try {
            setIsUpdatingTutor(true);
            setError('');
            setSuccess('');

            const tutorData = {
                tutorInfo: {
                    subjects: editingTutor.tutorInfo?.subjects || [],
                    bio: editingTutor.tutorInfo?.bio || '',
                    status: editingTutor.tutorInfo?.status || 'active',
                    hourlyRate: editingTutor.tutorInfo?.hourlyRate || null,
                    monthlySalary: editingTutor.tutorInfo?.monthlySalary || null,
                    payTier: editingTutor.tutorInfo?.payTier || null,
                    contractorType: editingTutor.tutorInfo?.contractorType || null,
                    taxFormStatus: editingTutor.tutorInfo?.taxFormStatus || 'Pending',
                    availability: tutorAvailability.weeklySchedule.length > 0 ? {
                        weeklySchedule: tutorAvailability.weeklySchedule,
                        timezone: tutorAvailability.timezone,
                    } : null,
                    hasCustomAvailability: tutorAvailability.hasCustomAvailability,
                },
            };

            await updateTutor(editingTutor._id, tutorData);
            
            // If availability was set, update it via the availability API
            if (tutorAvailability.hasCustomAvailability && tutorAvailability.weeklySchedule.length > 0) {
                try {
                    // Admin updating tutor availability - need to use a different approach
                    // Since we can't use the tutor's token, we'll update it through the tutor update
                    // The availability is already in tutorData above
                } catch (availErr) {
                    console.error('Failed to update tutor availability:', availErr);
                    // Don't fail the whole update if availability update fails
                }
            }
            
            setSuccess('Tutor updated successfully!');
            setShowEditModal(false);
            setEditingTutor(null);
            await fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to update tutor:', err);
            setError(err.message || 'Failed to update tutor. Please try again.');
        } finally {
            setIsUpdatingTutor(false);
        }
    };
    
    const handleTutorAvailabilityChange = (day, field, value) => {
        setTutorAvailability(prev => {
            const updatedSchedule = [...(prev.weeklySchedule || [])];
            const dayIndex = updatedSchedule.findIndex(s => s.day === day);
            
            if (dayIndex >= 0) {
                updatedSchedule[dayIndex] = {
                    ...updatedSchedule[dayIndex],
                    [field]: value,
                };
            } else {
                updatedSchedule.push({
                    day,
                    available: field === 'available' ? value : false,
                    startTime: '09:00',
                    endTime: '17:00',
                    [field]: value,
                });
            }
            
            return {
                ...prev,
                weeklySchedule: updatedSchedule,
                hasCustomAvailability: true,
            };
        });
    };
    
    const handleSubjectToggleEdit = (subject) => {
        if (!editingTutor) return;
        setEditingTutor(prev => {
            const subjects = prev.tutorInfo?.subjects || [];
            const updatedSubjects = subjects.includes(subject)
                ? subjects.filter(s => s !== subject)
                : [...subjects, subject];
            return {
                ...prev,
                tutorInfo: {
                    ...prev.tutorInfo,
                    subjects: updatedSubjects,
                },
            };
        });
    };

    const handleSubjectToggle = (subject) => {
        setNewTutor(prev => {
            const subjects = prev.subjects || [];
            if (subjects.includes(subject)) {
                return { ...prev, subjects: subjects.filter(s => s !== subject) };
            } else {
                return { ...prev, subjects: [...subjects, subject] };
            }
        });
    };

    const handleCreateTutor = async (e) => {
        e.preventDefault();
        if (!newTutor.name || !newTutor.email) {
            setError('Name and email are required');
            return;
        }

        try {
            setIsCreatingTutor(true);
            setError('');
            setSuccess('');

            const tutorData = {
                name: newTutor.name,
                email: newTutor.email,
                subjects: newTutor.subjects,
                bio: newTutor.bio,
                hourlyRate: newTutor.hourlyRate ? parseFloat(newTutor.hourlyRate) : null,
                monthlySalary: newTutor.monthlySalary ? parseFloat(newTutor.monthlySalary) : null,
                payTier: newTutor.payTier || null,
                contractorType: newTutor.contractorType || null,
                taxFormStatus: newTutor.taxFormStatus || 'Pending',
            };

            const response = await createTutor(tutorData);
            
            setCreatedTutorPassword(response.defaultPassword);
            setShowAddTutorModal(false);
            setShowPasswordModal(true);
            setSuccess(`Tutor account created successfully! An email has been sent to ${response.tutor.email}.`);
            
            // Refresh data
            await fetchData();
            
            // Reset form
            setNewTutor({
                name: '',
                email: '',
                subjects: [],
                bio: '',
                hourlyRate: '',
                monthlySalary: '',
                payTier: '',
                contractorType: '',
                taxFormStatus: 'Pending',
            });
        } catch (err) {
            console.error('Failed to create tutor:', err);
            setError(err.message || 'Failed to create tutor account. Please try again.');
        } finally {
            setIsCreatingTutor(false);
        }
    };

    const handleCopyPassword = () => {
        if (createdTutorPassword) {
            navigator.clipboard.writeText(createdTutorPassword);
            setSuccess('Password copied to clipboard!');
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const handleClosePasswordModal = () => {
        setShowPasswordModal(false);
        setCreatedTutorPassword(null);
    };

    if (isLoading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading tutor data...</p>
            </div>
        );
    }

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Tutor Management (HR)</h1>
                <p className="text-gray-600">Onboard new tutors, manage your current roster, and handle payroll.</p>
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

            {/* Key Metric Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="Pending Applications" 
                    value={stats.pendingApplications || applications.length} 
                    icon={FileText} 
                    iconBgColor="bg-yellow-100" 
                    iconColor="text-yellow-600" 
                />
                <StatCard 
                    title="Active Tutors" 
                    value={stats.activeTutors || tutors.length} 
                    icon={Users} 
                />
                <StatCard 
                    title="Total Monthly Payroll" 
                    value={formatCurrency(stats.totalMonthlyPayroll || 0)} 
                    icon={DollarSign} 
                    iconBgColor="bg-green-100" 
                    iconColor="text-green-600" 
                />
                <StatCard 
                    title="New Tutors (Last 30d)" 
                    value={stats.newTutorsLast30Days || 0} 
                    icon={UserPlus} 
                />
            </div>

            {/* New Applications Table */}
            <div className="mb-8">
                <Card>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">New Tutor Applications</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-sm text-gray-500 bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Applicant</th>
                                    <th className="px-6 py-3">Subjects</th>
                                    <th className="px-6 py-3">Applied On</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {applications.length > 0 ? applications.map(app => (
                                    <tr key={app._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{app.name}</div>
                                            <div className="text-sm text-gray-500">{app.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {app.tutorInfo?.subjects?.length > 0 
                                                ? app.tutorInfo.subjects.join(', ') 
                                                : 'No subjects specified'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDate(app.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    onClick={() => handleApprove(app)} 
                                                    variant="success" 
                                                    Icon={Check}
                                                    isLoading={processingId === app._id}
                                                    disabled={processingId !== null && processingId !== app._id}
                                                >
                                                    Approve
                                                </Button>
                                                <Button 
                                                    onClick={() => handleDeny(app)} 
                                                    variant="danger" 
                                                    Icon={X}
                                                    isLoading={processingId === app._id}
                                                    disabled={processingId !== null && processingId !== app._id}
                                                >
                                                    Deny
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-gray-500">
                                            No pending applications.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            
            {/* Active Tutors Roster */}
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">Active Tutor Roster</h2>
                    <div className="flex gap-3 w-full md:w-auto mb-4 md:mb-0">
                        <Button 
                            onClick={handleAddTutor}
                            variant="primary"
                            Icon={Plus}
                            className="w-full md:w-auto"
                        >
                            Add Tutor
                        </Button>
                        <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search tutors..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg"
                        />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-sm text-gray-500 bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Tutor</th>
                                <th className="px-6 py-3">Subjects</th>
                                <th className="px-6 py-3">Pay Tier</th>
                                <th className="px-6 py-3">Tax Form</th>
                                <th className="px-6 py-3">Hire Date</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredTutors.length > 0 ? filteredTutors.map(tutor => (
                                <tr key={tutor._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium">{tutor.name}</div>
                                        <div className="text-sm text-gray-500">{tutor.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {tutor.tutorInfo?.subjects?.length > 0 
                                            ? tutor.tutorInfo.subjects.join(', ') 
                                            : 'No subjects specified'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {tutor.tutorInfo?.payTier ? (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {tutor.tutorInfo.payTier.replace('_', ' ')}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">Not set</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {tutor.tutorInfo?.taxFormStatus === 'W9_Complete' && (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                W9 Complete
                                            </span>
                                        )}
                                        {tutor.tutorInfo?.taxFormStatus === 'W8BEN_Complete' && (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                W8BEN Complete
                                            </span>
                                        )}
                                        {(!tutor.tutorInfo?.taxFormStatus || tutor.tutorInfo.taxFormStatus === 'Pending') && (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {formatDate(tutor.tutorInfo?.hireDate || tutor.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button 
                                            variant="secondary"
                                            onClick={() => handleEditTutor(tutor)}
                                        >
                                            Manage Profile
                                        </Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-500">
                                        {searchTerm ? 'No tutors found matching your search.' : 'No active tutors.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add Tutor Modal */}
            {showAddTutorModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Add New Tutor</h2>
                            <button
                                onClick={() => setShowAddTutorModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTutor} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTutor.name}
                                    onChange={(e) => setNewTutor({ ...newTutor, name: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={newTutor.email}
                                    onChange={(e) => setNewTutor({ ...newTutor, email: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subjects
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                                    {availableSubjects.map(subject => (
                                        <label key={subject} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                            <input
                                                type="checkbox"
                                                checked={newTutor.subjects.includes(subject)}
                                                onChange={() => handleSubjectToggle(subject)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{subject}</span>
                                        </label>
                                    ))}
                                </div>
                                {availableSubjects.length === 0 && (
                                    <p className="text-sm text-gray-500 mt-2">No subjects available. Please configure subjects in System Config.</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Bio
                                </label>
                                <textarea
                                    value={newTutor.bio}
                                    onChange={(e) => setNewTutor({ ...newTutor, bio: e.target.value })}
                                    rows="3"
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Brief description of the tutor's background and expertise..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hourly Rate ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newTutor.hourlyRate}
                                        onChange={(e) => setNewTutor({ ...newTutor, hourlyRate: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Monthly Salary ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newTutor.monthlySalary}
                                        onChange={(e) => setNewTutor({ ...newTutor, monthlySalary: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Payroll Settings */}
                            <div className="border-t pt-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Payroll Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pay Tier
                                        </label>
                                        <select
                                            value={newTutor.payTier}
                                            onChange={(e) => setNewTutor({ ...newTutor, payTier: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Tier</option>
                                            <option value="Tier_1">Tier 1 ($18/session)</option>
                                            <option value="Tier_2">Tier 2 ($25/session)</option>
                                            <option value="Tier_3">Tier 3 ($35/session)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contractor Type
                                        </label>
                                        <select
                                            value={newTutor.contractorType}
                                            onChange={(e) => setNewTutor({ ...newTutor, contractorType: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Type</option>
                                            <option value="US">US</option>
                                            <option value="International">International</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tax Form Status
                                        </label>
                                        <select
                                            value={newTutor.taxFormStatus}
                                            onChange={(e) => setNewTutor({ ...newTutor, taxFormStatus: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="W9_Complete">W9 Complete (US)</option>
                                            <option value="W8BEN_Complete">W8BEN Complete (International)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowAddTutorModal(false)}
                                    disabled={isCreatingTutor}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    Icon={UserPlus}
                                    isLoading={isCreatingTutor}
                                    disabled={isCreatingTutor}
                                >
                                    Create Tutor Account
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Tutor Modal */}
            {showEditModal && editingTutor && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Edit Tutor: {editingTutor.name}</h2>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingTutor(null);
                                    setTutorAvailability({
                                        weeklySchedule: [],
                                        timezone: 'America/New_York',
                                        hasCustomAvailability: false,
                                    });
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateTutor} className="space-y-6">
                            {/* Basic Information */}
                            <div className="border-b pb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={editingTutor.name || ''}
                                            disabled
                                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={editingTutor.email || ''}
                                            disabled
                                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Subjects */}
                            <div className="border-b pb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Subjects</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                                    {availableSubjects.map(subject => (
                                        <label key={subject} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                            <input
                                                type="checkbox"
                                                checked={editingTutor.tutorInfo?.subjects?.includes(subject) || false}
                                                onChange={() => handleSubjectToggleEdit(subject)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{subject}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Bio */}
                            <div className="border-b pb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bio</h3>
                                <textarea
                                    value={editingTutor.tutorInfo?.bio || ''}
                                    onChange={(e) => setEditingTutor(prev => ({
                                        ...prev,
                                        tutorInfo: { ...prev.tutorInfo, bio: e.target.value }
                                    }))}
                                    rows="3"
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Tutor bio..."
                                />
                            </div>

                            {/* Status */}
                            <div className="border-b pb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Status</h3>
                                <select
                                    value={editingTutor.tutorInfo?.status || 'active'}
                                    onChange={(e) => setEditingTutor(prev => ({
                                        ...prev,
                                        tutorInfo: { ...prev.tutorInfo, status: e.target.value }
                                    }))}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            {/* Payroll Settings */}
                            <div className="border-b pb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Payroll Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pay Tier
                                        </label>
                                        <select
                                            value={editingTutor.tutorInfo?.payTier || ''}
                                            onChange={(e) => setEditingTutor(prev => ({
                                                ...prev,
                                                tutorInfo: { ...prev.tutorInfo, payTier: e.target.value }
                                            }))}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Tier</option>
                                            <option value="Tier_1">Tier 1 ($18/session)</option>
                                            <option value="Tier_2">Tier 2 ($25/session)</option>
                                            <option value="Tier_3">Tier 3 ($35/session)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contractor Type
                                        </label>
                                        <select
                                            value={editingTutor.tutorInfo?.contractorType || ''}
                                            onChange={(e) => setEditingTutor(prev => ({
                                                ...prev,
                                                tutorInfo: { ...prev.tutorInfo, contractorType: e.target.value }
                                            }))}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Type</option>
                                            <option value="US">US</option>
                                            <option value="International">International</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tax Form Status
                                        </label>
                                        <select
                                            value={editingTutor.tutorInfo?.taxFormStatus || 'Pending'}
                                            onChange={(e) => setEditingTutor(prev => ({
                                                ...prev,
                                                tutorInfo: { ...prev.tutorInfo, taxFormStatus: e.target.value }
                                            }))}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="W9_Complete">W9 Complete (US)</option>
                                            <option value="W8BEN_Complete">W8BEN Complete (International)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Availability Schedule */}
                            <div className="border-b pb-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                    <Clock className="w-5 h-5 mr-2" />
                                    Availability Schedule
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Set custom working hours for this tutor. This will override the system default schedule.
                                </p>
                                {availabilityLoading ? (
                                    <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {DAYS_OF_WEEK.map((day) => {
                                            const daySchedule = tutorAvailability.weeklySchedule?.find(s => s.day === day) || {
                                                day,
                                                available: false,
                                                startTime: '09:00',
                                                endTime: '17:00',
                                            };
                                            return (
                                                <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                                                    <div className="flex items-center gap-2 w-24">
                                                        <input
                                                            type="checkbox"
                                                            checked={daySchedule.available || false}
                                                            onChange={(e) => handleTutorAvailabilityChange(day, 'available', e.target.checked)}
                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm font-medium">{day}</span>
                                                    </div>
                                                    {daySchedule.available && (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <label className="text-xs text-gray-500">Start:</label>
                                                                <input
                                                                    type="time"
                                                                    value={daySchedule.startTime || '09:00'}
                                                                    onChange={(e) => handleTutorAvailabilityChange(day, 'startTime', e.target.value)}
                                                                    className="p-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <label className="text-xs text-gray-500">End:</label>
                                                                <input
                                                                    type="time"
                                                                    value={daySchedule.endTime || '17:00'}
                                                                    onChange={(e) => handleTutorAvailabilityChange(day, 'endTime', e.target.value)}
                                                                    className="p-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingTutor(null);
                                        setTutorAvailability({
                                            weeklySchedule: [],
                                            timezone: 'America/New_York',
                                            hasCustomAvailability: false,
                                        });
                                    }}
                                    disabled={isUpdatingTutor}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={isUpdatingTutor}
                                    disabled={isUpdatingTutor}
                                >
                                    Update Tutor
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Display Modal */}
            {showPasswordModal && createdTutorPassword && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Tutor Account Created</h2>
                            <button
                                onClick={handleClosePasswordModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800 mb-2">
                                    <Mail className="w-4 h-4 inline mr-2" />
                                    An email with login credentials has been sent to the tutor.
                                </p>
                                <p className="text-sm text-blue-700">
                                    If email is not configured, please share the default password below with the tutor.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Default Password
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={createdTutorPassword}
                                        readOnly
                                        className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 font-mono text-lg font-bold text-center"
                                    />
                                    <button
                                        onClick={handleCopyPassword}
                                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                                        title="Copy password"
                                    >
                                        <Copy className="w-5 h-5 text-gray-700" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    The tutor should change this password after their first login.
                                </p>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button
                                    variant="primary"
                                    onClick={handleClosePasswordModal}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
