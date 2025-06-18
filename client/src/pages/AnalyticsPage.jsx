import React, { useState } from 'react';
import { LineChart, DollarSign, Users, Activity, Calendar } from 'lucide-react';

// --- Reusable Components (assuming they are in their own files) ---
const Card = ({ children, className = '' }) => (<div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>);
const StatCard = ({ title, value, change, icon: Icon, iconBgColor = 'bg-blue-100', iconColor = 'text-blue-600' }) => (
    <Card className="flex items-center">
        <div className={`p-3 ${iconBgColor} rounded-lg mr-4`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <div className="flex items-baseline">
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                {change && <span className={`ml-2 text-sm font-semibold ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{change}</span>}
            </div>
        </div>
    </Card>
);

// --- Analytics Page Main Component ---
export default function AnalyticsPage() {
    const [dateRange, setDateRange] = useState('30d');

    return (
        <div>
            {/* Header and Date Range Filter */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Analytics & Reporting</h1>
                    <p className="text-gray-600">Track key metrics and business performance.</p>
                </div>
                <div className="flex items-center bg-gray-100 rounded-lg p-1 mt-4 md:mt-0">
                    <button onClick={() => setDateRange('7d')} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${dateRange === '7d' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>7 Days</button>
                    <button onClick={() => setDateRange('30d')} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${dateRange === '30d' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>30 Days</button>
                    <button onClick={() => setDateRange('90d')} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${dateRange === '90d' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>90 Days</button>
                </div>
            </header>

            {/* Key Metric Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Revenue" value="$12,450" change="+12.5%" icon={DollarSign} iconBgColor="bg-green-100" iconColor="text-green-600" />
                <StatCard title="New Signups" value="82" change="+5.1%" icon={Users} iconBgColor="bg-yellow-100" iconColor="text-yellow-600" />
                <StatCard title="Sessions Completed" value="214" change="+8.2%" icon={Activity} iconBgColor="bg-purple-100" iconColor="text-purple-600" />
                <StatCard title="Avg. Tutor Rating" value="4.8/5" change="-0.1" icon={LineChart} />
            </div>

            {/* Chart Placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <Card>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Over Time</h3>
                    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                        <p className="text-gray-400">Line chart would be here</p>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">User Growth</h3>
                    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                        <p className="text-gray-400">Bar chart would be here</p>
                    </div>
                </Card>
            </div>
            
            {/* Recent Activity Feed */}
            <Card>
                 <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                 <ul className="divide-y">
                    <li className="py-3 flex items-center gap-4">
                        <div className="p-2 bg-green-100 rounded-full"><Users className="w-5 h-5 text-green-600"/></div>
                        <div><span className="font-semibold">Jane Smith</span> signed up as a new parent.</div>
                        <div className="ml-auto text-sm text-gray-500">2 min ago</div>
                    </li>
                     <li className="py-3 flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-full"><Calendar className="w-5 h-5 text-blue-600"/></div>
                        <div><span className="font-semibold">Alex Smith</span> booked a new session with <span className="font-semibold">Mr. Davis</span>.</div>
                        <div className="ml-auto text-sm text-gray-500">1 hour ago</div>
                    </li>
                     <li className="py-3 flex items-center gap-4">
                        <div className="p-2 bg-yellow-100 rounded-full"><DollarSign className="w-5 h-5 text-yellow-600"/></div>
                        <div>A payment of <span className="font-semibold">$139.99</span> was successfully processed.</div>
                        <div className="ml-auto text-sm text-gray-500">3 hours ago</div>
                    </li>
                 </ul>
            </Card>
        </div>
    );
}
