const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be greater than 0']
    },
    currency: {
        type: String,
        default: 'UGX',
        enum: ['USD', 'UGX', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: [
            'Food & Dining',
            'Transportation',
            'Shopping',
            'Entertainment',
            'Healthcare',
            'Housing',
            'Utilities',
            'Insurance',
            'Education',
            'Travel',
            'Personal Care',
            'Gifts',
            'Subscriptions',
            'Other'
        ]
    },
    subcategory: {
        type: String,
        trim: true,
        maxlength: [100, 'Subcategory cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Digital Wallet', 'Other'],
        default: 'Cash'
    },
    location: {
        type: String,
        trim: true,
        maxlength: [200, 'Location cannot exceed 200 characters']
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringFrequency: {
        type: String,
        enum: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
        default: 'Monthly'
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    receipt: {
        url: String,
        filename: String,
        uploadedAt: Date
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1 });
expenseSchema.index({ user: 1, date: 1, category: 1 });

// Virtual for formatted amount
expenseSchema.virtual('formattedAmount').get(function () {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: this.currency
    }).format(this.amount);
});

// Virtual for expense date in different formats
expenseSchema.virtual('dateFormatted').get(function () {
    return this.date.toLocaleDateString();
});

expenseSchema.virtual('monthYear').get(function () {
    return this.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

// Static method to get expenses by date range
expenseSchema.statics.getByDateRange = function (userId, startDate, endDate) {
    return this.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
};

// Static method to get expenses by category
expenseSchema.statics.getByCategory = function (userId, category, startDate, endDate) {
    const query = { user: userId, category };
    if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
    }
    return this.find(query).sort({ date: -1 });
};

// Static method to get total expenses by date range
expenseSchema.statics.getTotalByDateRange = function (userId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);
};

module.exports = mongoose.model('Expense', expenseSchema);
