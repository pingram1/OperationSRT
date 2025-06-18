import React, { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Calendar, Award, Sparkles, BrainCircuit, UserCheck, Users } from 'lucide-react';

// --- Reusable Components (can be moved to /components/common if needed) ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
const CardHeader = ({ icon: Icon, title, rightContent = null }) => (
    <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-3 text-blue-500" />
            <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
        </div>
        {rightContent}
    </div>
);

// --- Mock Data (for demonstration) ---
const upcomingSessionsData = [{ id: 1, title: 'Calculus Review' }, { id: 2, title: 'Essay Workshop' }];
const learningProgressData = [{ id: 1, subject: 'Algebra', progress: 85, color: 'bg-blue-500' }, { id: 2, subject: 'Physics', progress: 62, color: 'bg-green-500' }];

// --- Memoized Dashboard Widget Components ---

const UpcomingSessionsCard = React.memo(() => {
    const { openModal } = useAuth();
    
    // useCallback ensures this function isn't recreated on every render
    const handlePlanWeek = useCallback(() => {
        openModal("✨ AI Study Plan", `Create a study plan for: ${upcomingSessionsData.map(s => s.title).join(', ')}.`, 'text');
    }, [openModal]);

    return (
        <Card>
            <CardHeader 
                icon={Calendar} 
                title="Upcoming Sessions" 
                rightContent={
                    <button onClick={handlePlanWeek} className="flex items-center bg-yellow-400 text-gray-800 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-500" aria-label="Plan My Week">
                        <Sparkles className="w-4 h-4 mr-2" />Plan My Week
                    </button>
                } 
            />
            <div className="space-y-3">
                {upcomingSessionsData.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium">{s.title}</p>
                        <button className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs">Join</button>
                    </div>
                ))}
            </div>
        </Card>
    );
});

const LearningProgressCard = React.memo(() => {
    const { openModal } = useAuth();

    const handleGenerateQuestions = useCallback((subject) => {
        openModal(`✨ Practice: ${subject}`, `Generate practice questions for ${subject}.`, 'json');
    }, [openModal]);

    return (
        <Card>
            <CardHeader icon={Award} title="Learning Progress" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {learningProgressData.map(item => (
                    <div key={item.id} className="p-4 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="font-medium">{item.subject}</span>
                            <span className="font-bold">{item.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-full">
                            <div className={`${item.color} h-2.5 rounded-full`} style={{width: `${item.progress}%`}}></div>
                        </div>
                        <button onClick={() => handleGenerateQuestions(item.subject)} className="mt-4 flex items-center text-sm text-blue-600 font-semibold">
                            <BrainCircuit className="w-4 h-4 mr-1"/>Generate Practice
                        </button>
                    </div>
                ))}
            </div>
        </Card>
    );
});

// --- Role-Specific Dashboard Components ---

const AdminDashboard = () => (<Card><CardHeader icon={UserCheck} title="Admin Overview" /><p>Manage users, view analytics, and configure system settings.</p></Card>);
const TutorDashboard = () => (<Card><CardHeader icon={Users} title="Tutor Dashboard" /><p>View your student roster and upcoming sessions.</p></Card>);
const ParentDashboard = () => (<Card><CardHeader icon={Users} title="Parent Dashboard" /><p>View your children's progress and schedule.</p></Card>);
const StudentDashboard = () => (
    <div className="space-y-6">
        <UpcomingSessionsCard />
        <LearningProgressCard />
    </div>
);


// --- Main Dashboard Page Component ---

export default function Dashboard() {
    const { user } = useAuth();

    // useMemo ensures this object is not recreated on every render
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
