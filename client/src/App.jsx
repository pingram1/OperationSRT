import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import Page and Layout Components
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MainLayout from './components/layout/MainLayout'; // New layout component
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import ClassroomPage from './pages/Classroom';
import AppointmentPage from './pages/AppointmentPage';
import ParentPortal from './pages/ParentPortal';

// This component protects routes that require a user to be logged in.
const ProtectedRoute = ({ user, children }) => {
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

export default function App() {
    const [user, setUser] = useState(null);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        setUser(null);
    };

    return (
        <BrowserRouter>
            <Routes>
                {/* --- Public Routes --- */}
                <Route path="/login" element={<LoginPage onLoginSuccess={handleLogin} />} />
                <Route path="/signup" element={<SignupPage />} />

                {/* --- Protected Routes (Rendered inside MainLayout) --- */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute user={user}>
                            <MainLayout user={user} onLogout={handleLogout} />
                        </ProtectedRoute>
                    }
                >
                    {/* The default protected route is the dashboard */}
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard user={user} />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="classroom" element={<ClassroomPage />} />
                    <Route path="appointments" element={<AppointmentPage />} />
                    <Route path="parent-portal" element={<ParentPortal />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}