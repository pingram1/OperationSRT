import React, { useState, useMemo } from 'react';
import { Calendar, Award, MessageSquare, Video, BookOpen, BarChart2, Briefcase, Settings, LogOut, ChevronDown, Bell, Sparkles, BrainCircuit, Loader2, Search, FileText, PlayCircle, MousePointerClick, User, BellRing, Shield } from 'lucide-react';

// Faux user data
const userData = {
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  avatar: 'https://placehold.co/80x80/E2E8F0/4A5568?text=AD',
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
const resourceLibraryData = [
    { id: 1, type: 'video', title: 'Introduction to Polynomials', subject: 'Algebra', duration: '12:30', icon: PlayCircle, color: 'text-red-500' },
    { id: 2, type: 'article', title: 'The Laws of Thermodynamics', subject: 'Physics', duration: '8 min read', icon: FileText, color: 'text-blue-500' },
    { id: 3, type: 'simulation', title: 'Virtual Titration Lab', subject: 'Chemistry', duration: 'Interactive', icon: MousePointerClick, color: 'text-green-500' },
    { id: 4, type: 'article', title: 'Understanding Shakespearean Sonnets', subject: 'Literature', duration: '15 min read', icon: FileText, color: 'text-blue-500' },
    { id: 5, type: 'video', title: 'Newton\'s First Law of Motion', subject: 'Physics', duration: '8:45', icon: PlayCircle, color: 'text-red-500' },
    { id: 6, type: 'simulation', title: 'Algebra Equation Balancer', subject: 'Algebra', duration: 'Interactive', icon: MousePointerClick, color: 'text-green-500' },
];


// Reusable Components
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ icon: Icon, title, rightContent=null }) => (
  <div className="flex justify-between items-center mb-4">
    <div className="flex items-center">
        <Icon className="w-6 h-6 mr-3 text-blue-500" />
        <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
    </div>
    {rightContent}
  </div>
);

const Modal = ({ title, content, onClose, isLoading, contentType }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            {contentType === 'json' ? 
                <BrainCircuit className="w-6 h-6 mr-2 text-blue-500" /> : 
                <Sparkles className="w-6 h-6 mr-2 text-yellow-500" />
            }
            {title}
        </h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-2xl leading-none">&times;</button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="text-gray-700 max-h-[60vh] overflow-y-auto pr-2">
            {contentType === 'json' && content.questions ? (
                 <div className="space-y-6">
                    {content.questions.map((q, index) => (
                        <div key={index} className="border-b pb-4 last:border-b-0">
                            <p className="font-bold text-gray-800 mb-3">{index + 1}. {q.question_text}</p>
                            <ul className="space-y-2">
                                {q.options.map((option, i) => (
                                    <li key={i} className={`p-3 rounded-lg text-sm ${
                                        option === q.correct_answer ? 'bg-green-100 border border-green-300 text-green-900 font-semibold' : 'bg-gray-50'
                                    }`}>
                                        {option}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
                               <p><span className="font-semibold">Explanation:</span> {q.explanation}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="whitespace-pre-wrap">{content}</div>
            )}
          </div>
      )}
    </div>
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

const Header = ({ title = `Welcome back, ${userData.name}!`, subtitle = "Let's continue making progress in your learning journey." }) => (
  <div className="flex justify-between items-center mb-8">
    <div>
      <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
      <p className="text-gray-500">{subtitle}</p>
    </div>
    <div className="flex items-center space-x-4">
      <button className="p-2 rounded-full hover:bg-gray-200 transition-colors">
        <Bell className="w-6 h-6 text-gray-600" />
      </button>
      <div className="flex items-center space-x-2 cursor-pointer">
        <img src={userData.avatar} alt="User Avatar" className="w-10 h-10 rounded-full" />
        <span className="font-semibold text-gray-700">{userData.name}</span>
        <ChevronDown className="w-5 h-5 text-gray-500" />
      </div>
    </div>
  </div>
);

const UpcomingSessionsCard = ({ openModal }) => {
    const handlePlanWeek = () => {
        const prompt = `Based on these upcoming sessions, create a simple study plan for the week. Sessions: ${upcomingSessionsData.map(s => s.title).join(', ')}. Provide actionable steps for each day leading up to the sessions. Format the response neatly.`;
        openModal("AI Study Plan", prompt, 'text');
    };
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader icon={Calendar} title="Upcoming Sessions" rightContent={
            <button onClick={handlePlanWeek} className="flex items-center bg-yellow-400 text-gray-800 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-500 transition-colors">
                <Sparkles className="w-4 h-4 mr-2" />
                Plan My Week
            </button>
        }/>
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
};

const AiAssistantCard = () => (
  <Card className="col-span-1 md:col-span-1 bg-blue-50 text-blue-900">
     <CardHeader icon={MessageSquare} title={aiInsightData.title} />
    <p className="text-sm leading-relaxed">{aiInsightData.message}</p>
    <button className="mt-4 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors shadow-sm">Explore Topics</button>
  </Card>
);

const LearningProgressCard = ({ openModal }) => {
    const handleGenerateQuestions = (subject) => {
        const prompt = `I'm studying ${subject}. Please generate 5 multiple-choice practice questions. For each question, provide the question text, 4 options, the correct answer, and a brief explanation for why the answer is correct.`;
        openModal(`Practice Questions: ${subject}`, prompt, 'json');
    };
    return (
      <Card className="col-span-1 md:col-span-3">
        <CardHeader icon={Award} title="Learning Progress" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {learningProgressData.map(item => (
            <div key={item.id} className="p-4 rounded-lg bg-gray-50">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-medium text-gray-700">{item.subject}</span>
                <span className={`font-bold text-lg ${item.color.replace('bg-', 'text-')}`}>{item.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${item.color} h-2.5 rounded-full`} style={{ width: `${item.progress}%` }}></div>
              </div>
              <button onClick={() => handleGenerateQuestions(item.subject)} className="mt-4 flex items-center text-sm text-blue-600 font-semibold hover:underline">
                  <BrainCircuit className="w-4 h-4 mr-1"/>
                  Generate Practice Questions
              </button>
            </div>
          ))}
        </div>
      </Card>
    );
};

const Dashboard = ({ openModal }) => (
  <div className="space-y-6">
    <Header />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UpcomingSessionsCard openModal={openModal} />
      <AiAssistantCard />
      <LearningProgressCard openModal={openModal} />
    </div>
  </div>
);

const Classroom = () => (
  <div>
    <Header title="Virtual Classroom" subtitle="Engage in your live sessions."/>
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
      </div>
    </div>
  </div>
);

const LearningResources = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const filters = ['All', 'Video', 'Article', 'Simulation'];

    const filteredResources = useMemo(() => {
        return resourceLibraryData.filter(resource => {
            const matchesFilter = activeFilter === 'All' || resource.type === activeFilter.toLowerCase();
            const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) || resource.subject.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [searchTerm, activeFilter]);

    return (
        <div>
            <Header title="Learning Resources" subtitle="Explore articles, videos, and simulations to enhance your studies." />
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search resources..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        {filters.map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                                    activeFilter === filter ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:bg-white/50'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResources.map(resource => {
                         const Icon = resource.icon;
                         return (
                            <div key={resource.id} className="border rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <Icon className={`w-8 h-8 mb-3 ${resource.color}`} />
                                    <h4 className="font-bold text-gray-800 mb-1">{resource.title}</h4>
                                    <span className="text-xs font-semibold uppercase text-gray-500">{resource.subject}</span>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <p className="text-sm text-gray-600">{resource.duration}</p>
                                    <a href="#" className="font-semibold text-blue-600 hover:underline text-sm">Open</a>
                                </div>
                            </div>
                         );
                    })}
                     {filteredResources.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <p className="font-semibold">No resources found.</p>
                            <p>Try adjusting your search or filters.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

const SettingsComponent = () => {
    const [profile, setProfile] = useState({ name: userData.name, email: userData.email });
    const [notifications, setNotifications] = useState({ email: true, push: false });
    
    const handleProfileChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleNotificationToggle = (key) => {
        setNotifications({ ...notifications, [key]: !notifications[key] });
    };
    
    const Toggle = ({ label, enabled, onToggle }) => (
        <div className="flex items-center justify-between py-2">
            <span className="text-gray-700">{label}</span>
            <button onClick={onToggle} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}/>
            </button>
        </div>
    );

    return (
        <div>
            <Header title="Settings" subtitle="Manage your account, preferences, and notifications." />
            <div className="space-y-8">
                <Card>
                    <CardHeader icon={User} title="Profile Settings" />
                    <div className="flex items-center space-x-6">
                        <img src={userData.avatar} alt="User Avatar" className="w-20 h-20 rounded-full" />
                        <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300">Change Picture</button>
                    </div>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input type="text" name="name" value={profile.name} onChange={handleProfileChange} className="w-full p-2 border rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input type="email" name="email" value={profile.email} onChange={handleProfileChange} className="w-full p-2 border rounded-md"/>
                        </div>
                    </div>
                     <button className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">Save Changes</button>
                </Card>

                <Card>
                    <CardHeader icon={BellRing} title="Notification Preferences" />
                    <div className="max-w-md">
                       <Toggle label="Email Notifications" enabled={notifications.email} onToggle={() => handleNotificationToggle('email')} />
                       <Toggle label="Push Notifications" enabled={notifications.push} onToggle={() => handleNotificationToggle('push')} />
                    </div>
                </Card>

                <Card>
                    <CardHeader icon={Shield} title="Account & Security" />
                     <div className="space-y-4">
                        <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300">Change Password</button>
                        <button className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-200">Deactivate Account</button>
                    </div>
                </Card>
            </div>
        </div>
    );
};


// The main App component that orchestrates everything
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modalState, setModalState] = useState({ isOpen: false, title: '', content: '', isLoading: false, contentType: 'text' });

  const callGemini = async (prompt, responseType = 'text') => {
    let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    
    const payload = { 
        contents: chatHistory,
    };

    if (responseType === 'json') {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    questions: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                question_text: { type: "STRING" },
                                options: { 
                                    type: "ARRAY",
                                    items: { type: "STRING" }
                                },
                                correct_answer: { type: "STRING" },
                                explanation: { type: "STRING" }
                            },
                             required: ["question_text", "options", "correct_answer", "explanation"]
                        }
                    }
                },
                required: ["questions"]
            }
        }
    }

    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts.length > 0) {
            if (responseType === 'json') {
                const json = result.candidates[0].content.parts[0].text;
                const parsedJson = JSON.parse(json);
                setModalState(s => ({ ...s, content: parsedJson, isLoading: false }));
            } else {
                const text = result.candidates[0].content.parts[0].text;
                setModalState(s => ({ ...s, content: text, isLoading: false }));
            }
        } else {
            throw new Error("Invalid response structure from API.");
        }
    } catch (error) {
        console.error("Gemini API call error:", error);
        setModalState(s => ({ ...s, content: "Sorry, something went wrong. Please try again.", isLoading: false }));
    }
  };

  const openModal = (title, prompt, responseType = 'text') => {
    setModalState({ isOpen: true, title, content: '', isLoading: true, contentType: responseType });
    callGemini(prompt, responseType);
  };

  const closeModal = () => {
    setModalState({ isOpen: false, title: '', content: '', isLoading: false, contentType: 'text' });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard openModal={openModal} />;
      case 'classroom':
        return <Classroom />;
      case 'resources':
        return <LearningResources />;
      case 'settings':
        return <SettingsComponent />;
      default:
        return <Dashboard openModal={openModal} />;
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
      {modalState.isOpen && <Modal {...modalState} onClose={closeModal} />}
    </div>
  );
}
