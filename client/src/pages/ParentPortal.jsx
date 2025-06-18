import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Bell, User, BarChart2, Calendar, DollarSign, BookOpen, Clock, Award, PlusCircle, Download, CheckCircle } from 'lucide-react';

// --- Import the separate components ---
import ChildProfileCard from '../components/parent/ChildProfileCard.jsx';
import Button from '../components/common/Button.jsx';

// --- Reusable Components (can be moved to their own files) ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
const CardHeader = ({ icon: Icon, title, rightContent = null }) => (
    <div className="flex justify-between items-center mb-4 border-b pb-3"><div className="flex items-center"><Icon className="w-6 h-6 mr-3 text-blue-500" /><h3 className="font-semibold text-lg text-gray-800">{title}</h3></div>{rightContent}</div>
);

// --- MOCK DATA ---
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
            ],
            billing: {
                nextPaymentDue: '2025-07-01',
                amountDue: 139.99,
                history: [
                    { id: 'INV-2025-0601', date: 'June 1, 2025', amount: 139.99, status: 'Paid' },
                    { id: 'INV-2025-0501', date: 'May 1, 2025', amount: 139.99, status: 'Paid' },
                ]
            }
        },
        // ... other child data
    ]
};

// --- Extracted BillingHistory Component ---
const BillingHistory = ({ billing }) => (
    <div>
        <h4 className="font-semibold text-gray-700 mb-3">Payment History</h4>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                    <tr>
                        <th className="px-6 py-3">Invoice #</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {billing.history.map((invoice) => (
                        <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{invoice.id}</td>
                            <td className="px-6 py-4">{invoice.date}</td>
                            <td className="px-6 py-4">${invoice.amount.toFixed(2)}</td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">
                                    <CheckCircle className="w-4 h-4 mr-1" />Paid
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button className="text-blue-600 hover:underline"><Download className="w-5 h-5" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);


// --- Parent Portal Main Component ---
export default function ParentPortal() {
    const [selectedChildId, setSelectedChildId] = useState(parentData.children[0].id);
    const [activeTab, setActiveTab] = useState('overview');

    const selectedChild = useMemo(() => parentData.children.find(c => c.id === selectedChildId), [selectedChildId]);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart2 },
        { id: 'academics', label: 'Academics', icon: BookOpen },
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'billing', label: 'Billing', icon: DollarSign },
    ];

    const formatDate = (dateString) => new Date(dateString).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' });

    // --- Tab Content Components ---

    const OverviewTab = ({ child }) => (
        <div className="space-y-6">
            <ChildProfileCard child={child} />
            <Card>
                <CardHeader icon={Calendar} title="Upcoming Sessions" rightContent={<Link to="/appointments" className="text-sm font-semibold text-blue-600 hover:underline">View Full Calendar</Link>} />
                <div className="space-y-3">
                    {child.upcomingSessions.length > 0 ? child.upcomingSessions.map(session => (
                        <div key={session.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div><p className="font-semibold">{session.subject}</p><p className="text-sm text-gray-500">with {session.tutor}</p></div>
                            <p className="text-sm font-medium">{formatDate(session.date)}</p>
                        </div>
                    )) : <p className="text-center text-gray-500 py-4">No upcoming sessions.</p>}
                </div>
            </Card>
        </div>
    );
    
    const AcademicsTab = ({ child }) => (
        <Card>
            <CardHeader icon={BookOpen} title="Academic Performance" />
            <div className="space-y-4">{child.academics.map(subject => (<div key={subject.subject}><div className="flex justify-between items-center mb-1"><p className="font-semibold">{subject.subject}</p><span className="text-lg font-bold">{subject.grade}</span></div><div className="w-full bg-gray-200 rounded-full h-3"><div className={`${subject.color} h-3 rounded-full`} style={{ width: `${subject.progress}%` }}></div></div></div>))}</div>
        </Card>
    );

    const ScheduleTab = ({ child }) => (
        <Card>
            <CardHeader icon={Calendar} title={`${child.name}'s Schedule`} rightContent={<Button Icon={PlusCircle}>Book New Session</Button>} />
            <p className="text-center text-gray-500 py-10">Calendar view will be here.</p>
        </Card>
    );

    const BillingTab = ({ child }) => (
        <Card>
            <CardHeader icon={DollarSign} title="Billing & Invoices" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-blue-50 p-6 rounded-lg">
                    <p className="text-sm text-blue-800">Next Payment Due</p>
                    <p className="text-3xl font-bold text-blue-900">${child.billing.amountDue.toFixed(2)}</p>
                    <p className="text-sm text-blue-800">on {child.billing.nextPaymentDue}</p>
                    <Button className="w-full mt-4">Make Payment</Button>
                </div>
                <div className="md:col-span-2">
                    {/* The new BillingHistory component is now used here */}
                    <BillingHistory billing={child.billing} />
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
        <div className="font-sans">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Parent Portal</h1>
                <p className="text-gray-600">Welcome, {parentData.name}</p>
            </header>
            <div className="mb-8">
                <label htmlFor="child-select" className="block text-sm font-medium text-gray-700 mb-2">Viewing Dashboard For:</label>
                <select id="child-select" value={selectedChildId} onChange={e => setSelectedChildId(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 w-full md:w-1/3 p-2.5">
                    {parentData.children.map(child => (<option key={child.id} value={child.id}>{child.name}</option>))}
                </select>
            </div>
            <nav className="flex space-x-2 md:space-x-4 border-b mb-8">
                {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center px-3 md:px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}><tab.icon className="w-5 h-5 mr-2" /> {tab.label}</button>))}
            </nav>
            <main>
                {renderTabContent()}
            </main>
        </div>
    );
}
