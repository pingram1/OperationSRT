import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Bell, User, BarChart2, Calendar, DollarSign, BookOpen, Clock, Award, PlusCircle, Download } from 'lucide-react';

// --- MOCK DATA (to be replaced by API calls) ---
const parentData = {
    name: "Jane Smith",
    avatar: 'https://placehold.co/80x80/E2E8F0/4A5568?text=JS',
    children: [
        {
            id: 'child1',
            name: 'Alex Smith',
            avatar: 'https://placehold.co/80x80/E2E8F0/4A5568?text=AS',
            overallProgress: 78,
            upcomingSessions: [
                { id: 'sess1', subject: 'Algebra II', tutor: 'Mr. Davis', date: '2025-06-16T16:00:00Z' },
                { id: 'sess2', subject: 'Chemistry', tutor: 'Ms. Chen', date: '2025-06-18T17:30:00Z' },
            ],
            academics: [
                { subject: 'Algebra II', grade: 'B+', progress: 85, color: 'bg-blue-500' },
                { subject: 'Chemistry', grade: 'A-', progress: 91, color: 'bg-green-500' },
                { subject: 'English Lit', grade: 'B', progress: 72, color: 'bg-purple-500' },
            ],
            billing: {
                nextPaymentDue: '2025-07-01',
                amountDue: 139.99,
                history: [
                    { id: 'inv1', date: '2025-06-01', amount: 139.99, status: 'Paid' },
                    { id: 'inv2', date: '2025-05-01', amount: 139.99, status: 'Paid' },
                ]
            }
        },
        {
            id: 'child2',
            name: 'Emily Smith',
            avatar: 'https://placehold.co/80x80/E2E8F0/4A5568?text=ES',
            overallProgress: 85,
            upcomingSessions: [
                { id: 'sess3', subject: 'World History', tutor: 'Mr. Ford', date: '2025-06-17T15:00:00Z' },
            ],
             academics: [
                { subject: 'World History', grade: 'A', progress: 94, color: 'bg-yellow-500' },
                { subject: 'Spanish II', grade: 'B+', progress: 88, color: 'bg-red-500' },
            ],
            billing: {
                nextPaymentDue: '2025-07-01',
                amountDue: 124.99,
                history: [
                    { id: 'inv3', date: '2025-06-01', amount: 124.99, status: 'Paid' },
                ]
            }
        }
    ]
};

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300 ${className}`}>{children}</div>);
const CardHeader = ({ icon: Icon, title, rightContent = null }) => (
    <div className="flex justify-between items-center mb-4 border-b pb-3"><div className="flex items-center"><Icon className="w-6 h-6 mr-3 text-blue-500" /><h3 className="font-semibold text-lg text-gray-800">{title}</h3></div>{rightContent}</div>
);

// --- Parent Portal Main Component ---
export default function ParentPortal() {
    const [selectedChildId, setSelectedChildId] = useState(parentData.children[0].id);
    const [activeTab, setActiveTab] = useState('overview');

    const selectedChild = useMemo(() => {
        return parentData.children.find(c => c.id === selectedChildId);
    }, [selectedChildId]);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart2 },
        { id: 'academics', label: 'Academics', icon: BookOpen },
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'billing', label: 'Billing', icon: DollarSign },
    ];

    const formatDate = (dateString) => new Date(dateString).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    const OverviewTab = ({ child }) => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader icon={Calendar} title="Upcoming Sessions" rightContent={<Link to="/appointments" className="text-sm font-semibold text-blue-600 hover:underline">View Full Calendar</Link>} />
                    <div className="space-y-3">
                        {child.upcomingSessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-800">{session.subject}</p>
                                    <p className="text-sm text-gray-500">with {session.tutor}</p>
                                </div>
                                <p className="text-sm font-medium text-gray-600">{formatDate(session.date)}</p>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card>
                    <CardHeader icon={Award} title="Recent Achievements" />
                    <p className="text-center text-gray-500 py-4">No new achievements to show.</p>
                </Card>
            </div>
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader icon={BarChart2} title="Overall Progress" />
                    <div className="flex flex-col items-center justify-center">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full" viewBox="0 0 36 36"><path className="text-gray-200" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path className="text-blue-500" strokeWidth="3" strokeDasharray={`${child.overallProgress}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg>
                            <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl font-bold text-gray-800">{child.overallProgress}%</span></div>
                        </div>
                        <p className="mt-4 text-center text-gray-600">Alex is showing consistent improvement across all subjects.</p>
                    </div>
                </Card>
            </div>
        </div>
    );
    
    const AcademicsTab = ({ child }) => (
        <Card>
            <CardHeader icon={BookOpen} title="Academic Performance" />
            <div className="space-y-4">
                {child.academics.map(subject => (
                     <div key={subject.subject}>
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-gray-800">{subject.subject}</p>
                            <span className="text-lg font-bold text-gray-700">{subject.grade}</span>
                        </div>
                         <div className="w-full bg-gray-200 rounded-full h-3"><div className={`${subject.color} h-3 rounded-full`} style={{ width: `${subject.progress}%` }}></div></div>
                    </div>
                ))}
            </div>
        </Card>
    );

    const ScheduleTab = ({ child }) => (
        <Card>
            <CardHeader icon={Calendar} title={`${child.name}'s Schedule`} rightContent={<button className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"><PlusCircle className="w-4 h-4 mr-2" />Book New Session</button>} />
            <p className="text-center text-gray-500 py-10">Calendar view with scheduled sessions will be displayed here.</p>
        </Card>
    );

    const BillingTab = ({ child }) => (
        <Card>
            <CardHeader icon={DollarSign} title="Billing & Invoices" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                    <p className="text-sm text-blue-800">Next Payment Due</p>
                    <p className="text-2xl font-bold text-blue-900">${child.billing.amountDue.toFixed(2)}</p>
                    <p className="text-sm text-blue-800">on {child.billing.nextPaymentDue}</p>
                    <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Make Payment</button>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Payment History</h4>
                    <ul className="space-y-2">
                        {child.billing.history.map(item => (
                            <li key={item.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-md">
                                <div>
                                    <p className="font-medium">Invoice #{item.id}</p>
                                    <p className="text-gray-500">Paid on {item.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">${item.amount.toFixed(2)}</p>
                                    <button className="text-blue-600 hover:underline"><Download className="w-4 h-4 inline-block -mt-1" /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Card>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview': return <OverviewTab child={selectedChild} />;
            case 'academics': return <AcademicsTab child={selectedChild} />;
            case 'schedule': return <ScheduleTab child={selectedChild} />;
            case 'billing': return <BillingTab child={selectedChild} />;
            default: return null;
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans p-8">
            {/* Header */}
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Parent Portal</h1>
                    <p className="text-gray-600">Welcome, {parentData.name}</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button className="p-2 rounded-full hover:bg-gray-200"><Bell className="w-6 h-6 text-gray-600" /></button>
                    <img src={parentData.avatar} alt="Parent Avatar" className="w-10 h-10 rounded-full" />
                </div>
            </header>

            {/* Child Selector */}
            <div className="mb-8">
                <label htmlFor="child-select" className="block text-sm font-medium text-gray-700 mb-2">Viewing Dashboard For:</label>
                <select id="child-select" value={selectedChildId} onChange={e => setSelectedChildId(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full md:w-1/3 p-2.5">
                    {parentData.children.map(child => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                </select>
            </div>

            {/* Tabs */}
            <nav className="flex space-x-2 md:space-x-4 border-b mb-8">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center px-3 md:px-4 py-3 text-sm md:text-base font-semibold transition-colors ${activeTab === tab.id ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>
                        <tab.icon className="w-5 h-5 mr-2" /> {tab.label}
                    </button>
                ))}
            </nav>

            {/* Tab Content */}
            <main>
                {renderTabContent()}
            </main>
        </div>
    );
}