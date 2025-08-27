const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Savings = require('../models/Savings');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// @desc    Create new savings entry
// @route   POST /api/savings
// @access  Private
router.post('/', [
    body('amount')
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),
    body('type')
        .isIn(['Daily', 'Weekly', 'Monthly', 'Yearly', 'Goal', 'Emergency Fund', 'Investment'])
        .withMessage('Invalid savings type'),
    body('category')
        .isIn([
            'General Savings', 'Emergency Fund', 'Vacation', 'Home Purchase',
            'Car Purchase', 'Education', 'Retirement', 'Wedding', 'Business', 'Investment', 'Other'
        ])
        .withMessage('Invalid category'),
    body('period.startDate')
        .isISO8601()
        .withMessage('Start date is required and must be a valid date'),
    body('period.endDate')
        .isISO8601()
        .withMessage('End date is required and must be a valid date'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    body('goal.targetAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Target amount must be a positive number'),
    body('goal.targetDate')
        .optional()
        .isISO8601()
        .withMessage('Target date must be a valid date'),
    body('isRecurring')
        .optional()
        .isBoolean()
        .withMessage('isRecurring must be a boolean'),
    body('recurringAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Recurring amount must be a positive number'),
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

        const savingsData = {
            ...req.body,
            user: req.user._id,
            currency: req.body.currency || req.user.currency
        };

        const savings = await Savings.create(savingsData);

        res.status(201).json({
            success: true,
            message: 'Savings entry created successfully',
            data: savings
        });
    } catch (error) {
        console.error('Create savings error:', error);
        res.status(500).json({ message: 'Server error while creating savings entry' });
    }
});

// @desc    Get all savings for user with filtering
// @route   GET /api/savings
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
    query('type')
        .optional()
        .isString()
        .withMessage('Type must be a string'),
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
    query('sortBy')
        .optional()
        .isIn(['date', 'amount', 'type', 'category', 'createdAt'])
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
            type,
            category,
            minAmount,
            maxAmount,
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

        // Type filter
        if (type) {
            query.type = type;
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

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [savings, total] = await Promise.all([
            Savings.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('user', 'firstName lastName'),
            Savings.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            data: savings,
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
        console.error('Get savings error:', error);
        res.status(500).json({ message: 'Server error while fetching savings' });
    }
});

// @desc    Get savings by ID
// @route   GET /api/savings/:id
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const savings = await Savings.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('user', 'firstName lastName');

        if (!savings) {
            return res.status(404).json({ message: 'Savings entry not found' });
        }

        res.json({
            success: true,
            data: savings
        });
    } catch (error) {
        console.error('Get savings error:', error);
        res.status(500).json({ message: 'Server error while fetching savings entry' });
    }
});

// @desc    Update savings entry
// @route   PUT /api/savings/:id
// @access  Private
router.put('/:id', [
    body('amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),
    body('type')
        .optional()
        .isIn(['Daily', 'Weekly', 'Monthly', 'Yearly', 'Goal', 'Emergency Fund', 'Investment'])
        .withMessage('Invalid savings type'),
    body('category')
        .optional()
        .isIn([
            'General Savings', 'Emergency Fund', 'Vacation', 'Home Purchase',
            'Car Purchase', 'Education', 'Retirement', 'Wedding', 'Business', 'Investment', 'Other'
        ])
        .withMessage('Invalid category'),
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

        const savings = await Savings.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!savings) {
            return res.status(404).json({ message: 'Savings entry not found' });
        }

        // Update fields
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                savings[key] = req.body[key];
            }
        });

        const updatedSavings = await savings.save();

        res.json({
            success: true,
            message: 'Savings entry updated successfully',
            data: updatedSavings
        });
    } catch (error) {
        console.error('Update savings error:', error);
        res.status(500).json({ message: 'Server error while updating savings entry' });
    }
});

// @desc    Delete savings entry
// @route   DELETE /api/savings/:id
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const savings = await Savings.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!savings) {
            return res.status(404).json({ message: 'Savings entry not found' });
        }

        res.json({
            success: true,
            message: 'Savings entry deleted successfully'
        });
    } catch (error) {
        console.error('Delete savings error:', error);
        res.status(500).json({ message: 'Server error while deleting savings entry' });
    }
});

// @desc    Get savings summary by period
// @route   GET /api/savings/summary/period
// @access  Private
router.get('/summary/period', [
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

        // Get summary by type
        const summary = await Savings.getSummaryByPeriod(req.user._id, startDate ? new Date(startDate) : null, endDate ? new Date(endDate) : null);

        // Get total savings
        const totalResult = await Savings.getTotalByDateRange(req.user._id, startDate ? new Date(startDate) : null, endDate ? new Date(endDate) : null);

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
        console.error('Get period summary error:', error);
        res.status(500).json({ message: 'Server error while fetching period summary' });
    }
});

// @desc    Get savings goals progress
// @route   GET /api/savings/goals
// @access  Private
router.get('/goals', async (req, res) => {
    try {
        const goals = await Savings.find({
            user: req.user._id,
            'goal.targetAmount': { $exists: true, $gt: 0 }
        }).sort({ 'goal.targetDate': 1 });

        const goalsWithProgress = goals.map(goal => ({
            ...goal.toObject(),
            progressPercentage: goal.goalProgressPercentage,
            remainingAmount: goal.goal.targetAmount - goal.amount,
            isOnTrack: goal.goal.targetDate ?
                (goal.amount / goal.goal.targetAmount) >= (Date.now() - new Date(goal.period.startDate).getTime()) / (new Date(goal.goal.targetDate).getTime() - new Date(goal.period.startDate).getTime()) :
                true
        }));

        res.json({
            success: true,
            data: goalsWithProgress
        });
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({ message: 'Server error while fetching goals' });
    }
});

// @desc    Get savings by type (Daily, Weekly, Monthly, Yearly)
// @route   GET /api/savings/type/:type
// @access  Private
router.get('/type/:type', [
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
        const { type } = req.params;
        const { startDate, endDate } = req.query;

        // Validate type
        const validTypes = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Goal', 'Emergency Fund', 'Investment'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid savings type' });
        }

        const savings = await Savings.getByType(
            req.user._id,
            type,
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null
        );

        res.json({
            success: true,
            data: savings
        });
    } catch (error) {
        console.error('Get savings by type error:', error);
        res.status(500).json({ message: 'Server error while fetching savings by type' });
    }
});

// @desc    Bulk delete savings entries
// @route   DELETE /api/savings/bulk
// @access  Private
router.delete('/bulk', [
    body('savingsIds')
        .isArray({ min: 1 })
        .withMessage('Savings IDs array is required with at least one ID'),
    body('savingsIds.*')
        .isMongoId()
        .withMessage('Invalid savings ID format')
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

        const { savingsIds } = req.body;

        // Delete savings entries that belong to the user
        const result = await Savings.deleteMany({
            _id: { $in: savingsIds },
            user: req.user._id
        });

        res.json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} savings entries`,
            data: {
                deletedCount: result.deletedCount
            }
        });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ message: 'Server error while bulk deleting savings entries' });
    }
});

// @desc    Get savings categories
// @route   GET /api/savings/categories
// @access  Private
router.get('/categories', async (req, res) => {
    try {
        const categories = [
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
