import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Calendar, Award, Sparkles, BrainCircuit, UserCheck, Users, Loader2, AlertTriangle } from 'lucide-react';

// --- API Layer (These would be imported from your /api folder) ---

// This simulates fetching upcoming sessions from '/api/bookings/upcoming'
const fetchUpcomingSessions = async () => {
    console.log("Fetching upcoming sessions from API...");
    return new Promise(resolve => setTimeout(() => resolve([
        { id: 'sess_123', title: 'Live: Calculus II' },
        { id: 'sess_456', title: 'Live: Shakespeare Sonnets' }
    ]), 1200));
};

// This simulates fetching learning progress from '/api/users/progress'
const fetchLearningProgress = async () => {
    console.log("Fetching learning progress from API...");
    return new Promise(resolve => setTimeout(() => resolve([
        { id: 'prog_1', subject: 'Calculus II', progress: 75, color: 'bg-blue-500' },
        { id: 'prog_2', subject: 'Literature', progress: 90, color: 'bg-purple-500' }
    ]), 1500));
};


// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
const CardHeader = ({ icon: Icon, title, rightContent = null }) => (
    <div className="flex justify-between items-center mb-4"><div className="flex items-center"><Icon className="w-6 h-6 mr-3 text-blue-500" /><h3 className="font-semibold text-lg text-gray-800">{title}</h3></div>{rightContent}</div>
);

// --- Memoized Dashboard Widget Components ---

const UpcomingSessionsCard = React.memo(({ sessions }) => {
    const { openModal } = useAuth();
    
    const handlePlanWeek = useCallback(() => {
        if (!sessions || sessions.length === 0) return;
        // The prompt now uses live data passed down as a prop
        openModal("✨ AI Study Plan", `Create a study plan for my upcoming sessions: ${sessions.map(s => s.title).join(', ')}.`, 'text');
    }, [openModal, sessions]);

    return (
        <Card>
            <CardHeader 
                icon={Calendar} 
                title="Upcoming Sessions" 
                rightContent={sessions.length > 0 && <button onClick={handlePlanWeek} className="flex items-center bg-yellow-400 text-gray-800 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-500"> <Sparkles className="w-4 h-4 mr-2" />Plan My Week</button>} 
            />
            <div className="space-y-3">
                {sessions.length > 0 ? sessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"><p className="font-medium">{s.title}</p><button className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs">Join</button></div>
                )) : <p className="text-center text-gray-500 py-4">No upcoming sessions.</p>}
            </div>
        </Card>
    );
});

const LearningProgressCard = React.memo(({ progressData }) => {
    const { openModal } = useAuth();

    const handleGenerateQuestions = useCallback((subject) => {
        openModal(`✨ Practice: ${subject}`, `Generate practice questions for ${subject}.`, 'json');
    }, [openModal]);

    return (
        <Card>
            <CardHeader icon={Award} title="Learning Progress" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {progressData.length > 0 ? progressData.map(item => (
                    <div key={item.id} className="p-4 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-baseline mb-1"><span className="font-medium">{item.subject}</span><span className="font-bold">{item.progress}%</span></div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-full"><div className={`${item.color} h-2.5 rounded-full`} style={{width: `${item.progress}%`}}></div></div>
                        <button onClick={() => handleGenerateQuestions(item.subject)} className="mt-4 flex items-center text-sm text-blue-600 font-semibold"><BrainCircuit className="w-4 h-4 mr-1"/>Generate Practice</button>
                    </div>
                )) : <p className="col-span-2 text-center text-gray-500 py-4">No progress data available.</p>}
            </div>
        </Card>
    );
});


// --- Role-Specific Dashboard Components ---

const AdminDashboard = () => (<Card><CardHeader icon={UserCheck} title="Admin Overview" /><p>This is where live admin metrics and quick links would be displayed.</p></Card>);
const TutorDashboard = () => (<Card><CardHeader icon={Users} title="Tutor Dashboard" /><p>This is where live data about a tutor's students and sessions would be displayed.</p></Card>);
const ParentDashboard = () => (<Card><CardHeader icon={Users} title="Parent Dashboard" /><p>This is where live data about a parent's children would be displayed.</p></Card>);

const StudentDashboard = () => {
    const [sessions, setSessions] = useState([]);
    const [progress, setProgress] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch data from multiple API endpoints simultaneously
                const [sessionsData, progressData] = await Promise.all([
                    fetchUpcomingSessions(),
                    fetchLearningProgress()
                ]);
                setSessions(sessionsData);
                setProgress(progressData);
            } catch (err) {
                setError("Failed to load dashboard data. Please try refreshing the page.");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []); // Empty dependency array means this runs once when the component mounts

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 text-blue-500 animate-spin" /></div>;
    }

    if (error) {
        return <div className="flex items-center p-4 bg-red-100 text-red-700 rounded-lg"><AlertTriangle className="w-6 h-6 mr-3" /> {error}</div>;
    }

    return (
        <div className="space-y-6">
            <UpcomingSessionsCard sessions={sessions} />
            <LearningProgressCard progressData={progress} />
        </div>
    );
};


// --- Main Dashboard Page Component ---

export default function Dashboard() {
    const { user } = useAuth();

    const roleComponents = useMemo(() => ({
        admin: AdminDashboard,
        tutor: TutorDashboard,
        parent: ParentDashboard,
        student: StudentDashboard,
    }), []);

    const renderRoleDashboard = () => {
        const RoleComponent = roleComponents[user.role] || roleComponents.student;
        return <RoleComponent />;
    };

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user.name}!</p>
            </header>
            {renderRoleDashboard()}
        </div>
    );
}
