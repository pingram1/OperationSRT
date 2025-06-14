import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { BarChart2, Briefcase, BookOpen, Settings, Users, UserCheck, LogOut, ChevronDown, Bell, Calendar as CalendarIcon } from 'lucide-react';

const Sidebar = ({ user, onLogout }) => {
    const location = useLocation();
    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: BarChart2, roles: ['student', 'parent', 'tutor', 'admin'] },
        { path: '/parent-portal', label: 'Parent Portal', icon: Users, roles: ['parent'] },
        { path: '/classroom', label: 'Classroom', icon: Briefcase, roles: ['student', 'tutor'] },
        { path: '/appointments', label: 'Appointments', icon: CalendarIcon, roles: ['student', 'parent', 'tutor', 'admin'] },
        { path: '/resources', label: 'Resources', icon: BookOpen, roles: ['student', 'tutor', 'admin'] },
        { path: '/admin-panel', label: 'Admin Panel', icon: UserCheck, roles: ['admin'] },
        { path: '/settings', label: 'Settings', icon: Settings, roles: ['student', 'parent', 'tutor', 'admin'] },
    ];

    const visibleNavItems = navItems.filter(item => item.roles.includes(user.role));

    return (
        <div className="w-64 bg-white flex flex-col h-screen shadow-lg">
            <div className="p-6 text-center border-b">
                <h1 className="text-2xl font-bold text-gray-800">StartRight</h1>
            </div>
            <nav className="flex-grow p-4">
                <ul>
                    {visibleNavItems.map(item => (
                        <li key={item.path}>
                            <Link to={item.path} className={`w-full flex items-center px-4 py-3 my-1 rounded-lg transition-colors ${location.pathname.startsWith(item.path) ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                <item.icon className="w-5 h-5 mr-3" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="p-4 border-t">
                <button onClick={onLogout} className="w-full flex items-center px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
                    <LogOut className="w-5 h-5 mr-3" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};

const Header = ({ user }) => (
    <header className="flex justify-between items-center py-4 px-8 border-b bg-white">
        <div>{/* Placeholder for breadcrumbs or page title */}</div>
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

export default function MainLayout({ user, onLogout }) {
    return (
        <div className="min-h-screen bg-gray-100 font-sans flex">
            <Sidebar user={user} onLogout={onLogout} />
            <div className="flex-1 flex flex-col">
                <Header user={user} />
                <main className="flex-1 p-8">
                    {/* The Outlet component renders the matched child route component */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
}