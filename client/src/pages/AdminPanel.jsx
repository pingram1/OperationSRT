import React, { useState, useMemo } from 'react';
import { Users, UserCheck, Briefcase, Search, Edit, Trash2 } from 'lucide-react';

// --- MOCK DATA (to be replaced by API calls) ---
const adminStats = {
    totalUsers: 124,
    activeTutors: 18,
    pendingAppointments: 5,
};

const allUsersData = [
    { id: 'usr_1', name: 'Alex Smith', email: 'alex.s@example.com', role: 'student', joined: '2025-06-15' },
    { id: 'usr_2', name: 'Jane Smith', email: 'jane.s@example.com', role: 'parent', joined: '2025-06-15' },
    { id: 'usr_3', name: 'Mr. Davis', email: 'davis.tutor@example.com', role: 'tutor', joined: '2025-05-20' },
    { id: 'usr_4', name: 'Ben Carter', email: 'ben.c@example.com', role: 'student', joined: '2025-06-14' },
    { id: 'usr_5', name: 'Ms. Chen', email: 'chen.tutor@example.com', role: 'tutor', joined: '2025-04-10' },
    { id: 'usr_6', name: 'Admin User', email: 'admin@startright.com', role: 'admin', joined: '2025-01-01' },
];

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

// --- Admin Panel Main Component ---
export default function AdminPanel() {
    const [users, setUsers] = useState(allUsersData);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div>
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
                <p className="text-gray-600">Platform overview and user management.</p>
            </header>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Users" value={adminStats.totalUsers} icon={Users} />
                <StatCard title="Active Tutors" value={adminStats.activeTutors} icon={UserCheck} />
                <StatCard title="Pending Appointments" value={adminStats.pendingAppointments} icon={Briefcase} />
            </div>

            {/* User Management Table */}
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">User Management</h2>
                    <div className="relative w-full md:w-1/3">
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

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Joined</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-800">{user.name}</td>
                                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'tutor' ? 'bg-green-100 text-green-800' :
                                            user.role === 'parent' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                        }`}>{user.role}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{formatDate(user.joined)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-gray-500 hover:text-blue-600" aria-label="Edit user"><Edit className="w-5 h-5" /></button>
                                        <button className="p-2 text-gray-500 hover:text-red-600" aria-label="Delete user"><Trash2 className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
