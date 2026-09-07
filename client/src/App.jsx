import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import MainLayout from './components/layout/MainLayout';

// Lazy load page components for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const EmployeeLoginPage = lazy(() => import('./pages/EmployeeLoginPage'));
const EmployeeSignupPage = lazy(() => import('./pages/EmployeeSignupPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const ClassroomPage = lazy(() => import('./pages/Classroom'));
const AppointmentPage = lazy(() => import('./pages/AppointmentPage'));
const ParentPortal = lazy(() => import('./pages/ParentPortal'));
const ProgressReportsPage = lazy(() => import('./pages/ProgressReportsPage'));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'));
const ChallengesPage = lazy(() => import('./pages/ChallengesPage'));
const ChallengePlayPage = lazy(() => import('./pages/ChallengePlayPage'));
const ConceptVisualizersPage = lazy(() => import('./pages/ConceptVisualizersPage'));
const ConceptVisualizerPlayPage = lazy(() => import('./pages/ConceptVisualizerPlayPage'));
const ScholarshipFundPage = lazy(() => import('./pages/ScholarshipFundPage'));
const TutorAppointmentsPage = lazy(() => import('./pages/TutorAppointmentsPage'));
const MyStudentsPage = lazy(() => import('./pages/MyStudentsPage'));
const TutorEarningsPage = lazy(() => import('./pages/TutorEarningsPage'));
const LearningStyleAssessment = lazy(() => import('./pages/LearningStyleAssessment'));

// Lazy load admin components
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'));
const AdminBookingPage = lazy(() => import('./pages/AdminBookingPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const TutorManagementPage = lazy(() => import('./pages/HRpage.jsx'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage.jsx'));
const ContentManagementPage = lazy(() => import('./pages/ContentManagement.jsx'));
const FinancialsPage = lazy(() => import('./pages/FinancialBMPage.jsx'));
const SystemConfigPage = lazy(() => import('./pages/SystemConfig.jsx'));
const MatchAnalysisPage = lazy(() => import('./pages/MatchAnalysisPage.jsx'));
const SchoolsAdminPage = lazy(() => import('./pages/SchoolsAdminPage.jsx'));
const VideoCallPage = lazy(() => import('./pages/VideoCallPage.jsx'));
const StudentBillingHistory = lazy(() => import('./pages/StudentBillingHistory.jsx'));

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);


const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
          {/* --- Public Routes --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/employee-login" element={<EmployeeLoginPage />} />
          <Route path="/employee-signup" element={<EmployeeSignupPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

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
            <Route path="assessment" element={<LearningStyleAssessment />} />
            <Route path="classroom" element={<ClassroomPage />} />
            
            {/* Appointments - Conditional based on role (handled in component) */}
            <Route path="appointments" element={<AppointmentPage />} />
            
            {/* --- Tutor-Specific Routes --- */}
            <Route path="tutor-appointments" element={<TutorAppointmentsPage />} />
            <Route path="my-students" element={<MyStudentsPage />} />
            <Route path="earnings" element={<TutorEarningsPage />} />
            
            <Route path="parent-portal" element={<ParentPortal />} />
            <Route path="student-billing-history" element={<StudentBillingHistory />} />
            <Route path="progress-reports" element={<ProgressReportsPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="challenges" element={<ChallengesPage />} />
            <Route path="challenges/:id" element={<ChallengePlayPage />} />
            <Route path="visualizers" element={<ConceptVisualizersPage />} />
            <Route path="visualizers/:gameId" element={<ConceptVisualizerPlayPage />} />
            <Route path="scholarship-fund" element={<ScholarshipFundPage />} />
            
            {/* Video Call Route */}
            <Route path="video-call/:bookingId" element={<VideoCallPage />} />
            
            {/* --- Admin-Specific Routes --- */}
            <Route path="admin-panel" element={<AdminPanel />} />
            <Route path="admin-bookings" element={<AdminBookingPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="tutor-management" element={<TutorManagementPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="content-management" element={<ContentManagementPage />} />
            <Route path="financials" element={<FinancialsPage />} />
            <Route path="system-config" element={<SystemConfigPage />} />
            <Route path="match-analysis" element={<MatchAnalysisPage />} />
            <Route path="schools-admin" element={<SchoolsAdminPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
