import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, LineChart, Users, Repeat, Search, Download, FilePlus, AlertCircle } from 'lucide-react';
import { getFinancialStats, getRevenueTrend, getTransactions } from '../api/financials';
import Card from '../components/common/Card.jsx';

// --- Reusable Components (can be moved to common folder) ---
const StatCard = ({ title, value, change, icon: Icon, iconBgColor = 'bg-blue-100', iconColor = 'text-blue-600', isLoading = false }) => (
    <Card className="flex items-center">
        <div className={`p-3 ${iconBgColor} rounded-lg mr-4`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <div className="flex items-baseline">
                {isLoading ? (
                    <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                    <>
                        <p className="text-2xl font-bold text-gray-800">{value}</p>
                        {change && <span className={`ml-2 text-sm font-semibold ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{change}</span>}
                    </>
                )}
            </div>
        </div>
    </Card>
);

// --- Financial Management Page Component ---
export default function FinancialBMPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [financialStats, setFinancialStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [revenueTrend, setRevenueTrend] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchFinancialData();
    }, []);

    const fetchFinancialData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Fetch all data in parallel
            const [stats, trend, txnData] = await Promise.all([
                getFinancialStats(),
                getRevenueTrend(90),
                getTransactions({ limit: 50 })
            ]);
            
            setFinancialStats(stats);
            setRevenueTrend(trend);
            setTransactions(txnData);
        } catch (err) {
            console.error('Failed to fetch financial data:', err);
            setError(err.message || 'Failed to load financial data');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTransactions = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];
        return transactions.filter(t =>
            (t.user && t.user.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.id && t.id.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [transactions, searchTerm]);

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Financial Management</h1>
                <p className="text-gray-600">Monitor revenue, manage transactions, and oversee billing.</p>
            </header>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {/* Key Metric Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="Total Revenue" 
                    value={financialStats ? `$${parseFloat(financialStats.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'} 
                    change={financialStats?.totalRevenueChange} 
                    icon={DollarSign} 
                    iconBgColor="bg-green-100" 
                    iconColor="text-green-600"
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Monthly Recurring Revenue" 
                    value={financialStats ? `$${parseFloat(financialStats.mrr).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'} 
                    change={financialStats?.mrrChange} 
                    icon={Repeat} 
                    iconBgColor="bg-purple-100" 
                    iconColor="text-purple-600"
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Active Subscriptions" 
                    value={financialStats?.activeSubscriptions || 0} 
                    change={financialStats?.activeSubscriptionsChange} 
                    icon={Users}
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Overdue Invoices" 
                    value={financialStats?.overdueInvoices || 0} 
                    icon={FilePlus} 
                    iconBgColor="bg-red-100" 
                    iconColor="text-red-600"
                    isLoading={isLoading}
                />
            </div>

            {/* Revenue Chart and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2">
                    <Card>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Trend (Last 90 Days)</h3>
                        {isLoading ? (
                            <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : revenueTrend.length > 0 ? (
                            <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                    <LineChart className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400">Chart visualization coming soon</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {revenueTrend.length} data points loaded
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                    <LineChart className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400">No revenue data available</p>
                                </div>
                            </div>
                        )}
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
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-2 text-gray-500">Loading transactions...</p>
                                    </td>
                                </tr>
                            ) : filteredTransactions.length > 0 ? (
                                filteredTransactions.map(txn => (
                                    <tr key={txn.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-600">{txn.id}</td>
                                        <td className="px-6 py-4 font-medium text-gray-800">{txn.user}</td>
                                        <td className="px-6 py-4 text-gray-600">{txn.type}</td>
                                        <td className="px-6 py-4 text-gray-600">{formatDate(txn.date)}</td>
                                        <td className={`px-6 py-4 font-semibold text-right ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ${Math.abs(txn.amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                                                txn.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                                txn.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                                txn.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>{txn.status}</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        {searchTerm ? 'No transactions found matching your search.' : 'No transactions yet.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
