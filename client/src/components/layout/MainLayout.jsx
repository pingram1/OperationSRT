import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    BarChart2, Briefcase, BookOpen, Settings, Users, UserCheck, 
    LogOut, ChevronDown, Bell, Calendar as CalendarIcon, Trophy,
    LineChart, UserPlus, Megaphone, Edit3, CreditCard, Sliders, DollarSign, FileText,
    X, Brain, Wallet, School as SchoolIcon, Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getUserAnnouncements } from '../../api/announcements.js';
import { getNotifications, markNotificationAsRead } from '../../api/notifications.js';
import { prefetchRoute } from '../../utils/routePrefetch.js';
import logoUrl from '../../assets/logo.jpg';

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
        { path: '/dashboard', label: 'Dashboard', icon: BarChart2, roles: ['student', 'parent', 'tutor', 'admin', 'super_admin'] },
        { path: '/classroom', label: 'Classroom', icon: Briefcase, roles: ['student', 'tutor'] },
        
        // Appointments - Different for students/parents vs tutors
        { path: '/appointments', label: 'Appointments', icon: CalendarIcon, roles: ['student', 'parent'] },
        { path: '/tutor-appointments', label: 'My Sessions', icon: CalendarIcon, roles: ['tutor'] },
        
        // Challenges - Only for students
        { path: '/challenges', label: 'Challenges', icon: Trophy, roles: ['student'] },
        { path: '/visualizers', label: 'Concept Visualizers', icon: Sparkles, roles: ['student'] },
        { path: '/scholarship-fund', label: 'Scholarship fund', icon: Wallet, roles: ['student'] },
        { path: '/resources', label: 'Resources', icon: BookOpen, roles: ['student', 'tutor', 'admin', 'super_admin'] },
        
        // Tutor-Specific Routes
        { path: '/my-students', label: 'My Students', icon: Users, roles: ['tutor'] },
        { path: '/earnings', label: 'Earnings', icon: DollarSign, roles: ['tutor'] },
        
        // Parent-Specific Routes
        { path: '/parent-portal', label: 'Parent Portal', icon: Users, roles: ['parent'] },
        { path: '/progress-reports', label: 'Progress Reports', icon: FileText, roles: ['parent'] },
        
        // --- NEW ADMIN-SPECIFIC ROUTES (including super_admin) ---
        { path: '/admin-panel', label: 'Admin Overview', icon: UserCheck, roles: ['admin', 'super_admin'] },
        { path: '/admin-bookings', label: 'Booking Management', icon: CalendarIcon, roles: ['admin', 'super_admin'] },
        { path: '/analytics', label: 'Analytics', icon: LineChart, roles: ['admin', 'super_admin'] },
        { path: '/tutor-management', label: 'Tutor Management', icon: UserPlus, roles: ['admin', 'super_admin'] },
        { path: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'super_admin'] },
        { path: '/content-management', label: 'Content', icon: Edit3, roles: ['admin', 'super_admin'] },
        { path: '/financials', label: 'Financials', icon: CreditCard, roles: ['admin', 'super_admin'] },
        { path: '/system-config', label: 'System Config', icon: Sliders, roles: ['admin', 'super_admin'] },
        { path: '/match-analysis', label: 'Match Analysis', icon: Brain, roles: ['admin', 'super_admin'] },
        { path: '/schools-admin', label: 'School Pilots', icon: SchoolIcon, roles: ['admin', 'super_admin'] },
        
        // General Settings Route
        { path: '/settings', label: 'Settings', icon: Settings, roles: ['student', 'parent', 'tutor', 'admin', 'super_admin'] },
    ];

    // Filter the navigation items based on the current user's role
    // super_admin should see all admin routes
    const visibleNavItems = navItems.filter(item => {
        if (user.role === 'super_admin') {
            // Exclude parent/student-specific pages and earnings that super_admin doesn't need
            const excludedPaths = ['/appointments', '/parent-portal', '/progress-reports', '/earnings', '/scholarship-fund'];
            if (excludedPaths.includes(item.path)) {
                return false;
            }
            
            // super_admin sees all admin routes, plus general routes (dashboard, settings, resources)
            // super_admin sees tutor routes (My Sessions) but NOT Earnings
            if (item.roles.includes('super_admin') || item.roles.includes('admin')) {
                return true;
            }
            // Include tutor routes except Earnings (which is already excluded above)
            if (item.roles.includes('tutor') && item.path !== '/earnings') {
                return true;
            }
            // General routes available to all (but excluding the excluded paths above)
            return item.roles.includes('student') || item.roles.includes('parent');
        }
        return item.roles.includes(user.role);
    });

    return (
        <aside className="w-64 bg-white flex flex-col h-screen shadow-lg fixed z-50">
            <Link to="/dashboard" className="p-3 border-b hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-center gap-2">
                    <img 
                        src={logoUrl} 
                        alt="Start Right Tutoring Logo" 
                        className="w-8 h-8 object-contain flex-shrink-0"
                    />
                    <p className="text-lg font-bold text-gray-800 leading-tight text-center">Start Right Tutoring</p>
                </div>
            </Link>
            <nav className="flex-grow p-4 overflow-y-auto">
                <ul>
                    {visibleNavItems.map(item => (
                        <li key={item.path}>
                            <Link 
                                to={item.path}
                                onMouseEnter={() => prefetchRoute(item.path)}
                                onFocus={() => prefetchRoute(item.path)}
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

const Header = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const [inAppNotifications, setInAppNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [avatarError, setAvatarError] = useState(false);
    const notificationsRef = useRef(null);
    const userMenuRef = useRef(null);

    const isEmployee = user?.role === 'tutor' || user?.role === 'admin' || user?.role === 'super_admin';

    // Fetch announcements and (for employees) in-app notifications
    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const data = await getUserAnnouncements();
                const sorted = (data || []).sort((a, b) => {
                    const dateA = new Date(a.createdAt || a.date || 0);
                    const dateB = new Date(b.createdAt || b.date || 0);
                    return dateB - dateA;
                });
                setAnnouncements(sorted.slice(0, 5));
                if (!isEmployee) setUnreadCount(sorted.length > 0 ? Math.min(sorted.length, 5) : 0);
            } catch (e) { /* non-critical */ }
        };

        const fetchInAppNotifications = async () => {
            if (!isEmployee) return;
            try {
                const { notifications, unreadCount: count } = await getNotifications({ limit: 20 });
                setInAppNotifications(notifications || []);
                setUnreadCount(count || 0);
            } catch (e) {
                setInAppNotifications([]);
                setUnreadCount(0);
            }
        };

        fetchAnnouncements();
        fetchInAppNotifications();

        const interval = setInterval(() => {
            fetchAnnouncements();
            fetchInAppNotifications();
        }, 2 * 60 * 1000); // Every 2 minutes
        return () => clearInterval(interval);
    }, [isEmployee]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setNotificationsOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleUserMenuClick = (action) => {
        setUserMenuOpen(false);
        if (action === 'dashboard') {
            navigate('/dashboard');
        } else if (action === 'settings') {
            navigate('/settings');
        } else if (action === 'logout') {
            onLogout();
        }
    };

    return (
        <header className="flex justify-end items-center py-4 px-8 border-b bg-white w-full relative z-40">
            <div className="flex items-center space-x-4">
                {/* Notifications Dropdown */}
                <div className="relative" ref={notificationsRef}>
                    <button 
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="relative p-2 rounded-full hover:bg-gray-200 transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell className="w-6 h-6 text-gray-600" />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    
                    {notificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800 flex items-center">
                                    <Bell className="w-5 h-5 mr-2" />
                                    Notifications
                                </h3>
                                <button
                                    onClick={() => setNotificationsOpen(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {(inAppNotifications.length > 0 || announcements.length > 0) ? (
                                <div className="py-2">
                                    {inAppNotifications.map((n) => (
                                        <div
                                            key={n._id}
                                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!n.read ? 'bg-blue-50/50' : ''}`}
                                            onClick={async () => {
                                                if (!n.read) {
                                                    try { await markNotificationAsRead(n._id); } catch (e) {}
                                                    setInAppNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
                                                    setUnreadCount(c => Math.max(0, c - 1));
                                                }
                                                setNotificationsOpen(false);
                                                navigate(n.actionUrl || '/admin-bookings');
                                            }}
                                        >
                                            <p className="text-sm text-gray-800">{n.message}</p>
                                            <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                                        </div>
                                    ))}
                                    {announcements.map((announcement) => (
                                        <div
                                            key={announcement._id}
                                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                                            onClick={() => {
                                                setNotificationsOpen(false);
                                                navigate('/dashboard');
                                            }}
                                        >
                                            <p className="font-semibold text-sm text-gray-800 mb-1">{announcement.title}</p>
                                            <p className="text-xs text-gray-600 line-clamp-2">{announcement.message}</p>
                                            <p className="text-xs text-gray-400 mt-2">{formatDate(announcement.createdAt)}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-4 py-8 text-center text-gray-500">
                                    <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No notifications</p>
                                </div>
                            )}
                            {(inAppNotifications.length > 0 || announcements.length > 0) && (
                                <div className="px-4 py-2 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            setNotificationsOpen(false);
                                            navigate(isEmployee ? '/admin-bookings' : '/dashboard');
                                        }}
                                        className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        {isEmployee ? 'View bookings' : 'View all announcements'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* User Dropdown Menu */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="User menu"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm border-2 border-gray-200 flex-shrink-0 relative overflow-hidden">
                            {user.avatar && !avatarError ? (
                                <img 
                                    src={user.avatar} 
                                    alt="User Avatar" 
                                    className="w-full h-full object-cover absolute inset-0 z-10"
                                    loading="lazy"
                                    decoding="async"
                                    onError={() => setAvatarError(true)}
                                />
                            ) : null}
                            <span className="z-0">
                                {(user.name || 'U').charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <span className="font-semibold text-gray-700 hidden md:block">{user.name}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {userMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                            <div className="px-4 py-3 border-b border-gray-200">
                                <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                            </div>
                            <div className="py-1">
                                <button
                                    onClick={() => handleUserMenuClick('dashboard')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                    <BarChart2 className="w-4 h-4 mr-3" />
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => handleUserMenuClick('settings')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                    <Settings className="w-4 h-4 mr-3" />
                                    Settings
                                </button>
                                {(user.role === 'admin' || user.role === 'super_admin') && (
                                    <button
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            navigate('/admin-panel');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                        <UserCheck className="w-4 h-4 mr-3" />
                                        Admin Panel
                                    </button>
                                )}
                            </div>
                            <div className="border-t border-gray-200 py-1">
                                <button
                                    onClick={() => handleUserMenuClick('logout')}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                                >
                                    <LogOut className="w-4 h-4 mr-3" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default function MainLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) { return null; }

    return (
        <div className="min-h-screen bg-gray-100 font-sans flex">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[1100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-blue-600 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                Skip to main content
            </a>
            <Sidebar />
            <div className="flex-1 flex flex-col ml-64 min-w-0 w-full">
                <Header user={user} onLogout={handleLogout} />
                <main
                    id="main-content"
                    tabIndex={-1}
                    className="flex-1 p-8 w-full min-w-0 overflow-x-hidden focus:outline-none"
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
