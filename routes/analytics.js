const express = require('express');
const { query, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const Savings = require('../models/Savings');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// @desc    Get expense pie chart data by category
// @route   GET /api/analytics/expenses/pie-chart
// @access  Private
router.get('/expenses/pie-chart', [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format'),
    query('currency')
        .optional()
        .isString()
        .withMessage('Currency must be a string')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { startDate, endDate, currency } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
        }

        const query = { user: req.user._id };
        if (Object.keys(dateFilter).length > 0) {
            query.date = dateFilter;
        }

        // Filter by currency if specified
        if (currency) {
            query.currency = currency;
        }

        // Get expenses grouped by category for pie chart
        const pieChartData = await Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    average: { $avg: '$amount' }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // Calculate total expenses
        const totalExpenses = pieChartData.reduce((sum, item) => sum + item.total, 0);

        // Format data for pie chart
        const formattedData = pieChartData.map(item => ({
            category: item._id,
            amount: item.total,
            count: item.count,
            average: item.average,
            percentage: totalExpenses > 0 ? ((item.total / totalExpenses) * 100).toFixed(2) : 0,
            color: getCategoryColor(item._id) // Helper function for consistent colors
        }));

        res.json({
            success: true,
            data: {
                pieChartData: formattedData,
                totalExpenses,
                totalCount: pieChartData.reduce((sum, item) => sum + item.count, 0),
                period: {
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            }
        });
    } catch (error) {
        console.error('Get expense pie chart error:', error);
        res.status(500).json({ message: 'Server error while generating expense pie chart' });
    }
});

// @desc    Get savings pie chart data by type
// @route   GET /api/analytics/savings/pie-chart
// @access  Private
router.get('/savings/pie-chart', [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format'),
    query('currency')
        .optional()
        .isString()
        .withMessage('Currency must be a string')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { startDate, endDate, currency } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
        }

        const query = { user: req.user._id };
        if (Object.keys(dateFilter).length > 0) {
            query.date = dateFilter;
        }

        // Filter by currency if specified
        if (currency) {
            query.currency = currency;
        }

        // Get savings grouped by type for pie chart
        const pieChartData = await Savings.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    average: { $avg: '$amount' }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // Calculate total savings
        const totalSavings = pieChartData.reduce((sum, item) => sum + item.total, 0);

        // Format data for pie chart
        const formattedData = pieChartData.map(item => ({
            type: item._id,
            amount: item.total,
            count: item.count,
            average: item.average,
            percentage: totalSavings > 0 ? ((item.total / totalSavings) * 100).toFixed(2) : 0,
            color: getSavingsTypeColor(item._id) // Helper function for consistent colors
        }));

        res.json({
            success: true,
            data: {
                pieChartData: formattedData,
                totalSavings,
                totalCount: pieChartData.reduce((sum, item) => sum + item.count, 0),
                period: {
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            }
        });
    } catch (error) {
        console.error('Get savings pie chart error:', error);
        res.status(500).json({ message: 'Server error while generating savings pie chart' });
    }
});

// @desc    Get financial overview (expenses vs savings)
// @route   GET /api/analytics/overview
// @access  Private
router.get('/overview', [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format'),
    query('currency')
        .optional()
        .isString()
        .withMessage('Currency must be a string')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { startDate, endDate, currency } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
        }

        const baseQuery = { user: req.user._id };
        if (Object.keys(dateFilter).length > 0) {
            baseQuery.date = dateFilter;
        }

        // Filter by currency if specified
        if (currency) {
            baseQuery.currency = currency;
        }

        // Get expenses and savings data
        const [expensesData, savingsData] = await Promise.all([
            Expense.aggregate([
                { $match: baseQuery },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                        average: { $avg: '$amount' }
                    }
                }
            ]),
            Savings.aggregate([
                { $match: baseQuery },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                        average: { $avg: '$amount' }
                    }
                }
            ])
        ]);

        const totalExpenses = expensesData.length > 0 ? expensesData[0].total : 0;
        const totalSavings = savingsData.length > 0 ? savingsData[0].total : 0;
        const netWorth = totalSavings - totalExpenses;

        // Get top expense categories
        const topExpenseCategories = await Expense.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 5 }
        ]);

        // Get top savings types
        const topSavingsTypes = await Savings.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalExpenses,
                    totalSavings,
                    netWorth,
                    savingsRate: totalExpenses > 0 ? ((totalSavings / totalExpenses) * 100).toFixed(2) : 0
                },
                topExpenseCategories,
                topSavingsTypes,
                period: {
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            }
        });
    } catch (error) {
        console.error('Get financial overview error:', error);
        res.status(500).json({ message: 'Server error while generating financial overview' });
    }
});

// @desc    Get monthly trends
// @route   GET /api/analytics/trends/monthly
// @access  Private
router.get('/trends/monthly', [
    query('year')
        .optional()
        .isInt({ min: 2020, max: 2030 })
        .withMessage('Year must be between 2020 and 2030'),
    query('currency')
        .optional()
        .isString()
        .withMessage('Currency must be a string')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { year = new Date().getFullYear(), currency } = req.query;

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const baseQuery = {
            user: req.user._id,
            date: { $gte: startDate, $lte: endDate }
        };

        if (currency) {
            baseQuery.currency = currency;
        }

        // Get monthly expenses
        const monthlyExpenses = await Expense.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: { month: { $month: '$date' } },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.month': 1 } }
        ]);

        // Get monthly savings
        const monthlySavings = await Savings.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: { month: { $month: '$date' } },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.month': 1 } }
        ]);

        // Create complete monthly data
        const monthlyData = [];
        for (let month = 1; month <= 12; month++) {
            const expenseData = monthlyExpenses.find(item => item._id.month === month);
            const savingsData = monthlySavings.find(item => item._id.month === month);

            monthlyData.push({
                month: month,
                monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' }),
                expenses: expenseData ? expenseData.total : 0,
                savings: savingsData ? savingsData.total : 0,
                netWorth: (savingsData ? savingsData.total : 0) - (expenseData ? expenseData.total : 0)
            });
        }

        res.json({
            success: true,
            data: {
                year: parseInt(year),
                monthlyData,
                totalExpenses: monthlyData.reduce((sum, month) => sum + month.expenses, 0),
                totalSavings: monthlyData.reduce((sum, month) => sum + month.savings, 0),
                averageMonthlyExpenses: monthlyData.reduce((sum, month) => sum + month.expenses, 0) / 12,
                averageMonthlySavings: monthlyData.reduce((sum, month) => sum + month.savings, 0) / 12
            }
        });
    } catch (error) {
        console.error('Get monthly trends error:', error);
        res.status(500).json({ message: 'Server error while generating monthly trends' });
    }
});

// @desc    Get category comparison over time
// @route   GET /api/analytics/expenses/category-trends
// @access  Private
router.get('/expenses/category-trends', [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format'),
    query('groupBy')
        .optional()
        .isIn(['day', 'week', 'month'])
        .withMessage('Group by must be day, week, or month'),
    query('currency')
        .optional()
        .isString()
        .withMessage('Currency must be a string')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { startDate, endDate, groupBy = 'month', currency } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
        }

        const baseQuery = { user: req.user._id };
        if (Object.keys(dateFilter).length > 0) {
            baseQuery.date = dateFilter;
        }

        if (currency) {
            baseQuery.currency = currency;
        }

        // Build group stage based on groupBy parameter
        let groupStage;
        switch (groupBy) {
            case 'day':
                groupStage = {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        category: '$category'
                    }
                };
                break;
            case 'week':
                groupStage = {
                    _id: {
                        year: { $year: '$date' },
                        week: { $week: '$date' },
                        category: '$category'
                    }
                };
                break;
            case 'month':
            default:
                groupStage = {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                        category: '$category'
                    }
                };
                break;
        }

        // Get category trends
        const categoryTrends = await Expense.aggregate([
            { $match: baseQuery },
            { $group: { ...groupStage, total: { $sum: '$amount' } } },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.date': 1 } }
        ]);

        res.json({
            success: true,
            data: {
                categoryTrends,
                groupBy,
                period: {
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            }
        });
    } catch (error) {
        console.error('Get category trends error:', error);
        res.status(500).json({ message: 'Server error while generating category trends' });
    }
});

// Helper function to get consistent colors for expense categories
function getCategoryColor(category) {
    const colors = {
        'Food & Dining': '#FF6B6B',
        'Transportation': '#4ECDC4',
        'Shopping': '#45B7D1',
        'Entertainment': '#96CEB4',
        'Healthcare': '#FFEAA7',
        'Housing': '#DDA0DD',
        'Utilities': '#98D8C8',
        'Insurance': '#F7DC6F',
        'Education': '#BB8FCE',
        'Travel': '#85C1E9',
        'Personal Care': '#F8C471',
        'Gifts': '#F1948A',
        'Subscriptions': '#85C1E9',
        'Other': '#BDC3C7'
    };
    return colors[category] || '#BDC3C7';
}

// Helper function to get consistent colors for savings types
function getSavingsTypeColor(type) {
    const colors = {
        'Daily': '#E74C3C',
        'Weekly': '#E67E22',
        'Monthly': '#F39C12',
        'Yearly': '#F1C40F',
        'Goal': '#2ECC71',
        'Emergency Fund': '#3498DB',
        'Investment': '#9B59B6'
    };
    return colors[type] || '#BDC3C7';
}

module.exports = router;
