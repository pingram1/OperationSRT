import React from 'react';
import { Calendar, Award, MessageSquare, Video, BookOpen, BarChart2, Briefcase, Settings, LogOut, ChevronDown, Bell } from 'lucide-react';

// Faux user data
const userData = {
  name: 'Alex Doe',
  avatar: 'https://placehold.co/40x40/E2E8F0/4A5568?text=AD',
};

// Faux data for the components
const upcomingSessionsData = [
  { id: 1, title: 'Calculus Review', time: 'Tomorrow, 10:00 AM' },
  { id: 2, title: 'Essay Writing Workshop', time: 'Friday, 2:00 PM' },
  { id: 3, title: 'Chemistry Lab Prep', time: 'Next Monday, 9:00 AM' },
];

const learningProgressData = [
  { id: 1, subject: 'Advanced Algebra', progress: 85, color: 'bg-blue-500' },
  { id: 2, subject: 'Physics I', progress: 62, color: 'bg-green-500' },
  { id: 3, subject: 'History of Art', progress: 78, color: 'bg-purple-500' },
];

const aiInsightData = {
  title: 'Personal Learning Insights',
  message: 'Based on your recent progress in Algebra, we recommend focusing on polynomial functions and their graphs.',
};

const classroomToolsData = ['Interactive Whiteboard', 'Screen Share', 'Collaborative Notes', 'Live Polls'];
const resourceLibraryData = ['Practice Problems', 'Video Tutorials', 'Lecture Slides', 'Reading Materials'];

// Reusable Components
const IconWrapper = ({ icon: Icon, className = '' }) => (
  <div className={`p-2 bg-gray-200/50 rounded-lg ${className}`}>
    <Icon className="w-5 h-5 text-gray-600" />
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center mb-4">
    <Icon className="w-6 h-6 mr-3 text-blue-500" />
    <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
  </div>
);

// Main Application Components
const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'classroom', label: 'Classroom', icon: Briefcase },
    { id: 'resources', label: 'Resources', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-white flex flex-col rounded-l-2xl shadow-lg">
      <div className="p-6 text-center border-b">
        <h1 className="text-2xl font-bold text-gray-800">StartRight</h1>
        <p className="text-sm text-gray-500">Learning Hub</p>
      </div>
      <nav className="flex-grow p-4">
        <ul>
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${
                  activeTab === item.id 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <button className="w-full flex items-center px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

const Header = () => (
  <div className="flex justify-between items-center mb-8">
    <div>
      <h2 className="text-3xl font-bold text-gray-800">Welcome back, {userData.name}!</h2>
      <p className="text-gray-500">Let's continue making progress in your learning journey.</p>
    </div>
    <div className="flex items-center space-x-4">
      <button className="p-2 rounded-full hover:bg-gray-200 transition-colors">
        <Bell className="w-6 h-6 text-gray-600" />
      </button>
      <div className="flex items-center space-x-2">
        <img src={userData.avatar} alt="User Avatar" className="rounded-full" />
        <span className="font-semibold text-gray-700">{userData.name}</span>
        <ChevronDown className="w-5 h-5 text-gray-500" />
      </div>
    </div>
  </div>
);

const UpcomingSessionsCard = () => (
  <Card className="col-span-1 md:col-span-2">
    <CardHeader icon={Calendar} title="Upcoming Sessions" />
    <div className="space-y-3">
      {upcomingSessionsData.map(session => (
        <div key={session.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
          <p className="font-medium text-gray-700">{session.title}</p>
          <span className="text-sm text-gray-500">{session.time}</span>
          <button className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-600 transition-colors">Join</button>
        </div>
      ))}
    </div>
  </Card>
);

const AiAssistantCard = () => (
  <Card className="col-span-1 md:col-span-1 bg-blue-50 text-blue-900">
     <CardHeader icon={MessageSquare} title={aiInsightData.title} />
    <p className="text-sm leading-relaxed">{aiInsightData.message}</p>
    <button className="mt-4 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors shadow-sm">Explore Topics</button>
  </Card>
);

const LearningProgressCard = () => (
  <Card className="col-span-1 md:col-span-3">
    <CardHeader icon={Award} title="Learning Progress" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {learningProgressData.map(item => (
        <div key={item.id}>
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-medium text-gray-700">{item.subject}</span>
            <span className={`font-bold text-lg ${item.color.replace('bg-', 'text-')}`}>{item.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className={`${item.color} h-2.5 rounded-full`} style={{ width: `${item.progress}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const Dashboard = () => (
  <div className="space-y-6">
    <Header />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UpcomingSessionsCard />
      <AiAssistantCard />
      <LearningProgressCard />
    </div>
  </div>
);

const Classroom = () => (
  <div>
    <Header />
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-3 lg:col-span-2">
        <Card className="h-full">
          <CardHeader icon={Video} title="Live Session: Advanced Algebra" />
          <div className="bg-gray-900 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Video className="w-16 h-16 mx-auto mb-2" />
              <p>Video Stream Paused</p>
              <p className="text-xs">Your virtual classroom will appear here.</p>
            </div>
          </div>
        </Card>
      </div>
      <div className="col-span-3 lg:col-span-1 space-y-6">
        <Card>
          <h3 className="font-semibold text-lg text-gray-800 mb-4">Class Tools</h3>
          <div className="grid grid-cols-2 gap-3">
            {classroomToolsData.map(tool => (
              <button key={tool} className="bg-blue-100 text-blue-800 text-sm font-medium p-3 rounded-lg hover:bg-blue-200 transition-colors">{tool}</button>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-lg text-gray-800 mb-4">Resource Library</h3>
          <div className="space-y-2">
             {resourceLibraryData.map(resource => (
              <a href="#" key={resource} className="block border border-gray-300 text-gray-700 text-sm font-medium p-3 rounded-lg hover:border-blue-500 hover:bg-gray-50 transition-all">{resource}</a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  </div>
);

const Placeholder = ({ title }) => (
    <div>
        <Header />
        <Card>
            <div className="text-center py-20 text-gray-500">
                <h2 className="text-2xl font-semibold mb-2">{title}</h2>
                <p>This section is under construction. Check back soon!</p>
            </div>
        </Card>
    </div>
);


// The main App component that orchestrates everything
export default function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'classroom':
        return <Classroom />;
      case 'resources':
        return <Placeholder title="Learning Resources" />;
      case 'settings':
        return <Placeholder title="Settings" />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="flex min-h-screen">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

