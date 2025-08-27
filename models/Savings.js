const mongoose = require('mongoose');

const savingsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount must be greater than or equal to 0']
    },
    currency: {
        type: String,
        default: 'UGX',
        enum: ['USD', 'UGX', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR']
    },
    type: {
        type: String,
        required: [true, 'Savings type is required'],
        enum: ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Goal', 'Emergency Fund', 'Investment']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: [
            'General Savings',
            'Emergency Fund',
            'Vacation',
            'Home Purchase',
            'Car Purchase',
            'Education',
            'Retirement',
            'Wedding',
            'Business',
            'Investment',
            'Other'
        ]
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
    period: {
        startDate: {
            type: Date,
            required: [true, 'Start date is required']
        },
        endDate: {
            type: Date,
            required: [true, 'End date is required']
        }
    },
    goal: {
        targetAmount: {
            type: Number,
            min: [0, 'Target amount must be greater than or equal to 0']
        },
        targetDate: Date,
        isCompleted: {
            type: Boolean,
            default: false
        },
        progress: {
            type: Number,
            min: [0, 'Progress must be greater than or equal to 0'],
            max: [100, 'Progress cannot exceed 100'],
            default: 0
        }
    },
    source: {
        type: String,
        enum: ['Manual Entry', 'Bank Transfer', 'Salary', 'Bonus', 'Investment Return', 'Other'],
        default: 'Manual Entry'
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringAmount: {
        type: Number,
        min: [0, 'Recurring amount must be greater than or equal to 0']
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
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
savingsSchema.index({ user: 1, date: -1 });
savingsSchema.index({ user: 1, type: 1 });
savingsSchema.index({ user: 1, category: 1 });
savingsSchema.index({ user: 1, 'period.startDate': 1, 'period.endDate': 1 });

// Virtual for formatted amount
savingsSchema.virtual('formattedAmount').get(function () {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: this.currency
    }).format(this.amount);
});

// Virtual for period duration
savingsSchema.virtual('durationDays').get(function () {
    if (!this.period.startDate || !this.period.endDate) return 0;
    const diffTime = Math.abs(this.period.endDate - this.period.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for goal progress percentage
savingsSchema.virtual('goalProgressPercentage').get(function () {
    if (!this.goal.targetAmount || this.goal.targetAmount === 0) return 0;
    return Math.min((this.amount / this.goal.targetAmount) * 100, 100);
});

// Static method to get savings by date range
savingsSchema.statics.getByDateRange = function (userId, startDate, endDate) {
    return this.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
};

// Static method to get savings by type
savingsSchema.statics.getByType = function (userId, type, startDate, endDate) {
    const query = { user: userId, type };
    if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
    }
    return this.find(query).sort({ date: -1 });
};

// Static method to get total savings by date range
savingsSchema.statics.getTotalByDateRange = function (userId, startDate, endDate) {
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

// Static method to get savings summary by period
savingsSchema.statics.getSummaryByPeriod = function (userId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$type',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
                average: { $avg: '$amount' }
            }
        },
        {
            $sort: { total: -1 }
        }
    ]);
};

// Method to update goal progress
savingsSchema.methods.updateGoalProgress = function () {
    if (this.goal.targetAmount && this.goal.targetAmount > 0) {
        this.goal.progress = Math.min((this.amount / this.goal.targetAmount) * 100, 100);
        this.goal.isCompleted = this.goal.progress >= 100;
    }
};

// Pre-save middleware to update goal progress
savingsSchema.pre('save', function (next) {
    this.updateGoalProgress();
    next();
});

module.exports = mongoose.model('Savings', savingsSchema);
