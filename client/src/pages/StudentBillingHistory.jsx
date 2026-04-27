import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Download, CheckCircle, Clock, AlertCircle, ArrowLeft, CreditCard, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getTransactions } from '../api/financials.js';
import Card from '../components/common/Card.jsx';

// Reusable Components
const CardHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="border-b pb-4 mb-6">
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-3 text-blue-500" />
            <div>
                <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
        </div>
    </div>
);

export default function StudentBillingHistory() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) return;

        // Check if user is a student
        if (user.role !== 'student') {
            navigate('/dashboard');
            return;
        }

        fetchTransactions();
    }, [user, navigate]);

    const fetchTransactions = async () => {
        try {
            setIsLoading(true);
            setError('');
            const data = await getTransactions({ limit: 100 });
            setTransactions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
            setError('Failed to load billing history. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Completed': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
            'Pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
            'Failed': { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
            'Overdue': { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
            'Cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', icon: X },
        };

        const config = statusConfig[status] || statusConfig['Pending'];
        const Icon = config.icon || CheckCircle;

        return (
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
                <Icon className="w-3 h-3 mr-1" />
                {status}
            </span>
        );
    };

    // Check payment permission
    const canMakePayments = user?.canMakePayments !== false; // Default to true if not set
    const hasLinkedParent = user?.hasLinkedParent || (user?.parents && user.parents.length > 0);

    // If student has linked parent and payment is disabled, show message
    if (hasLinkedParent && !canMakePayments) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <button
                    onClick={() => navigate('/settings')}
                    className="flex items-center text-gray-600 hover:text-gray-800 mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Settings
                </button>

                <Card>
                    <div className="text-center py-12">
                        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Access Restricted</h2>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Your parent has restricted payment access for your account. To view billing history or make payments, please contact your linked parent.
                        </p>
                        {user?.parents && user.parents.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                                <p className="text-sm text-gray-600 mb-2">Linked Parent{user.parents.length > 1 ? 's' : ''}:</p>
                                <div className="space-y-1">
                                    {user.parents.map((parent, index) => (
                                        <p key={index} className="text-sm font-medium text-gray-800">
                                            {parent.name || parent.email}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => navigate('/settings')}
                            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Return to Settings
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <button
                        onClick={() => navigate('/settings')}
                        className="flex items-center text-gray-600 hover:text-gray-800 mb-2"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Settings
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">Billing History</h1>
                    <p className="text-gray-600 mt-1">View your payment history and transaction details</p>
                </div>
            </div>

            {isLoading ? (
                <Card>
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading billing history...</p>
                    </div>
                </Card>
            ) : error ? (
                <Card>
                    <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600">{error}</p>
                        <button
                            onClick={fetchTransactions}
                            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </Card>
            ) : transactions.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">No Transactions Yet</h2>
                        <p className="text-gray-600 mb-6">
                            You haven't made any payments yet. Your billing history will appear here once you complete a payment.
                        </p>
                        <button
                            onClick={() => navigate('/appointments')}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Book a Session
                        </button>
                    </div>
                </Card>
            ) : (
                <Card>
                    <CardHeader 
                        icon={DollarSign} 
                        title="Transaction History" 
                        subtitle={`${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} found`}
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Transaction ID</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Description</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((transaction) => (
                                    <tr key={transaction._id || transaction.id} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-sm">
                                            {transaction.transactionId || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {formatDate(transaction.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                                {transaction.type || 'Payment'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {transaction.description || 
                                             (transaction.booking?.subject ? `Session: ${transaction.booking.subject}` : 'Payment')}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-sm">
                                            {formatCurrency(transaction.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(transaction.status)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    {transactions.length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-600">Total Transactions</p>
                                    <p className="text-2xl font-bold text-gray-800">{transactions.length}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">Total Amount</p>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {formatCurrency(
                                            transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}

