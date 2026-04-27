import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, BellRing, Shield, CreditCard, Save, AlertTriangle, CheckCircle, AlertCircle as AlertIcon, X, Lock, Key, GraduationCap, BookOpen, Target, Eye, EyeOff, Clock, Users, Mail, UserPlus, UserCheck, UserX, Send, Brain, ArrowRight, Award, Upload, Trash2, Edit2, Image as ImageIcon, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { updateUserProfile, updatePassword, enableTwoFactor, disableTwoFactor, sendParentLinkRequest, getParentLinkRequests, acceptParentLinkRequest, rejectParentLinkRequest, cancelParentLinkRequest, updateStudentPaymentPermission, uploadCertificationBadge, deleteCertificationBadge, updateCertificationBadge } from '../api/users.js';
import { getSubjects } from '../api/systemConfig.js';
import { getMyAvailability, updateMyAvailability } from '../api/availability.js';
import { getSecureToken } from '../api/authStorage.js';
import { getAllMembershipPlans, getCurrentMembership } from '../api/memberships.js';
import { AuthenticatedImage } from '../components/common/AuthenticatedImage.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { useConfirm } from '../components/common/ConfirmDialog.jsx';

// Reusable Components
const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="border-b pb-4 mb-6">
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-3 text-blue-500" />
            <div>
                <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
                <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
        </div>
    </div>
);

const Toggle = ({ label, enabled, onToggle, disabled = false }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
        <div>
            <span className="text-gray-700 font-medium">{label}</span>
            {enabled && (
                <span className="ml-2 text-xs text-green-600 font-semibold">Enabled</span>
            )}
        </div>
        <button 
            onClick={onToggle} 
            disabled={disabled}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

// Password Change Modal
const PasswordChangeModal = ({ isOpen, onClose, onSave, error, isLoading }) => {
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setValidationError('');
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPasswords({ ...passwords, [name]: value });
        setValidationError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError('');

        // Validation
        if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
            setValidationError('All fields are required');
            return;
        }

        if (passwords.newPassword.length < 6) {
            setValidationError('New password must be at least 6 characters long');
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            setValidationError('New passwords do not match');
            return;
        }

        if (passwords.currentPassword === passwords.newPassword) {
            setValidationError('New password must be different from current password');
            return;
        }

        try {
            await onSave(passwords.currentPassword, passwords.newPassword);
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            // Error is handled by parent
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <Lock className="w-6 h-6 mr-2 text-blue-500" />
                        Change Password
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.current ? 'text' : 'password'}
                                name="currentPassword"
                                value={passwords.currentPassword}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-md pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                            >
                                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                name="newPassword"
                                value={passwords.newPassword}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-md pr-10"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                            >
                                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                name="confirmPassword"
                                value={passwords.confirmPassword}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-md pr-10"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                            >
                                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {(validationError || error) && (
                        <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                            <AlertIcon className="w-4 h-4 mr-2" />
                            {validationError || error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-medium flex items-center"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Updating...
                                </>
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Two-Factor Authentication Modal
const TwoFactorModal = ({ isOpen, onClose, isEnabled, onEnable, onDisable, isLoading, error }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <Shield className="w-6 h-6 mr-2 text-blue-500" />
                        Two-Factor Authentication
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-600">
                        {isEnabled
                            ? 'Two-factor authentication is currently enabled. This adds an extra layer of security to your account.'
                            : 'Two-factor authentication adds an extra layer of security to your account by requiring a second form of verification when you log in.'}
                    </p>

                    {!isEnabled && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                <strong>Note:</strong> When you enable two-factor authentication, you'll need to verify your identity with a code from an authenticator app when logging in.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                            <AlertIcon className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                        >
                            Cancel
                        </button>
                        {isEnabled ? (
                            <button
                                onClick={async () => {
                                    try {
                                        await onDisable();
                                        // Only close on success
                                        setTimeout(() => onClose(), 100);
                                    } catch (err) {
                                        // Error handled by parent, don't close modal
                                        console.error('Failed to disable 2FA:', err);
                                    }
                                }}
                                disabled={isLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 font-medium"
                            >
                                {isLoading ? 'Disabling...' : 'Disable 2FA'}
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    try {
                                        await onEnable();
                                        // Only close on success
                                        setTimeout(() => onClose(), 100);
                                    } catch (err) {
                                        // Error handled by parent, don't close modal
                                        console.error('Failed to enable 2FA:', err);
                                    }
                                }}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-medium"
                            >
                                {isLoading ? 'Enabling...' : 'Enable 2FA'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function SettingsPage() {
    const { user, refreshUser } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();

    // Profile state
    const [profile, setProfile] = useState({
        name: user?.name || '',
        email: user?.email || '',
    });

    // Student profile state
    const [studentProfile, setStudentProfile] = useState({
        gradeLevel: user?.studentProfile?.gradeLevel || '',
        grade: user?.studentProfile?.grade || '',
        subjectOfFocus: user?.studentProfile?.subjectOfFocus || [],
        learningStyle: user?.studentProfile?.learningStyle || '',
        academicGoals: user?.studentProfile?.academicGoals || '',
    });

    const [studentInstitution, setStudentInstitution] = useState({
        name: user?.studentInstitution?.name || '',
        type: user?.studentInstitution?.type || '',
        sector: user?.studentInstitution?.sector || '',
    });

    // Notification preferences
    const [notifications, setNotifications] = useState(
        user?.notifications || { email: true, sms: false, push: true }
    );

    // Available subjects from system config
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [subjectsLoading, setSubjectsLoading] = useState(true);

    // Tutor availability state
    const [tutorAvailability, setTutorAvailability] = useState({
        weeklySchedule: [],
        timezone: 'America/New_York',
        hasCustomAvailability: false,
    });
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilitySaving, setAvailabilitySaving] = useState(false);
    
    // Super admin tutor availability toggle
    const [availableAsTutor, setAvailableAsTutor] = useState(user?.availableAsTutor || false);
    const [savingTutorToggle, setSavingTutorToggle] = useState(false);

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
    const [twoFactorLoading, setTwoFactorLoading] = useState(false);
    
    // Certification badges state
    const [badgeUploading, setBadgeUploading] = useState(false);
    const [editingBadgeIndex, setEditingBadgeIndex] = useState(null);
    const [badgeForm, setBadgeForm] = useState({
        name: '',
        issuedBy: '',
        issueDate: '',
        expiryDate: '',
        credentialId: '',
        imageFile: null,
    });

    // Parent linking state
    const [linkRequests, setLinkRequests] = useState([]);
    const [linkRequestsLoading, setLinkRequestsLoading] = useState(false);
    const [studentEmail, setStudentEmail] = useState('');
    const [sendingRequest, setSendingRequest] = useState(false);
    
    // Payment permission state
    const [paymentPermissions, setPaymentPermissions] = useState({});
    const [updatingPermission, setUpdatingPermission] = useState({});

    // Membership state
    const [membershipPlans, setMembershipPlans] = useState([]);
    const [currentMembership, setCurrentMembership] = useState(null);
    const [membershipLoading, setMembershipLoading] = useState(false);

    // Assessment state
    const [assessmentStatus, setAssessmentStatus] = useState({
        completed: false,
        lastAssessmentDate: null,
        profile: null
    });
    const [assessmentLoading, setAssessmentLoading] = useState(false);

    const navigate = useNavigate();

    // Days of the week for tutor schedule
    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Fetch available subjects
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                setSubjectsLoading(true);
                const data = await getSubjects();
                setAvailableSubjects(data.subjects || []);
            } catch (err) {
                console.error('Failed to fetch subjects:', err);
            } finally {
                setSubjectsLoading(false);
            }
        };
        fetchSubjects();
    }, []);

    // Fetch membership data
    useEffect(() => {
        const fetchMembershipData = async () => {
            if (!user || user?.role === 'admin' || user?.role === 'super_admin') return;
            
            try {
                setMembershipLoading(true);
                const [plans, membership] = await Promise.all([
                    getAllMembershipPlans().catch(() => []),
                    getCurrentMembership().catch(() => null),
                ]);
                setMembershipPlans(plans || []);
                setCurrentMembership(membership);
            } catch (err) {
                console.error('Failed to fetch membership data:', err);
            } finally {
                setMembershipLoading(false);
            }
        };
        fetchMembershipData();
    }, [user]);

    // Fetch assessment status
    useEffect(() => {
        const fetchAssessmentStatus = async () => {
            if (!user) return;
            try {
                setAssessmentLoading(true);
                const token = getSecureToken();
                const response = await fetch('/api/assessment/status', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setAssessmentStatus(data);
                }
            } catch (err) {
                console.error('Failed to fetch assessment status:', err);
            } finally {
                setAssessmentLoading(false);
            }
        };
        fetchAssessmentStatus();
    }, [user]);

    // Fetch tutor availability
    useEffect(() => {
        const fetchTutorAvailability = async () => {
            if (user?.role !== 'tutor' && user?.role !== 'super_admin') return;
            
            try {
                setAvailabilityLoading(true);
                const data = await getMyAvailability();
                
                // Initialize schedule with all days
                let weeklySchedule = DAYS_OF_WEEK.map(day => {
                    // Check if custom schedule exists for this day
                    if (data.hasCustomAvailability && data.customSchedule?.weeklySchedule) {
                        const customDay = data.customSchedule.weeklySchedule.find(s => s.day === day);
                        if (customDay) {
                            return customDay;
                        }
                    }
                    // Otherwise use system default
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
                    hasCustomAvailability: data.hasCustomAvailability || false,
                });
            } catch (err) {
                console.error('Failed to fetch tutor availability:', err);
                // If error, initialize with empty schedule
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
        fetchTutorAvailability();
        // Update availableAsTutor when user changes
        if (user) {
            setAvailableAsTutor(user.availableAsTutor || false);
        }
    }, [user?.role, user?._id, user?.availableAsTutor]);

    // Update state when user changes
    useEffect(() => {
        if (user) {
            setProfile({
                name: user.name || '',
                email: user.email || '',
            });
            setStudentProfile({
                gradeLevel: user.studentProfile?.gradeLevel || '',
                grade: user.studentProfile?.grade || '',
                subjectOfFocus: user.studentProfile?.subjectOfFocus || [],
                learningStyle: user.studentProfile?.learningStyle || '',
                academicGoals: user.studentProfile?.academicGoals || '',
            });
            setStudentInstitution({
                name: user.studentInstitution?.name || '',
                type: user.studentInstitution?.type || '',
                sector: user.studentInstitution?.sector || '',
            });
            setNotifications(user.notifications || { email: true, sms: false, push: true });
        }
    }, [user]);

    // Fetch parent link requests
    useEffect(() => {
        const fetchLinkRequests = async () => {
            if (user?.role !== 'parent' && user?.role !== 'student') return;
            
            try {
                setLinkRequestsLoading(true);
                const data = await getParentLinkRequests();
                setLinkRequests(data.requests || []);
            } catch (err) {
                console.error('Failed to fetch link requests:', err);
            } finally {
                setLinkRequestsLoading(false);
            }
        };
        
        if (user) {
            fetchLinkRequests();
        }
    }, [user]);

    // Load payment permissions from user profile
    useEffect(() => {
        if (user?.role === 'parent' && user?.studentPaymentSettings) {
            const permissions = {};
            // Convert Map to object if needed, or use directly if it's already an object
            if (user.studentPaymentSettings instanceof Map) {
                user.studentPaymentSettings.forEach((value, key) => {
                    permissions[key] = value.canMakePayments !== false; // Default to true
                });
            } else if (typeof user.studentPaymentSettings === 'object') {
                Object.keys(user.studentPaymentSettings).forEach(key => {
                    permissions[key] = user.studentPaymentSettings[key]?.canMakePayments !== false;
                });
            }
            setPaymentPermissions(permissions);
        }
    }, [user]);

    // Handle payment permission toggle
    const handlePaymentPermissionToggle = async (studentId, currentValue) => {
        const newValue = !currentValue;
        setUpdatingPermission(prev => ({ ...prev, [studentId]: true }));
        
        try {
            await updateStudentPaymentPermission(studentId, newValue);
            setPaymentPermissions(prev => ({ ...prev, [studentId]: newValue }));
            await refreshUser();
            setSuccess(`Payment permission ${newValue ? 'enabled' : 'disabled'} for student.`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to update payment permission:', err);
            setError(err.message || 'Failed to update payment permission. Please try again.');
            setTimeout(() => setError(''), 3000);
        } finally {
            setUpdatingPermission(prev => ({ ...prev, [studentId]: false }));
        }
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfile({ ...profile, [name]: value });
    };

    const handleStudentProfileChange = (e) => {
        const { name, value } = e.target;
        setStudentProfile({ ...studentProfile, [name]: value });
    };

    const handleStudentInstitutionChange = (e) => {
        const { name, value } = e.target;
        setStudentInstitution({ ...studentInstitution, [name]: value });
    };

    const handleSubjectToggle = (subject) => {
        const currentSubjects = studentProfile.subjectOfFocus || [];
        if (currentSubjects.includes(subject)) {
            setStudentProfile({
                ...studentProfile,
                subjectOfFocus: currentSubjects.filter(s => s !== subject),
            });
        } else {
            setStudentProfile({
                ...studentProfile,
                subjectOfFocus: [...currentSubjects, subject],
            });
        }
    };

    const handleNotificationToggle = (key) => {
        setNotifications({ ...notifications, [key]: !notifications[key] });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const updateData = {
                ...profile,
            };

            // Include student profile if user is a student
            if (user?.role === 'student') {
                updateData.studentProfile = studentProfile;
                updateData.studentInstitution = {
                    name: (studentInstitution.name || '').trim(),
                    type: studentInstitution.type || null,
                    sector: studentInstitution.sector || null,
                };
            }

            // Include notifications
            updateData.notifications = notifications;

            const updatedUser = await updateUserProfile(updateData);
            await refreshUser();
            setSuccess('Profile updated successfully!');
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to update profile:', err);
            setError(err.message || 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordUpdate = async (currentPassword, newPassword) => {
        setPasswordLoading(true);
        setPasswordError('');

        try {
            await updatePassword(currentPassword, newPassword);
            setPasswordModalOpen(false);
            setSuccess('Password updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to update password:', err);
            setPasswordError(err.message || 'Failed to update password.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleEnable2FA = async () => {
        setTwoFactorLoading(true);
        setError('');
        try {
            await enableTwoFactor();
            await refreshUser();
            setSuccess('Two-factor authentication enabled successfully!');
            setTimeout(() => setSuccess(''), 3000);
            return true; // Return success
        } catch (err) {
            console.error('Failed to enable 2FA:', err);
            setError(err.message || 'Failed to enable two-factor authentication.');
            throw err; // Re-throw to prevent modal from closing
        } finally {
            setTwoFactorLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        setTwoFactorLoading(true);
        setError('');
        try {
            await disableTwoFactor();
            await refreshUser();
            setSuccess('Two-factor authentication disabled successfully!');
            setTimeout(() => setSuccess(''), 3000);
            return true; // Return success
        } catch (err) {
            console.error('Failed to disable 2FA:', err);
            setError(err.message || 'Failed to disable two-factor authentication.');
            throw err; // Re-throw to prevent modal from closing
        } finally {
            setTwoFactorLoading(false);
        }
    };

    // Tutor availability handlers
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

    const handleSaveTutorAvailability = async () => {
        if (user?.role !== 'tutor' && user?.role !== 'super_admin') return;
        
        setAvailabilitySaving(true);
        setError('');
        setSuccess('');
        
        try {
            await updateMyAvailability({
                weeklySchedule: tutorAvailability.weeklySchedule,
                timezone: tutorAvailability.timezone,
            });
            setSuccess('Availability updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to update availability:', err);
            setError(err.message || 'Failed to update availability.');
        } finally {
            setAvailabilitySaving(false);
        }
    };

    // Grade options based on grade level
    const getGradeOptions = (gradeLevel) => {
        switch (gradeLevel) {
            case 'Elementary':
                return ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade'];
            case 'Middle School':
                return ['6th Grade', '7th Grade', '8th Grade'];
            case 'High School':
                return ['9th Grade', '10th Grade', '11th Grade', '12th Grade'];
            case 'College':
                return ['Freshman', 'Sophomore', 'Junior', 'Senior'];
            case 'Graduate':
                return ['Master\'s', 'PhD', 'Professional'];
            default:
                return [];
        }
    };

    const gradeOptions = getGradeOptions(studentProfile.gradeLevel);

    // Parent linking handlers
    const handleSendLinkRequest = async (e) => {
        e?.preventDefault();
        if (!studentEmail.trim()) {
            setError('Please enter a student email address');
            return;
        }

        setSendingRequest(true);
        setError('');
        setSuccess('');

        try {
            await sendParentLinkRequest(studentEmail.trim(), '');
            setSuccess('Link request sent successfully! The student will need to accept it.');
            setStudentEmail('');
            // Refresh link requests
            const data = await getParentLinkRequests();
            setLinkRequests(data.requests || []);
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error('Failed to send link request:', err);
            setError(err.message || 'Failed to send link request. Please try again.');
        } finally {
            setSendingRequest(false);
        }
    };

    const handleAcceptRequest = async (requestId) => {
        try {
            setError('');
            setSuccess('');
            await acceptParentLinkRequest(requestId);
            setSuccess('Link request accepted! The parent is now linked to your account.');
            // Refresh link requests and user data
            const data = await getParentLinkRequests();
            setLinkRequests(data.requests || []);
            await refreshUser();
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error('Failed to accept link request:', err);
            setError(err.message || 'Failed to accept link request. Please try again.');
        }
    };

    const handleRejectRequest = async (requestId) => {
        const ok = await confirm({
            title: 'Reject link request?',
            message: 'Are you sure you want to reject this link request?',
            confirmLabel: 'Reject',
            danger: true,
        });
        if (!ok) {
            return;
        }

        try {
            setError('');
            setSuccess('');
            await rejectParentLinkRequest(requestId);
            setSuccess('Link request rejected.');
            // Refresh link requests
            const data = await getParentLinkRequests();
            setLinkRequests(data.requests || []);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to reject link request:', err);
            setError(err.message || 'Failed to reject link request. Please try again.');
        }
    };

    const handleCancelRequest = async (requestId) => {
        const ok = await confirm({
            title: 'Cancel link request?',
            message: 'Are you sure you want to cancel this link request?',
            confirmLabel: 'Cancel request',
            cancelLabel: 'Keep request',
            danger: true,
        });
        if (!ok) {
            return;
        }

        try {
            setError('');
            setSuccess('');
            await cancelParentLinkRequest(requestId);
            setSuccess('Link request cancelled.');
            // Refresh link requests
            const data = await getParentLinkRequests();
            setLinkRequests(data.requests || []);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to cancel link request:', err);
            setError(err.message || 'Failed to cancel link request. Please try again.');
        }
    };

    // Filter link requests
    const pendingRequests = linkRequests.filter(r => r.status === 'pending');
    const sentRequests = user?.role === 'parent' ? pendingRequests.filter(r => r.parent?._id === user._id || r.parent?.id === user.id) : [];
    const receivedRequests = user?.role === 'student' ? pendingRequests.filter(r => r.student?._id === user._id || r.student?.id === user.id) : [];
    const linkedChildren = user?.role === 'parent' && user?.children ? user.children : [];

    return (
        <div>
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Account Settings</h1>
                <p className="text-gray-600">Manage your profile, subscription, and preferences.</p>
            </header>

            {/* Success/Error Messages */}
            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {success}
                </div>
            )}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                    <AlertIcon className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {/* Main Content */}
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Left Column --- */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile Information */}
                    <Card>
                        <CardHeader 
                            icon={User} 
                            title="Profile Information" 
                            subtitle="Update your personal details." 
                        />
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div className="flex items-center space-x-6">
                                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <button 
                                    type="button" 
                                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
                                    onClick={() => toast.info('Avatar upload coming soon!')}
                                >
                                    Change Picture
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={profile.name}
                                        onChange={handleProfileChange}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profile.email}
                                        onChange={handleProfileChange}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </Card>

                    {/* Learning Style Assessment */}
                    <Card>
                        <CardHeader
                            icon={Brain}
                            title="Learning Style Assessment"
                            subtitle={assessmentStatus.completed 
                                ? "Your learning style profile helps us match you with the perfect tutor."
                                : "Complete your assessment to get personalized tutor matches."}
                        />
                        {assessmentLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Loading assessment status...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {assessmentStatus.completed ? (
                                    <>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center mb-2">
                                                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                                <p className="text-sm font-semibold text-green-800">Assessment Completed</p>
                                            </div>
                                            {assessmentStatus.lastAssessmentDate && (
                                                <p className="text-xs text-green-700 mt-1">
                                                    Last completed: {new Date(assessmentStatus.lastAssessmentDate).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        {user?.role === 'tutor' || user?.role === 'super_admin' ? (
                                            <div className="space-y-3">
                                                {assessmentStatus.profile?.teachingStrengths && assessmentStatus.profile.teachingStrengths.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Teaching Strengths</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {assessmentStatus.profile.teachingStrengths.map((strength, idx) => (
                                                                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                                                    {strength}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {assessmentStatus.profile?.subjectExpertise && Object.keys(assessmentStatus.profile.subjectExpertise).length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Subject Expertise</h4>
                                                        <div className="space-y-1">
                                                            {Object.entries(assessmentStatus.profile.subjectExpertise).map(([subject, level]) => (
                                                                <div key={subject} className="flex items-center justify-between text-sm">
                                                                    <span className="text-gray-700">{subject}</span>
                                                                    <span className="text-blue-600 font-semibold">{level}/10</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            assessmentStatus.profile?.learningNeeds && assessmentStatus.profile.learningNeeds.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Learning Needs</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {assessmentStatus.profile.learningNeeds.map((need, idx) => (
                                                            <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                                                {need}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                        <button
                                            onClick={() => navigate('/assessment')}
                                            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
                                        >
                                            Retake Assessment
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <p className="text-sm text-yellow-800">
                                                <strong>Not Completed:</strong> Complete your learning style assessment to get personalized tutor matches based on how you learn best.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/assessment')}
                                            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
                                        >
                                            Start Assessment
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </Card>

                    {/* Super Admin Tutor Availability Toggle */}
                    {user?.role === 'super_admin' && (
                        <Card>
                            <CardHeader
                                icon={UserCheck}
                                title="Tutor Availability"
                                subtitle="Enable this to appear as a tutor option for students and parents when booking sessions."
                            />
                            <div className="space-y-4">
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <p className="text-sm text-purple-800">
                                        <strong>Super Admin Mode:</strong> As a super admin, you can toggle your availability as a tutor. 
                                        When enabled, you'll appear in tutor selection dropdowns and can be booked for sessions just like regular tutors.
                                    </p>
                                </div>
                                <Toggle
                                    label="Available as Tutor"
                                    enabled={availableAsTutor}
                                    onToggle={async () => {
                                        const newValue = !availableAsTutor;
                                        setSavingTutorToggle(true);
                                        try {
                                            await updateUserProfile({ availableAsTutor: newValue });
                                            setAvailableAsTutor(newValue);
                                            setSuccess(newValue 
                                                ? 'You are now available as a tutor. Students can book sessions with you.' 
                                                : 'You are no longer available as a tutor.');
                                            setTimeout(() => setSuccess(''), 3000);
                                            await refreshUser();
                                        } catch (err) {
                                            setError(err.message || 'Failed to update tutor availability');
                                            setTimeout(() => setError(''), 3000);
                                        } finally {
                                            setSavingTutorToggle(false);
                                        }
                                    }}
                                    disabled={savingTutorToggle}
                                />
                                {availableAsTutor && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <p className="text-sm text-green-800">
                                            ✓ You are currently available as a tutor. Students and parents can select you when booking sessions.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Tutor Availability Section (only for tutors and super_admin with tutor mode enabled) */}
                    {(user?.role === 'tutor' || (user?.role === 'super_admin' && availableAsTutor)) && (
                        <Card>
                            <CardHeader
                                icon={Clock}
                                title="My Availability"
                                subtitle="Set your working hours. This overrides the system default schedule for booking availability."
                            />
                            {availabilityLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-2 text-gray-600">Loading availability...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-sm text-blue-800">
                                            <strong>Note:</strong> Setting custom availability will override the system default schedule. 
                                            Students will only see time slots based on your availability when booking sessions with you.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Schedule</label>
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
                                    </div>
                                    <div className="flex justify-end pt-4 border-t">
                                        <button
                                            onClick={handleSaveTutorAvailability}
                                            disabled={availabilitySaving}
                                            className="flex items-center bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {availabilitySaving ? 'Saving...' : 'Save Availability'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Student Profile Section (only for students) */}
                    {user?.role === 'student' && (
                        <Card>
                            <CardHeader
                                icon={GraduationCap}
                                title="Student Profile"
                                subtitle="Help us personalize your learning experience and AI-generated content."
                            />
                            <form onSubmit={handleProfileSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Grade Level <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="gradeLevel"
                                            value={studentProfile.gradeLevel}
                                            onChange={handleStudentProfileChange}
                                            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select grade level</option>
                                            <option value="Elementary">Elementary</option>
                                            <option value="Middle School">Middle School</option>
                                            <option value="High School">High School</option>
                                            <option value="College">College</option>
                                            <option value="Graduate">Graduate</option>
                                        </select>
                                    </div>

                                    {studentProfile.gradeLevel && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Grade
                                            </label>
                                            <select
                                                name="grade"
                                                value={studentProfile.grade}
                                                onChange={handleStudentProfileChange}
                                                className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select grade</option>
                                                {gradeOptions.map(grade => (
                                                    <option key={grade} value={grade}>{grade}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Subjects of Focus <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Select the subjects you're currently studying. This helps AI generate personalized practice questions and study plans.
                                    </p>
                                    {subjectsLoading ? (
                                        <div className="text-center py-4">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                        </div>
                                    ) : availableSubjects.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {availableSubjects.map(subject => (
                                                <button
                                                    key={subject}
                                                    type="button"
                                                    onClick={() => handleSubjectToggle(subject)}
                                                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                                                        studentProfile.subjectOfFocus?.includes(subject)
                                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-300'
                                                    }`}
                                                >
                                                    <BookOpen className="w-4 h-4 inline-block mr-2" />
                                                    {subject}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">No subjects available. Please contact an administrator.</p>
                                    )}
                                    {studentProfile.subjectOfFocus?.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Selected: {studentProfile.subjectOfFocus.join(', ')}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Learning Style
                                    </label>
                                    <select
                                        name="learningStyle"
                                        value={studentProfile.learningStyle}
                                        onChange={handleStudentProfileChange}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select learning style (optional)</option>
                                        <option value="Visual">Visual - Learn best through images, diagrams, and visual aids</option>
                                        <option value="Auditory">Auditory - Learn best through listening and verbal instruction</option>
                                        <option value="Kinesthetic">Kinesthetic - Learn best through hands-on activities and movement</option>
                                        <option value="Reading/Writing">Reading/Writing - Learn best through reading and writing</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Academic Goals
                                    </label>
                                    <textarea
                                        name="academicGoals"
                                        value={studentProfile.academicGoals}
                                        onChange={handleStudentProfileChange}
                                        rows="3"
                                        placeholder="e.g., Improve math skills, prepare for college entrance exams, maintain a 3.5 GPA..."
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Describe your academic goals. This helps AI create more personalized study plans.
                                    </p>
                                </div>

                                <div className="border-t pt-6 mt-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Building2 className="w-5 h-5 text-blue-500" />
                                        <h4 className="text-sm font-semibold text-gray-800">School affiliation (learn-to-earn)</h4>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Scholarship credits from challenges and tutoring are only available if you attend a public or private high school, college, or technical/trade school.
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">School name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={studentInstitution.name}
                                                onChange={handleStudentInstitutionChange}
                                                placeholder="e.g. Central High School, State University"
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Institution type</label>
                                                <select
                                                    name="type"
                                                    value={studentInstitution.type}
                                                    onChange={handleStudentInstitutionChange}
                                                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">Select (optional until you use learn-to-earn)</option>
                                                    <option value="high_school">High school</option>
                                                    <option value="college">College / university</option>
                                                    <option value="technical_trade">Technical / trade school</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Public or private</label>
                                                <select
                                                    name="sector"
                                                    value={studentInstitution.sector}
                                                    onChange={handleStudentInstitutionChange}
                                                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">Select</option>
                                                    <option value="public">Public</option>
                                                    <option value="private">Private</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex items-center bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {isLoading ? 'Saving...' : 'Save Student Profile'}
                                    </button>
                                </div>
                            </form>
                        </Card>
                    )}

                    {/* Notification Settings */}
                    <Card>
                        <CardHeader 
                            icon={BellRing} 
                            title="Notifications" 
                            subtitle="Choose how you receive updates." 
                        />
                        <div className="max-w-md">
                            <Toggle 
                                label="Email Notifications" 
                                enabled={notifications.email} 
                                onToggle={() => handleNotificationToggle('email')} 
                            />
                            <Toggle 
                                label="SMS Text Messages" 
                                enabled={notifications.sms} 
                                onToggle={() => handleNotificationToggle('sms')} 
                            />
                            <Toggle 
                                label="In-App Push Notifications" 
                                enabled={notifications.push} 
                                onToggle={() => handleNotificationToggle('push')} 
                            />
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <button
                                onClick={handleProfileSubmit}
                                disabled={isLoading}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Save notification preferences
                            </button>
                        </div>
                    </Card>

                    {/* Parent Linking Section (for parents) */}
                    {user?.role === 'parent' && (
                        <Card>
                            <CardHeader 
                                icon={Users} 
                                title="Link Student Accounts" 
                                subtitle="Connect your account to your child's student account." 
                            />
                            <div className="space-y-6">
                                {/* Send Link Request */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Send Link Request</h4>
                                    <form onSubmit={handleSendLinkRequest} className="flex gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="email"
                                                value={studentEmail}
                                                onChange={(e) => setStudentEmail(e.target.value)}
                                                placeholder="Enter student's email address"
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={sendingRequest || !studentEmail.trim()}
                                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {sendingRequest ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Send Request
                                                </>
                                            )}
                                        </button>
                                    </form>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Enter your child's student account email. They will receive a request to link your accounts.
                                    </p>
                                </div>

                                {/* Linked Children */}
                                {linkRequestsLoading ? (
                                    <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-2 text-xs text-gray-600">Loading...</p>
                                    </div>
                                ) : linkedChildren.length > 0 ? (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Linked Children ({linkedChildren.length})</h4>
                                        <div className="space-y-3">
                                            {linkedChildren.map((child) => {
                                                const childId = child._id || child.id;
                                                const canMakePayments = paymentPermissions[childId] !== false; // Default to true
                                                const isUpdating = updatingPermission[childId];
                                                
                                                return (
                                                    <div 
                                                        key={childId}
                                                        className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3"
                                                >
                                                        <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                            {child.avatar ? (
                                                                <img 
                                                                    src={child.avatar} 
                                                                    alt={child.name} 
                                                                    className="w-10 h-10 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <User className="w-5 h-5 text-blue-600" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800">{child.name || 'Student'}</p>
                                                            <p className="text-sm text-gray-600">{child.email}</p>
                                                        </div>
                                                    </div>
                                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                                        Linked
                                                    </span>
                                                </div>
                                                        <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-700">Allow student to make payments</p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {canMakePayments 
                                                                        ? 'Student can pay for sessions directly' 
                                                                        : 'Payment requests will be sent to you'}
                                                                </p>
                                                            </div>
                                                            <button 
                                                                onClick={() => handlePaymentPermissionToggle(childId, canMakePayments)}
                                                                disabled={isUpdating}
                                                                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''} ${canMakePayments ? 'bg-blue-600' : 'bg-gray-300'}`}
                                                            >
                                                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${canMakePayments ? 'translate-x-6' : 'translate-x-1'}`} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}

                                {/* Pending Requests Sent */}
                                {!linkRequestsLoading && sentRequests.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Pending Requests Sent ({sentRequests.length})</h4>
                                        <div className="space-y-2">
                                            {sentRequests.map((request) => (
                                                <div 
                                                    key={request._id || request.id}
                                                    className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                                            {request.student?.avatar ? (
                                                                <img 
                                                                    src={request.student.avatar} 
                                                                    alt={request.student.name} 
                                                                    className="w-10 h-10 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <User className="w-5 h-5 text-yellow-600" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800">{request.student?.name || 'Student'}</p>
                                                            <p className="text-sm text-gray-600">{request.student?.email}</p>
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                Sent {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-US', { 
                                                                    month: 'short', 
                                                                    day: 'numeric',
                                                                    year: 'numeric'
                                                                }) : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                                            Pending
                                                        </span>
                                                        <button
                                                            onClick={() => handleCancelRequest(request._id || request.id)}
                                                            className="px-3 py-1 text-xs text-red-600 hover:text-red-800 font-medium"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Student Link Requests Section (for students) */}
                    {user?.role === 'student' && (
                        <>
                            {/* Linked Parents Section */}
                            {user?.parents && user.parents.length > 0 && (
                                <Card>
                                    <CardHeader 
                                        icon={Users} 
                                        title="Linked Parents" 
                                        subtitle={`You are linked to ${user.parents.length} parent${user.parents.length > 1 ? 's' : ''}.`} 
                                    />
                                    <div className="space-y-3">
                                        {user.parents.map((parent) => (
                                            <div 
                                                key={parent._id || parent.id}
                                                className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                                        <User className="w-6 h-6 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{parent.name || 'Parent'}</p>
                                                        <p className="text-sm text-gray-600">{parent.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                                        Linked
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Parent Link Requests Section */}
                            <Card>
                                <CardHeader 
                                    icon={Users} 
                                    title="Parent Link Requests" 
                                    subtitle={receivedRequests.length > 0 
                                        ? "You have pending requests from parents to link their accounts." 
                                        : "No pending parent link requests."} 
                                />
                                {linkRequestsLoading ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-2 text-gray-600">Loading requests...</p>
                                    </div>
                                ) : receivedRequests.length > 0 ? (
                                    <div className="space-y-3">
                                        {receivedRequests.map((request) => (
                                            <div 
                                                key={request._id || request.id}
                                                className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <User className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{request.parent?.name || 'Parent'}</p>
                                                        <p className="text-sm text-gray-600">{request.parent?.email}</p>
                                                        {request.message && (
                                                            <p className="text-xs text-gray-500 mt-1">{request.message}</p>
                                                        )}
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Requested {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-US', { 
                                                                month: 'short', 
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            }) : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleAcceptRequest(request._id || request.id)}
                                                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                    >
                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRequest(request._id || request.id)}
                                                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                    >
                                                        <UserX className="w-4 h-4 mr-2" />
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No pending parent link requests.</p>
                                        <p className="text-sm text-gray-400 mt-2">Parents can send you a link request by entering your email address.</p>
                                    </div>
                                )}
                            </Card>
                        </>
                    )}
                </div>

                {/* --- Right Column --- */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Membership & Billing - Hidden for admin and super_admin users */}
                    {user?.role !== 'admin' && user?.role !== 'super_admin' && (
                        <Card>
                            <CardHeader 
                                icon={CreditCard} 
                                title="Membership & Billing" 
                                subtitle={membershipLoading ? "Loading membership information..." : `Your current plan is ${currentMembership?.plan || user?.membership?.plan || 'None'}.`} 
                            />
                            {membershipLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-2 text-gray-500 text-sm">Loading membership details...</p>
                                </div>
                            ) : (
                            <div className="space-y-4">
                                    {/* Current Membership Status */}
                                    {currentMembership?.plan || user?.membership?.plan ? (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                <div>
                                                    <h4 className="font-semibold text-gray-800">
                                                        {currentMembership?.plan || user?.membership?.plan}
                                                    </h4>
                                                    <p className="text-sm text-gray-600">
                                                        {currentMembership?.planId?.subtitle || 'Active Membership'}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                    currentMembership?.status === 'active' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : currentMembership?.status === 'expired'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {currentMembership?.status === 'active' ? 'Active' : 
                                                     currentMembership?.status === 'expired' ? 'Expired' : 
                                                     currentMembership?.status || 'Active'}
                                                </span>
                                            </div>
                                            
                                            {/* Membership Details */}
                                            <div className="space-y-2 text-sm">
                                                {currentMembership?.startDate && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Start Date:</span>
                                                        <span className="text-gray-800 font-medium">
                                                            {new Date(currentMembership.startDate).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                                {currentMembership?.endDate && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Renewal Date:</span>
                                                        <span className="text-gray-800 font-medium">
                                                            {new Date(currentMembership.endDate).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                                {currentMembership?.planId?.priceDisplay && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Price:</span>
                                                        <span className="text-gray-800 font-medium">
                                                            {currentMembership.planId.priceDisplay}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                                            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                            <p className="text-gray-600 font-medium">No Active Membership</p>
                                            <p className="text-sm text-gray-500 mt-1">Select a plan to get started</p>
                                        </div>
                                    )}

                                    {/* Available Plans Preview */}
                                    {membershipPlans.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Available Plans</h4>
                                            <div className="space-y-2">
                                                {membershipPlans.slice(0, 3).map((plan) => {
                                                    const isCurrentPlan = (currentMembership?.plan || user?.membership?.plan) === plan.name;
                                                    return (
                                                        <div 
                                                            key={plan._id || plan.id}
                                                            className={`border rounded-lg p-3 ${
                                                                isCurrentPlan 
                                                                    ? 'border-blue-500 bg-blue-50' 
                                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <h5 className="font-semibold text-gray-800">
                                                                            {plan.name}
                                                                        </h5>
                                                                        {isCurrentPlan && (
                                                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white">
                                                                                Current
                                                                            </span>
                                                                        )}
                                                                        {plan.isFeatured && !isCurrentPlan && (
                                                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                                                Featured
                                                                            </span>
                                                                        )}
                                </div>
                                                                    <p className="text-xs text-gray-600 mt-0.5">{plan.subtitle}</p>
                                                                    <p className="text-sm font-semibold text-gray-800 mt-1">
                                                                        {plan.priceDisplay}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="space-y-2 pt-2 border-t">
                                <button
                                            onClick={() => navigate('/appointments?tab=membership')}
                                            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
                                >
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            {currentMembership?.plan || user?.membership?.plan 
                                                ? 'View or Change Plan' 
                                                : 'Select a Plan'}
                                </button>
                                        {/* Show billing history button for students and parents */}
                                        {(user?.role === 'student' || user?.role === 'parent') && (
                                            <button
                                                onClick={() => {
                                                    // Navigate to student billing history for students, parent portal for parents
                                                    if (user?.role === 'student') {
                                                        navigate('/student-billing-history');
                                                    } else if (user?.role === 'parent') {
                                                        navigate('/parent-portal?tab=billing');
                                                    }
                                                }}
                                                className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
                                            >
                                                <Clock className="w-4 h-4 mr-2" />
                                                View Billing History
                                            </button>
                                        )}
                            </div>

                                    {/* Plan Features Preview */}
                                    {currentMembership?.planId?.features && currentMembership.planId.features.length > 0 && (
                                        <div className="pt-2 border-t">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Plan Features</h4>
                                            <ul className="space-y-1">
                                                {currentMembership.planId.features.slice(0, 3).map((feature, index) => (
                                                    <li key={index} className="flex items-start text-sm text-gray-600">
                                                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                                {currentMembership.planId.features.length > 3 && (
                                                    <li className="text-xs text-gray-500 italic">
                                                        +{currentMembership.planId.features.length - 3} more features
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Account Security */}
                    <Card>
                        <CardHeader 
                            icon={Shield} 
                            title="Security" 
                            subtitle="Manage your account security." 
                        />
                        <div className="space-y-3">
                            <button
                                onClick={() => setPasswordModalOpen(true)}
                                className="w-full text-left bg-gray-100 hover:bg-gray-200 p-3 rounded-md font-medium text-gray-800 transition-colors flex items-center"
                            >
                                <Lock className="w-5 h-5 mr-2 text-gray-600" />
                                Change Password
                            </button>
                            <button
                                onClick={() => setTwoFactorModalOpen(true)}
                                className="w-full text-left bg-gray-100 hover:bg-gray-200 p-3 rounded-md font-medium text-gray-800 transition-colors flex items-center justify-between"
                            >
                                <div className="flex items-center">
                                    <Key className="w-5 h-5 mr-2 text-gray-600" />
                                    Two-Factor Authentication
                                </div>
                                {user?.twoFactorEnabled && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                        Enabled
                                    </span>
                                )}
                            </button>
                        </div>
                    </Card>

                    {/* Certification Badges (Tutors, Admins, Super Admins only) */}
                    {(user?.role === 'tutor' || user?.role === 'admin' || user?.role === 'super_admin') && (
                        <Card>
                            <CardHeader 
                                icon={Award} 
                                title="Certification Badges" 
                                subtitle="Upload and manage your professional certifications." 
                            />
                            <div className="space-y-4">
                                {/* Upload New Badge Form */}
                                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <h4 className="font-semibold text-gray-800 mb-3">
                                        {editingBadgeIndex !== null ? 'Edit Badge' : 'Upload New Badge'}
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Badge Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={badgeForm.name}
                                                onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                                                placeholder="e.g., AWS Certified Developer"
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Issued By
                                            </label>
                                            <input
                                                type="text"
                                                value={badgeForm.issuedBy}
                                                onChange={(e) => setBadgeForm({ ...badgeForm, issuedBy: e.target.value })}
                                                placeholder="e.g., Amazon Web Services"
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Issue Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={badgeForm.issueDate}
                                                    onChange={(e) => setBadgeForm({ ...badgeForm, issueDate: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Expiry Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={badgeForm.expiryDate}
                                                    onChange={(e) => setBadgeForm({ ...badgeForm, expiryDate: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Credential ID
                                            </label>
                                            <input
                                                type="text"
                                                value={badgeForm.credentialId}
                                                onChange={(e) => setBadgeForm({ ...badgeForm, credentialId: e.target.value })}
                                                placeholder="e.g., AWS-CERT-123456"
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Badge Image <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/gif,image/webp"
                                                onChange={(e) => setBadgeForm({ ...badgeForm, imageFile: e.target.files[0] })}
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required={editingBadgeIndex === null}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Accepted formats: JPG, PNG, GIF, WEBP (max 5MB)
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!badgeForm.name || (!badgeForm.imageFile && editingBadgeIndex === null)) {
                                                        setError('Badge name and image are required');
                                                        setTimeout(() => setError(''), 3000);
                                                        return;
                                                    }
                                                    setBadgeUploading(true);
                                                    setError('');
                                                    try {
                                                        const formData = new FormData();
                                                        if (badgeForm.imageFile) {
                                                            formData.append('badgeImage', badgeForm.imageFile);
                                                        }
                                                        formData.append('name', badgeForm.name);
                                                        if (badgeForm.issuedBy) formData.append('issuedBy', badgeForm.issuedBy);
                                                        if (badgeForm.issueDate) formData.append('issueDate', badgeForm.issueDate);
                                                        if (badgeForm.expiryDate) formData.append('expiryDate', badgeForm.expiryDate);
                                                        if (badgeForm.credentialId) formData.append('credentialId', badgeForm.credentialId);

                                                        if (editingBadgeIndex !== null) {
                                                            await updateCertificationBadge(editingBadgeIndex, formData);
                                                            setSuccess('Badge updated successfully!');
                                                        } else {
                                                            await uploadCertificationBadge(formData);
                                                            setSuccess('Badge uploaded successfully!');
                                                        }
                                                        setBadgeForm({ name: '', issuedBy: '', issueDate: '', expiryDate: '', credentialId: '', imageFile: null });
                                                        setEditingBadgeIndex(null);
                                                        await refreshUser();
                                                        setTimeout(() => setSuccess(''), 3000);
                                                    } catch (err) {
                                                        console.error('Failed to upload badge:', err);
                                                        setError(err.message || 'Failed to upload badge. Please try again.');
                                                        setTimeout(() => setError(''), 3000);
                                                    } finally {
                                                        setBadgeUploading(false);
                                                    }
                                                }}
                                                disabled={badgeUploading}
                                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                                            >
                                                <Upload className="w-4 h-4 mr-2" />
                                                {badgeUploading ? 'Uploading...' : (editingBadgeIndex !== null ? 'Update Badge' : 'Upload Badge')}
                                            </button>
                                            {editingBadgeIndex !== null && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingBadgeIndex(null);
                                                        setBadgeForm({ name: '', issuedBy: '', issueDate: '', expiryDate: '', credentialId: '', imageFile: null });
                                                    }}
                                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Existing Badges */}
                                {user?.certificationBadges && user.certificationBadges.length > 0 ? (
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-gray-800">Your Badges</h4>
                                        {user.certificationBadges.map((badge, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                                                <div className="flex items-start gap-4">
                                                    <AuthenticatedImage
                                                        src={badge.imageUrl}
                                                        alt={badge.name}
                                                        className="w-20 h-20 object-contain rounded border border-gray-200"
                                                    />
                                                    <div className="flex-1">
                                                        <h5 className="font-semibold text-gray-800">{badge.name}</h5>
                                                        {badge.issuedBy && <p className="text-sm text-gray-600">{badge.issuedBy}</p>}
                                                        {badge.credentialId && <p className="text-xs text-gray-500">ID: {badge.credentialId}</p>}
                                                        {badge.issueDate && (
                                                            <p className="text-xs text-gray-500">
                                                                Issued: {new Date(badge.issueDate).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                        {badge.expiryDate && (
                                                            <p className="text-xs text-gray-500">
                                                                Expires: {new Date(badge.expiryDate).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                setEditingBadgeIndex(index);
                                                                setBadgeForm({
                                                                    name: badge.name,
                                                                    issuedBy: badge.issuedBy || '',
                                                                    issueDate: badge.issueDate ? new Date(badge.issueDate).toISOString().split('T')[0] : '',
                                                                    expiryDate: badge.expiryDate ? new Date(badge.expiryDate).toISOString().split('T')[0] : '',
                                                                    credentialId: badge.credentialId || '',
                                                                    imageFile: null,
                                                                });
                                                            }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Edit badge"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const ok = await confirm({
                                                                    title: 'Delete badge?',
                                                                    message: 'Are you sure you want to delete this badge?',
                                                                    confirmLabel: 'Delete',
                                                                    danger: true,
                                                                });
                                                                if (!ok) return;
                                                                setError('');
                                                                try {
                                                                    await deleteCertificationBadge(index);
                                                                    setSuccess('Badge deleted successfully!');
                                                                    await refreshUser();
                                                                    setTimeout(() => setSuccess(''), 3000);
                                                                } catch (err) {
                                                                    console.error('Failed to delete badge:', err);
                                                                    setError(err.message || 'Failed to delete badge. Please try again.');
                                                                    setTimeout(() => setError(''), 3000);
                                                                }
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete badge"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">No certification badges uploaded yet.</p>
                                        <p className="text-xs text-gray-400 mt-1">Upload your first badge using the form above.</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            </main>

            {/* Modals */}
            <PasswordChangeModal
                isOpen={passwordModalOpen}
                onClose={() => {
                    setPasswordModalOpen(false);
                    setPasswordError('');
                }}
                onSave={handlePasswordUpdate}
                error={passwordError}
                isLoading={passwordLoading}
            />

            <TwoFactorModal
                isOpen={twoFactorModalOpen}
                onClose={() => {
                    setTwoFactorModalOpen(false);
                    setError('');
                }}
                isEnabled={user?.twoFactorEnabled || false}
                onEnable={handleEnable2FA}
                onDisable={handleDisable2FA}
                isLoading={twoFactorLoading}
                error={error}
            />
        </div>
    );
}
