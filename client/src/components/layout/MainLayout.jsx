import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    BarChart2, Briefcase, BookOpen, Settings, Users, UserCheck, 
    LogOut, ChevronDown, Bell, Calendar as CalendarIcon, Trophy,
    LineChart, UserPlus, Megaphone, Edit3, CreditCard, Sliders
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

/**
 * The main sidebar component for navigation.
 */
const Sidebar = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // This is the single source of truth for all navigation items.
    const navItems = [
        // General Routes
        { path: '/dashboard', label: 'Dashboard', icon: BarChart2, roles: ['student', 'parent', 'tutor', 'admin'] },
        { path: '/classroom', label: 'Classroom', icon: Briefcase, roles: ['student', 'tutor'] },
        { path: '/appointments', label: 'Appointments', icon: CalendarIcon, roles: ['student', 'parent', 'tutor', 'admin'] },
        { path: '/challenges', label: 'Challenges', icon: Trophy, roles: ['student', 'tutor'] },
        { path: '/resources', label: 'Resources', icon: BookOpen, roles: ['student', 'tutor', 'admin'] },
        
        // Parent-Specific Route
        { path: '/parent-portal', label: 'Parent Portal', icon: Users, roles: ['parent'] },
        
        // --- NEW ADMIN-SPECIFIC ROUTES ---
        { path: '/admin-panel', label: 'Admin Overview', icon: UserCheck, roles: ['admin'] },
        { path: '/analytics', label: 'Analytics', icon: LineChart, roles: ['admin'] },
        { path: '/tutor-management', label: 'Tutor Management', icon: UserPlus, roles: ['admin'] },
        { path: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['admin'] },
        { path: '/content-management', label: 'Content', icon: Edit3, roles: ['admin'] },
        { path: '/financials', label: 'Financials', icon: CreditCard, roles: ['admin'] },
        { path: '/system-config', label: 'System Config', icon: Sliders, roles: ['admin'] },
        
        // General Settings Route
        { path: '/settings', label: 'Settings', icon: Settings, roles: ['student', 'parent', 'tutor', 'admin'] },
    ];

    // Filter the navigation items based on the current user's role
    const visibleNavItems = navItems.filter(item => item.roles.includes(user.role));

    return (
        <aside className="w-64 bg-white flex flex-col h-screen shadow-lg fixed">
            <div className="p-6 text-center border-b">
                <h1 className="text-2xl font-bold text-gray-800">StartRight</h1>
            </div>
            <nav className="flex-grow p-4 overflow-y-auto">
                <ul>
                    {visibleNavItems.map(item => (
                        <li key={item.path}>
                            <Link 
                                to={item.path} 
                                className={`w-full flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${
                                    location.pathname.startsWith(item.path) 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="p-4 border-t">
                <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
                    <LogOut className="w-5 h-5 mr-3" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

const Header = ({ user }) => (
    <header className="flex justify-end items-center py-4 px-8 border-b bg-white w-full">
        <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-200"><Bell className="w-6 h-6 text-gray-600" /></button>
            <div className="flex items-center space-x-2">
                <img src={user.avatar} alt="User Avatar" className="w-10 h-10 rounded-full" />
                <span className="font-semibold text-gray-700">{user.name}</span>
                <ChevronDown className="w-5 h-5 text-gray-500" />
            </div>
        </div>
    </header>
);

export default function MainLayout() {
    const { user } = useAuth();
    if (!user) { return null; }

    return (
        <div className="min-h-screen bg-gray-100 font-sans flex">
            <Sidebar />
            <div className="flex-1 flex flex-col ml-64">
                <Header user={user} />
                <main className="flex-1 p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
