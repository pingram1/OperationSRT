import React, { useState, useMemo } from 'react';
import { UserPlus, Users, DollarSign, Search, Check, X, FileText } from 'lucide-react';

// --- Reusable Components (can be moved to common folder) ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
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
    const variantStyles = { primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500', secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400', success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-400', danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' };
    const disabledStyles = 'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed';
    return (<button className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`} disabled={isLoading} {...rest}>{Icon && <Icon className="w-5 h-5 mr-2 -ml-1" />}{children}</button>);
};


// --- MOCK DATA ---
const initialApplications = [
    { id: 'app_1', name: 'Laura Williams', email: 'laura.w@example.com', subjects: ['English', 'History'], date: '2025-06-14' },
    { id: 'app_2', name: 'James Brown', email: 'james.b@example.com', subjects: ['Physics', 'Calculus'], date: '2025-06-12' },
];
const initialTutors = [
    { id: 'tut_1', name: 'Mr. Davis', email: 'davis.tutor@example.com', subjects: ['Algebra', 'Geometry'], hireDate: '2025-05-20' },
    { id: 'tut_2', name: 'Ms. Chen', email: 'chen.tutor@example.com', subjects: ['Chemistry'], hireDate: '2025-04-10' },
];

// --- Tutor Management Page Component ---
export default function HRPage() {
    const [applications, setApplications] = useState(initialApplications);
    const [tutors, setTutors] = useState(initialTutors);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTutors = useMemo(() => {
        return tutors.filter(tutor =>
            tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tutor.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [tutors, searchTerm]);

    const handleApprove = (application) => {
        // Add to tutors list and remove from applications
        const newTutor = { ...application, id: `tut_${Date.now()}`, hireDate: new Date().toISOString().split('T')[0] };
        setTutors(prev => [newTutor, ...prev]);
        setApplications(prev => prev.filter(app => app.id !== application.id));
    };
    
    const handleDeny = (id) => {
        setApplications(prev => prev.filter(app => app.id !== id));
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDate-String('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Tutor Management (HR)</h1>
                <p className="text-gray-600">Onboard new tutors, manage your current roster, and handle payroll.</p>
            </header>

            {/* Key Metric Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Pending Applications" value={applications.length} icon={FileText} iconBgColor="bg-yellow-100" iconColor="text-yellow-600" />
                <StatCard title="Active Tutors" value={tutors.length} icon={Users} />
                <StatCard title="Total Monthly Payroll" value="$4,500" icon={DollarSign} iconBgColor="bg-green-100" iconColor="text-green-600" />
                <StatCard title="New Tutors (Last 30d)" value="3" icon={UserPlus} />
            </div>

            {/* New Applications Table */}
            <div className="mb-8">
                <Card>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">New Tutor Applications</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-sm text-gray-500 bg-gray-50"><tr><th className="px-6 py-3">Applicant</th><th className="px-6 py-3">Subjects</th><th className="px-6 py-3">Applied On</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y">
                                {applications.length > 0 ? applications.map(app => (
                                    <tr key={app.id}>
                                        <td className="px-6 py-4"><div className="font-medium">{app.name}</div><div className="text-sm text-gray-500">{app.email}</div></td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{app.subjects.join(', ')}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(app.date)}</td>
                                        <td className="px-6 py-4 text-right space-x-2"><Button onClick={() => handleApprove(app)} variant="success" Icon={Check}>Approve</Button><Button onClick={() => handleDeny(app.id)} variant="danger" Icon={X}>Deny</Button></td>
                                    </tr>
                                )) : <tr><td colSpan="4" className="text-center py-8 text-gray-500">No pending applications.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            
            {/* Active Tutors Roster */}
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">Active Tutor Roster</h2>
                    <div className="relative w-full md:w-1/3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search tutors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" /></div>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-sm text-gray-500 bg-gray-50"><tr><th className="px-6 py-3">Tutor</th><th className="px-6 py-3">Subjects</th><th className="px-6 py-3">Hire Date</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
                        <tbody className="divide-y">
                            {filteredTutors.map(tutor => (
                                <tr key={tutor.id}>
                                    <td className="px-6 py-4"><div className="font-medium">{tutor.name}</div><div className="text-sm text-gray-500">{tutor.email}</div></td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{tutor.subjects.join(', ')}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(tutor.hireDate)}</td>
                                    <td className="px-6 py-4 text-right"><Button variant="secondary">Manage Profile</Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
