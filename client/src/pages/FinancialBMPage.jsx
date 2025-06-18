import React, { useState, useMemo } from 'react';
import { DollarSign, LineChart, Users, Repeat, Search, Download, FilePlus } from 'lucide-react';

// --- Reusable Components (can be moved to common folder) ---
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

// --- MOCK DATA ---
const financialStats = {
    totalRevenue: '$14,870.50',
    mrr: '$2,150.00',
    activeSubscriptions: 15,
    overdueInvoices: 3,
};
const transactionsData = [
    { id: 'txn_1', user: 'Jane Smith', type: 'Payment', amount: 139.99, date: '2025-06-15', status: 'Completed' },
    { id: 'txn_2', user: 'Alex Johnson', type: 'Payment', amount: 35.00, date: '2025-06-15', status: 'Completed' },
    { id: 'txn_3', user: 'Bob Williams', type: 'Refund', amount: -35.00, date: '2025-06-14', status: 'Completed' },
    { id: 'txn_4', user: 'Chris Brown', type: 'Invoice', amount: 124.99, date: '2025-06-12', status: 'Overdue' },
    { id: 'txn_5', user: 'Patricia Garcia', type: 'Payment', amount: 124.99, date: '2025-06-12', status: 'Completed' },
];

// --- Financial Management Page Component ---
export default function FinancialBMPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTransactions = useMemo(() => {
        return transactionsData.filter(t =>
            t.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Financial Management</h1>
                <p className="text-gray-600">Monitor revenue, manage transactions, and oversee billing.</p>
            </header>

            {/* Key Metric Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Revenue" value={financialStats.totalRevenue} change="+12.5%" icon={DollarSign} iconBgColor="bg-green-100" iconColor="text-green-600" />
                <StatCard title="Monthly Recurring Revenue" value={financialStats.mrr} change="+2.1%" icon={Repeat} iconBgColor="bg-purple-100" iconColor="text-purple-600" />
                <StatCard title="Active Subscriptions" value={financialStats.activeSubscriptions} change="+2" icon={Users} />
                <StatCard title="Overdue Invoices" value={financialStats.overdueInvoices} icon={FilePlus} iconBgColor="bg-red-100" iconColor="text-red-600" />
            </div>

            {/* Revenue Chart and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2">
                    <Card>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Trend (Last 90 Days)</h3>
                        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                            <LineChart className="w-16 h-16 text-gray-300" />
                            <p className="text-gray-400 ml-4">Revenue chart would be displayed here.</p>
                        </div>
                    </Card>
                </div>
                <div>
                    <Card>
                         <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                         <div className="space-y-3">
                            <button className="w-full text-left bg-gray-100 hover:bg-gray-200 p-3 rounded-md font-medium text-gray-800">Export Revenue Report</button>
                            <button className="w-full text-left bg-gray-100 hover:bg-gray-200 p-3 rounded-md font-medium text-gray-800">Manage Subscription Plans</button>
                            <button className="w-full text-left bg-gray-100 hover:bg-gray-200 p-3 rounded-md font-medium text-gray-800">View Payment Gateway</button>
                         </div>
                    </Card>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">Recent Transactions</h2>
                    <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Search by name or Txn ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Transaction ID</th>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredTransactions.map(txn => (
                                <tr key={txn.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{txn.id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-800">{txn.user}</td>
                                    <td className="px-6 py-4 text-gray-600">{txn.type}</td>
                                    <td className="px-6 py-4 text-gray-600">{formatDate(txn.date)}</td>
                                    <td className={`px-6 py-4 font-semibold text-right ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>${Math.abs(txn.amount).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                         <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                                            txn.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>{txn.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
