import React from 'react';
import { DollarSign, Download, CheckCircle, Clock } from 'lucide-react';
import Button from '../common/Button'; // Assuming a reusable button component

// --- MOCK DATA (to be replaced by API calls) ---
const billingData = {
    nextPaymentDue: 'July 1, 2025',
    amountDue: 139.99,
    history: [
        { id: 'INV-2025-0601', date: 'June 1, 2025', amount: 139.99, status: 'Paid' },
        { id: 'INV-2025-0501', date: 'May 1, 2025', amount: 139.99, status: 'Paid' },
        { id: 'INV-2025-0401', date: 'April 1, 2025', amount: 139.99, status: 'Paid' },
    ]
};

/**
 * A component to display a user's billing history and current account status.
 */
export default function BillingHistory() {
    return (
        <div className="bg-white rounded-xl shadow-md">
            {/* Account Summary Section */}
            <div className="p-6 md:flex justify-between items-center border-b">
                <div className='mb-4 md:mb-0'>
                    <p className="text-sm text-gray-500">Next Payment Due</p>
                    <p className="text-2xl font-bold text-gray-800">${billingData.amountDue.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">on {billingData.nextPaymentDue}</p>
                </div>
                <Button variant="primary" Icon={DollarSign}>
                    Make Payment
                </Button>
            </div>

            {/* Invoice History Table */}
            <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice History</h3>
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
                            {billingData.history.map((invoice) => (
                                <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-800">{invoice.id}</td>
                                    <td className="px-6 py-4 text-gray-600">{invoice.date}</td>
                                    <td className="px-6 py-4 text-gray-600">${invoice.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${
                                            invoice.status === 'Paid' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {invoice.status === 'Paid' 
                                                ? <CheckCircle className="w-4 h-4 mr-1" /> 
                                                : <Clock className="w-4 h-4 mr-1" />
                                            }
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-600 hover:text-blue-800 hover:underline">
                                            <Download className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
