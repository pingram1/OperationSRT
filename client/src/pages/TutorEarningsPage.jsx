import React, { useState, useEffect } from 'react';
import { 
    DollarSign, TrendingUp, Calendar, AlertCircle, CheckCircle, 
    Clock, User, FileText, Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTutorPayroll, checkCompliance } from '../api/payroll';

// --- Reusable Components ---
const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ icon: Icon, title, rightContent = null }) => (
    <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-3 text-blue-500" />
            <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
        </div>
        {rightContent}
    </div>
);

// --- Tutor Earnings Page Component ---
export default function TutorEarningsPage() {
    const { user } = useAuth();
    const [payrollData, setPayrollData] = useState(null);
    const [compliance, setCompliance] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'unpaid', 'paid', 'history'

    // Check if user is tutor or super_admin
    if (user?.role !== 'tutor' && user?.role !== 'super_admin') {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-600">Only tutors can access this page.</p>
            </div>
        );
    }

    useEffect(() => {
        fetchPayrollData();
    }, []);

    const fetchPayrollData = async () => {
        try {
            setIsLoading(true);
            setError('');
            
            const [payroll, complianceData] = await Promise.all([
                getTutorPayroll().catch(err => {
                    console.error('Failed to fetch payroll:', err);
                    return null;
                }),
                checkCompliance().catch(err => {
                    console.error('Failed to check compliance:', err);
                    return null;
                }),
            ]);

            setPayrollData(payroll);
            setCompliance(complianceData);
        } catch (err) {
            console.error('Failed to fetch payroll data:', err);
            setError('Failed to load earnings data. Please refresh the page.');
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
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatMonth = (monthKey) => {
        if (!monthKey) return 'N/A';
        const [year, month] = monthKey.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { 
            month: 'long',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading earnings data...</p>
            </div>
        );
    }

    if (error && !payrollData) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
                <p className="text-gray-600">{error}</p>
            </div>
        );
    }

    const tutorInfo = payrollData?.tutor || {};
    const isPayable = compliance?.isPayable || payrollData?.compliance?.isPayable || false;
    const complianceReason = compliance?.reason || payrollData?.compliance?.reason || '';

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Earnings & Payroll</h1>
                <p className="text-gray-600">View your earnings and payment status.</p>
            </header>

            {/* Compliance Alert */}
            {!isPayable && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-yellow-800 mb-1">Payment Eligibility Issue</h3>
                            <p className="text-sm text-yellow-700">{complianceReason}</p>
                            <p className="text-xs text-yellow-600 mt-2">
                                Please complete the required documentation to receive payments. Contact support if you need assistance.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {isPayable && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                        <div>
                            <h3 className="font-semibold text-green-800">Payment Eligible</h3>
                            <p className="text-sm text-green-700">You are eligible to receive payments.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Unpaid Earnings</p>
                            <p className="text-3xl font-bold text-blue-600">
                                {formatCurrency(payrollData?.unpaid?.totalAmount || 0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {payrollData?.unpaid?.sessionCount || 0} sessions
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Total Paid</p>
                            <p className="text-3xl font-bold text-green-600">
                                {formatCurrency(payrollData?.paid?.totalAmount || 0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {payrollData?.paid?.sessionCount || 0} sessions
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Total Earnings</p>
                            <p className="text-3xl font-bold text-purple-600">
                                {formatCurrency(payrollData?.totalEarnings || 0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                All time
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tutor Info Card */}
            <Card className="mb-6">
                <CardHeader icon={User} title="Payroll Information" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Pay Tier</p>
                        <p className="font-semibold text-gray-800">
                            {tutorInfo.payTier ? (
                                <>
                                    {tutorInfo.payTier.replace('_', ' ')} 
                                    <span className="text-sm text-gray-500 ml-2">
                                        ({formatCurrency(payrollData?.payRates?.[tutorInfo.payTier] || 0)}/session)
                                    </span>
                                </>
                            ) : (
                                <span className="text-gray-400">Not set</span>
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Contractor Type</p>
                        <p className="font-semibold text-gray-800">
                            {tutorInfo.contractorType || <span className="text-gray-400">Not set</span>}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Tax Form Status</p>
                        <p className="font-semibold text-gray-800">
                            {tutorInfo.taxFormStatus === 'W9_Complete' && (
                                <span className="text-green-600">W9 Complete</span>
                            )}
                            {tutorInfo.taxFormStatus === 'W8BEN_Complete' && (
                                <span className="text-green-600">W8BEN Complete</span>
                            )}
                            {(!tutorInfo.taxFormStatus || tutorInfo.taxFormStatus === 'Pending') && (
                                <span className="text-yellow-600">Pending</span>
                            )}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Pay Rates Info */}
            {payrollData?.payRates && (
                <Card className="mb-6">
                    <CardHeader icon={Info} title="Pay Rates" />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className={`p-3 rounded-lg ${
                            tutorInfo.payTier === 'Tier_1' 
                                ? 'bg-blue-50 border-2 border-blue-200' 
                                : 'bg-gray-50'
                        }`}>
                            <p className="text-sm text-gray-500 mb-1">Tier 1</p>
                            <p className={`text-lg font-bold ${
                                tutorInfo.payTier === 'Tier_1' 
                                    ? 'text-blue-600' 
                                    : 'text-gray-800'
                            }`}>
                                {formatCurrency(payrollData.payRates.Tier_1)}
                            </p>
                            <p className="text-xs text-gray-500">per session</p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                            tutorInfo.payTier === 'Tier_2' 
                                ? 'bg-blue-50 border-2 border-blue-200' 
                                : 'bg-gray-50'
                        }`}>
                            <p className="text-sm text-gray-500 mb-1">Tier 2</p>
                            <p className={`text-lg font-bold ${
                                tutorInfo.payTier === 'Tier_2' 
                                    ? 'text-blue-600' 
                                    : 'text-gray-800'
                            }`}>
                                {formatCurrency(payrollData.payRates.Tier_2)}
                            </p>
                            <p className="text-xs text-gray-500">per session</p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                            tutorInfo.payTier === 'Tier_3' 
                                ? 'bg-blue-50 border-2 border-blue-200' 
                                : 'bg-gray-50'
                        }`}>
                            <p className="text-sm text-gray-500 mb-1">Tier 3</p>
                            <p className={`text-lg font-bold ${
                                tutorInfo.payTier === 'Tier_3' 
                                    ? 'text-blue-600' 
                                    : 'text-gray-800'
                            }`}>
                                {formatCurrency(payrollData.payRates.Tier_3)}
                            </p>
                            <p className="text-xs text-gray-500">per session</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">Group Session</p>
                            <p className="text-lg font-bold text-gray-800">
                                {formatCurrency(payrollData.payRates.Group)}
                            </p>
                            <p className="text-xs text-gray-500">per session</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Tabs */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-2 border-b">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors ${
                            activeTab === 'overview'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        Unpaid Sessions
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors ${
                            activeTab === 'history'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        Monthly History
                    </button>
                </div>
            </div>

            {/* Unpaid Sessions */}
            {activeTab === 'overview' && (
                <Card>
                    <CardHeader 
                        icon={Clock} 
                        title="Unpaid Sessions"
                        rightContent={
                            <span className="text-sm text-gray-500">
                                {payrollData?.unpaid?.sessionCount || 0} sessions
                            </span>
                        }
                    />
                    {payrollData?.unpaid?.breakdown && payrollData.unpaid.breakdown.length > 0 ? (
                        <div className="space-y-3">
                            {payrollData.unpaid.breakdown.map((session) => (
                                <div
                                    key={session.sessionId}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                                                {session.studentName?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">{session.studentName}</p>
                                                <p className="text-sm text-gray-500">{session.subject}</p>
                                            </div>
                                        </div>
                                        <div className="ml-13 flex items-center gap-4 text-sm text-gray-600">
                                            <span className="flex items-center">
                                                <Calendar className="w-4 h-4 mr-1" />
                                                {formatDate(session.sessionDate)}
                                            </span>
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {session.serviceType === 'group' ? 'Group' : 'Solo'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {session.duration} min
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-blue-600">
                                            {formatCurrency(session.payAmount)}
                                        </p>
                                        <p className="text-xs text-gray-500">{session.payType}</p>
                                    </div>
                                </div>
                            ))}
                            <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                <p className="font-semibold text-gray-800">Total Unpaid</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatCurrency(payrollData?.unpaid?.totalAmount || 0)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-lg font-semibold">No unpaid sessions</p>
                            <p className="text-sm mt-2">Completed sessions will appear here once they're ready for payment.</p>
                        </div>
                    )}
                </Card>
            )}

            {/* Monthly History */}
            {activeTab === 'history' && (
                <Card>
                    <CardHeader icon={Calendar} title="Monthly Earnings History" />
                    {payrollData?.monthlyBreakdown && payrollData.monthlyBreakdown.length > 0 ? (
                        <div className="space-y-4">
                            {payrollData.monthlyBreakdown.map((month) => (
                                <div
                                    key={month.month}
                                    className="p-4 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-gray-800">
                                            {formatMonth(month.month)}
                                        </h4>
                                        <span className="text-sm text-gray-500">
                                            {month.sessionCount} sessions
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Unpaid</p>
                                            <p className="text-lg font-bold text-blue-600">
                                                {formatCurrency(month.unpaid)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Paid</p>
                                            <p className="text-lg font-bold text-green-600">
                                                {formatCurrency(month.paid)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-semibold text-gray-700">Total</p>
                                            <p className="text-xl font-bold text-gray-800">
                                                {formatCurrency(month.paid + month.unpaid)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-lg font-semibold">No earnings history</p>
                            <p className="text-sm mt-2">Monthly earnings will appear here once you have completed sessions.</p>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}


