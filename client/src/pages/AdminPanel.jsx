import React, { useState, useMemo, useEffect } from 'react';
import { Users, UserCheck, Briefcase, Search, Edit, Trash2, X, UserPlus, UserMinus, Link2, Shield } from 'lucide-react';
import { getAllUsers, updateUser, deleteUser, getStudents, linkChildToParent, unlinkChildFromParent } from '../api/users.js';
import { getAllBookings } from '../api/bookings.js';
import { registerEmployee } from '../api/auth.js';
import { getSecureToken } from '../api/authStorage.js';

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
const StatCard = ({ title, value, icon: Icon }) => (
    <Card className="flex items-center">
        <div className="p-3 bg-blue-100 rounded-lg mr-4">
            <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </Card>
);

// --- Create User Modal Component ---
const CreateUserModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student'
    });
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'student'
            });
            setError(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        setError(null);

        // Validation
        if (!formData.name || !formData.email || !formData.password) {
            setError('Name, email, and password are required');
            setIsCreating(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            setIsCreating(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsCreating(false);
            return;
        }

        try {
            const token = getSecureToken();
            
            // For employees (tutor/admin/super_admin), use registerEmployee
            if (formData.role === 'tutor' || formData.role === 'admin' || formData.role === 'super_admin') {
                await registerEmployee({
                    name: formData.name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password,
                    role: formData.role
                }, token);
            } else {
                // For students/parents, use registerUser endpoint
                // Since admin is creating, we'll use a direct API call
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: formData.name.trim(),
                        email: formData.email.trim().toLowerCase(),
                        password: formData.password,
                        role: formData.role
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ 
                        message: 'Failed to create user' 
                    }));
                    throw new Error(errorData.message || 'Failed to create user');
                }
            }

            onSave();
            onClose();
        } catch (err) {
            console.error('Failed to create user:', err);
            setError(err.message || 'Failed to create user');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Create New User</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="student">Student</option>
                            <option value="parent">Parent</option>
                            <option value="tutor">Tutor</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                        </select>
                        {formData.role === 'admin' && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin users have full system access
                            </p>
                        )}
                        {formData.role === 'super_admin' && (
                            <p className="text-xs text-purple-600 mt-1 flex items-center">
                                <Shield className="w-3 h-3 mr-1" />
                                Super Admin: Full system access + can function as a tutor
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                            minLength={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                            disabled={isCreating}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                            disabled={isCreating}
                        >
                            {isCreating ? 'Creating...' : (
                                <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Create User
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Edit User Modal Component ---
const EditUserModal = ({ user, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
        password: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user && isOpen) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                role: user.role || '',
                password: '' // Always start with empty password
            });
            setError(null);
        }
    }, [user, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const updateData = {
                name: formData.name,
                email: formData.email,
                role: formData.role
            };

            // Only include password if it's provided
            if (formData.password && formData.password.trim() !== '') {
                if (formData.password.length < 6) {
                    setError('Password must be at least 6 characters long');
                    setIsSaving(false);
                    return;
                }
                updateData.password = formData.password;
            }

            await updateUser(user._id || user.id, updateData);
            onSave();
            onClose();
        } catch (err) {
            console.error('Failed to update user:', err);
            setError(err.message || 'Failed to update user');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Edit User</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="student">Student</option>
                            <option value="parent">Parent</option>
                            <option value="tutor">Tutor</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password (leave blank to keep current password)
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Enter new password..."
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            minLength={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Minimum 6 characters. Leave blank if you don't want to change the password.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Link Parent-Student Modal Component ---
const LinkParentStudentModal = ({ parent, isOpen, onClose, onSave, allStudents = [] }) => {
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedStudentId('');
            setError(null);
        }
    }, [isOpen, parent]);

    const handleLink = async () => {
        if (!selectedStudentId) {
            setError('Please select a student');
            return;
        }

        setIsLinking(true);
        setError(null);

        try {
            await linkChildToParent(parent._id || parent.id, selectedStudentId);
            onSave();
            onClose();
        } catch (err) {
            console.error('Failed to link child to parent:', err);
            setError(err.message || 'Failed to link student to parent');
        } finally {
            setIsLinking(false);
        }
    };

    // Get already linked children IDs
    const linkedChildIds = parent?.children?.map(child => 
        typeof child === 'object' ? (child._id || child.id) : child
    ) || [];

    // Filter out already linked students
    const availableStudents = allStudents.filter(student => 
        !linkedChildIds.includes(student._id || student.id)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Link Student to Parent</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <p className="text-sm text-gray-600 mb-2">
                            Parent: <span className="font-semibold">{parent?.name}</span>
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Student
                        </label>
                        <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">-- Select a student --</option>
                            {availableStudents.map(student => (
                                <option key={student._id || student.id} value={student._id || student.id}>
                                    {student.name} ({student.email})
                                </option>
                            ))}
                        </select>
                        {availableStudents.length === 0 && (
                            <p className="text-sm text-gray-500 mt-2">
                                All available students are already linked to this parent.
                            </p>
                        )}
                    </div>

                    {parent?.children && parent.children.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Currently Linked Students:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                                {parent.children.map(child => {
                                    const childObj = typeof child === 'object' ? child : { name: 'Unknown', email: '' };
                                    return (
                                        <li key={childObj._id || childObj.id || child}>
                                            • {childObj.name} {childObj.email && `(${childObj.email})`}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                            disabled={isLinking}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleLink}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                            disabled={isLinking || !selectedStudentId}
                        >
                            {isLinking ? 'Linking...' : (
                                <>
                                    <Link2 className="w-4 h-4 mr-2" />
                                    Link Student
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Admin Panel Main Component ---
export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [adminStats, setAdminStats] = useState({ totalUsers: 0, activeTutors: 0, pendingAppointments: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [linkingParent, setLinkingParent] = useState(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [students, setStudents] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchAdminData = async () => {
        try {
            setIsLoading(true);
            const [usersData, bookingsData] = await Promise.all([
                getAllUsers(),
                getAllBookings()
            ]);
            
            setUsers(usersData || []);
            
            // Calculate stats
            const activeTutors = (usersData || []).filter(u => u.role === 'tutor').length;
            const pendingAppointments = (bookingsData || []).filter(b => b.status === 'scheduled').length;
            
            setAdminStats({
                totalUsers: (usersData || []).length,
                activeTutors,
                pendingAppointments
            });
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    const handleEditUser = (user) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
            return;
        }

        try {
            await deleteUser(user._id || user.id);
            // Refresh the user list
            await fetchAdminData();
            alert('User deleted successfully');
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert(`Error: ${error.message || 'Failed to delete user'}`);
        }
    };

    const handleSaveUser = () => {
        // Refresh the user list after saving
        fetchAdminData();
    };

    const handleLinkParent = async (parent) => {
        setLinkingParent(parent);
        setIsLinkModalOpen(true);
        
        // Fetch students if not already loaded
        if (students.length === 0) {
            try {
                const studentsData = await getStudents();
                setStudents(studentsData || []);
            } catch (error) {
                console.error('Failed to fetch students:', error);
            }
        }
    };

    const handleUnlinkChild = async (parent, childId) => {
        if (!window.confirm('Are you sure you want to unlink this student from the parent?')) {
            return;
        }

        try {
            await unlinkChildFromParent(parent._id || parent.id, childId);
            // Refresh the user list
            await fetchAdminData();
            alert('Student unlinked successfully');
        } catch (error) {
            console.error('Failed to unlink child:', error);
            alert(`Error: ${error.message || 'Failed to unlink student'}`);
        }
    };

    const handleLinkSave = () => {
        // Refresh the user list after linking
        fetchAdminData();
    };

    const filteredUsers = useMemo(() => {
        if (!users || users.length === 0) return [];
        return users.filter(user =>
            (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, searchTerm]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return dateString;
        }
    };

    return (
        <div>
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
                <p className="text-gray-600">Platform overview and user management.</p>
            </header>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Users" value={isLoading ? '...' : adminStats.totalUsers} icon={Users} />
                <StatCard title="Active Tutors" value={isLoading ? '...' : adminStats.activeTutors} icon={UserCheck} />
                <StatCard title="Pending Appointments" value={isLoading ? '...' : adminStats.pendingAppointments} icon={Briefcase} />
            </div>

            {/* User Management Table */}
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <UserPlus className="w-5 h-5" />
                            Create User
                        </button>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No users found.</div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Children/Info</th>
                                <th className="px-6 py-3">Joined</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredUsers.map((user) => {
                                const children = user.children || [];
                                const hasChildren = Array.isArray(children) && children.length > 0;
                                return (
                                    <tr key={user._id || user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-800">{user.name || 'N/A'}</td>
                                        <td className="px-6 py-4 text-gray-600">{user.email || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize whitespace-nowrap inline-block ${
                                                user.role === 'super_admin' ? 'bg-purple-200 text-purple-900' :
                                                user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                user.role === 'tutor' ? 'bg-green-100 text-green-800' :
                                                user.role === 'parent' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {user.role === 'super_admin' ? 'Super Admin' : (user.role || 'N/A')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.role === 'parent' ? (
                                                <div className="space-y-1">
                                                    {hasChildren ? (
                                                        children.map((child, idx) => {
                                                            const childObj = typeof child === 'object' ? child : { name: 'Unknown', _id: child };
                                                            return (
                                                                <div key={childObj._id || child || idx} className="flex items-center gap-2">
                                                                    <span className="text-sm text-gray-600">{childObj.name || 'Unknown'}</span>
                                                                    <button
                                                                        onClick={() => handleUnlinkChild(user, childObj._id || child)}
                                                                        className="text-red-500 hover:text-red-700"
                                                                        title="Unlink student"
                                                                    >
                                                                        <UserMinus className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No children linked</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleLinkParent(user)}
                                                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 mt-2"
                                                        title="Link student"
                                                    >
                                                        <UserPlus className="w-3 h-3" />
                                                        Link Student
                                                    </button>
                                                </div>
                                            ) : user.role === 'tutor' ? (
                                                <span className="text-xs text-gray-500">
                                                    {user.tutorInfo?.subjects?.join(', ') || 'No subjects'}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{formatDate(user.createdAt || user.joined)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleEditUser(user)}
                                                className="p-2 text-gray-500 hover:text-blue-600 transition-colors" 
                                                aria-label="Edit user"
                                                title="Edit user"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(user)}
                                                className="p-2 text-gray-500 hover:text-red-600 transition-colors" 
                                                aria-label="Delete user"
                                                title="Delete user"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                )}
            </Card>

            {/* Edit User Modal */}
            <EditUserModal
                user={editingUser}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingUser(null);
                }}
                onSave={handleSaveUser}
            />

            {/* Link Parent-Student Modal */}
            <LinkParentStudentModal
                parent={linkingParent}
                isOpen={isLinkModalOpen}
                onClose={() => {
                    setIsLinkModalOpen(false);
                    setLinkingParent(null);
                }}
                onSave={handleLinkSave}
                allStudents={students}
            />

            {/* Create User Modal */}
            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveUser}
            />
        </div>
    );
}
