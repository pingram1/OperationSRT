const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Mongoose Schema for Transactions.
 * Tracks all financial transactions including payments, refunds, and invoices.
 */
const TransactionSchema = new Schema({
    /**
     * Unique transaction ID (e.g., txn_1, txn_2)
     */
    transactionId: {
        type: String,
        required: true,
        trim: true,
    },
    
    /**
     * The user associated with this transaction
     */
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    
    /**
     * Type of transaction
     */
    type: {
        type: String,
        enum: ['Payment', 'Refund', 'Invoice'],
        required: true,
    },
    
    /**
     * Transaction amount (positive for payments, negative for refunds)
     */
    amount: {
        type: Number,
        required: true,
    },
    
    /**
     * Currency (default: USD)
     */
    currency: {
        type: String,
        default: 'USD',
    },
    
    /**
     * Transaction status
     */
    status: {
        type: String,
        enum: ['Completed', 'Pending', 'Failed', 'Overdue', 'Cancelled'],
        default: 'Pending',
    },
    
    /**
     * Reference to a booking if this transaction is related to a booking
     */
    booking: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        default: null,
    },
    
    /**
     * Reference to a membership plan if this transaction is related to a membership
     */
    membershipPlan: {
        type: Schema.Types.ObjectId,
        ref: 'MembershipPlan',
        default: null,
    },
    
    /**
     * Payment method used (e.g., 'Credit Card', 'PayPal', 'Bank Transfer')
     */
    paymentMethod: {
        type: String,
        default: '',
    },
    
    /**
     * External payment gateway transaction ID (if applicable)
     */
    gatewayTransactionId: {
        type: String,
        default: '',
    },
    
    /**
     * Description or notes about the transaction
     */
    description: {
        type: String,
        default: '',
    },
    
    /**
     * Due date for invoices
     */
    dueDate: {
        type: Date,
        default: null,
    },
    
    /**
     * Date when the transaction was completed/paid
     */
    paidDate: {
        type: Date,
        default: null,
    },
    
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
});

// Index for faster queries
TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ transactionId: 1 }, { unique: true });

// Create and export the Transaction model
module.exports = mongoose.model('Transaction', TransactionSchema);

