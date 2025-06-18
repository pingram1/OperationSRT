import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

// Import Page and Layout Components
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import ClassroomPage from './pages/Classroom';
import AppointmentPage from './pages/AppointmentPage';
import ParentPortal from './pages/ParentPortal';
// --- NEW IMPORTS ---
import ResourcesPage from './pages/ResourcesPage';
import ChallengesPage from './pages/ChallengesPage';


const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

export default function App() {
  return (
    <Routes>
        {/* --- Public Routes --- */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* --- Default Route --- */}
        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* --- Protected Routes --- */}
        <Route 
            path="/*" 
            element={
                <ProtectedRoute>
                    <MainLayout />
                </ProtectedRoute>
            }
        >
            {/* These routes will render inside MainLayout's <Outlet /> */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="classroom" element={<ClassroomPage />} />
            <Route path="appointments" element={<AppointmentPage />} />
            <Route path="parent-portal" element={<ParentPortal />} />
            {/* --- NEW ROUTES --- */}
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="challenges" element={<ChallengesPage />} />
        </Route>
    </Routes>
  );
}
