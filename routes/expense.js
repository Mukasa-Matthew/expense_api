const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
router.post('/', [
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    body('category')
        .isIn([
            'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
            'Healthcare', 'Housing', 'Utilities', 'Insurance', 'Education',
            'Travel', 'Personal Care', 'Gifts', 'Subscriptions', 'Other'
        ])
        .withMessage('Invalid category'),
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    body('paymentMethod')
        .optional()
        .isIn(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Digital Wallet', 'Other'])
        .withMessage('Invalid payment method'),
    body('isRecurring')
        .optional()
        .isBoolean()
        .withMessage('isRecurring must be a boolean'),
    body('recurringFrequency')
        .optional()
        .isIn(['Daily', 'Weekly', 'Monthly', 'Yearly'])
        .withMessage('Invalid recurring frequency')
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

        const expenseData = {
            ...req.body,
            user: req.user._id,
            currency: req.body.currency || req.user.currency
        };

        const expense = await Expense.create(expenseData);

        res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            data: expense
        });
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ message: 'Server error while creating expense' });
    }
});

// @desc    Get all expenses for user with filtering
// @route   GET /api/expenses
// @access  Private
router.get('/', [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format'),
    query('category')
        .optional()
        .isString()
        .withMessage('Category must be a string'),
    query('minAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Min amount must be a positive number'),
    query('maxAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Max amount must be a positive number'),
    query('paymentMethod')
        .optional()
        .isString()
        .withMessage('Payment method must be a string'),
    query('sortBy')
        .optional()
        .isIn(['date', 'amount', 'category', 'createdAt'])
        .withMessage('Invalid sort field'),
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
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

        const {
            page = 1,
            limit = 20,
            startDate,
            endDate,
            category,
            minAmount,
            maxAmount,
            paymentMethod,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        // Build query
        const query = { user: req.user._id };

        // Date range filter
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        // Category filter
        if (category) {
            query.category = category;
        }

        // Amount range filter
        if (minAmount || maxAmount) {
            query.amount = {};
            if (minAmount) query.amount.$gte = parseFloat(minAmount);
            if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
        }

        // Payment method filter
        if (paymentMethod) {
            query.paymentMethod = paymentMethod;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [expenses, total] = await Promise.all([
            Expense.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('user', 'firstName lastName'),
            Expense.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            data: expenses,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: total,
                itemsPerPage: parseInt(limit),
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ message: 'Server error while fetching expenses' });
    }
});

// @desc    Get expense by ID
// @route   GET /api/expenses/:id
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const expense = await Expense.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('user', 'firstName lastName');

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        res.json({
            success: true,
            data: expense
        });
    } catch (error) {
        console.error('Get expense error:', error);
        res.status(500).json({ message: 'Server error while fetching expense' });
    }
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
router.put('/:id', [
    body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    body('category')
        .optional()
        .isIn([
            'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
            'Healthcare', 'Housing', 'Utilities', 'Insurance', 'Education',
            'Travel', 'Personal Care', 'Gifts', 'Subscriptions', 'Other'
        ])
        .withMessage('Invalid category'),
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters')
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

        const expense = await Expense.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Update fields
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                expense[key] = req.body[key];
            }
        });

        const updatedExpense = await expense.save();

        res.json({
            success: true,
            message: 'Expense updated successfully',
            data: updatedExpense
        });
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ message: 'Server error while updating expense' });
    }
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        res.json({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ message: 'Server error while deleting expense' });
    }
});

// @desc    Get expenses summary (totals by category)
// @route   GET /api/expenses/summary/summary
// @access  Private
router.get('/summary/summary', [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format')
], async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

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

        // Get summary by category
        const summary = await Expense.aggregate([
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

        // Get total expenses
        const totalResult = await Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const total = totalResult.length > 0 ? totalResult[0] : { total: 0, count: 0 };

        res.json({
            success: true,
            data: {
                summary,
                total: total.total,
                count: total.count,
                period: {
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            }
        });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ message: 'Server error while fetching summary' });
    }
});

// @desc    Bulk delete expenses
// @route   DELETE /api/expenses/bulk
// @access  Private
router.delete('/bulk', [
    body('expenseIds')
        .isArray({ min: 1 })
        .withMessage('Expense IDs array is required with at least one ID'),
    body('expenseIds.*')
        .isMongoId()
        .withMessage('Invalid expense ID format')
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

        const { expenseIds } = req.body;

        // Delete expenses that belong to the user
        const result = await Expense.deleteMany({
            _id: { $in: expenseIds },
            user: req.user._id
        });

        res.json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} expenses`,
            data: {
                deletedCount: result.deletedCount
            }
        });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ message: 'Server error while bulk deleting expenses' });
    }
});

// @desc    Get expense categories
// @route   GET /api/expenses/categories
// @access  Private
router.get('/categories', async (req, res) => {
    try {
        const categories = [
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
        ];

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Server error while fetching categories' });
    }
});

module.exports = router;
