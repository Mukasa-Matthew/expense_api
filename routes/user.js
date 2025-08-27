const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            success: true,
            data: user.getPublicProfile()
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error while fetching profile' });
    }
});

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
router.put('/profile', [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be less than 50 characters'),
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be less than 50 characters'),
    body('phoneNumber')
        .optional()
        .matches(/^\+?[\d\s-()]+$/)
        .withMessage('Please provide a valid phone number'),
    body('currency')
        .optional()
        .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'])
        .withMessage('Invalid currency'),
    body('timezone')
        .optional()
        .isString()
        .withMessage('Timezone must be a string')
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

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields
        const fieldsToUpdate = ['firstName', 'lastName', 'phoneNumber', 'currency', 'timezone'];
        fieldsToUpdate.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        const updatedUser = await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser.getPublicProfile()
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Server error while updating profile' });
    }
});

// @desc    Update notification settings
// @route   PUT /api/user/notifications
// @access  Private
router.put('/notifications', [
    body('notificationSettings')
        .isObject()
        .withMessage('Notification settings must be an object'),
    body('notificationSettings.dailyReminder')
        .optional()
        .isBoolean()
        .withMessage('Daily reminder must be a boolean'),
    body('notificationSettings.weeklyReport')
        .optional()
        .isBoolean()
        .withMessage('Weekly report must be a boolean'),
    body('notificationSettings.monthlyReport')
        .optional()
        .isBoolean()
        .withMessage('Monthly report must be a boolean'),
    body('notificationSettings.budgetAlerts')
        .optional()
        .isBoolean()
        .withMessage('Budget alerts must be a boolean'),
    body('notificationSettings.pushNotifications')
        .optional()
        .isBoolean()
        .withMessage('Push notifications must be a boolean')
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

        const { notificationSettings } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update notification settings
        Object.keys(notificationSettings).forEach(key => {
            if (typeof notificationSettings[key] === 'boolean') {
                user.notificationSettings[key] = notificationSettings[key];
            }
        });

        await user.save();

        res.json({
            success: true,
            message: 'Notification settings updated successfully',
            data: {
                notificationSettings: user.notificationSettings
            }
        });
    } catch (error) {
        console.error('Notification settings update error:', error);
        res.status(500).json({ message: 'Server error while updating notification settings' });
    }
});

// @desc    Change password
// @route   PUT /api/user/change-password
// @access  Private
router.put('/change-password', [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
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

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ message: 'Server error while changing password' });
    }
});

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
router.delete('/account', [
    body('password')
        .notEmpty()
        .withMessage('Password is required to confirm account deletion')
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

        const { password } = req.body;

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Password is incorrect' });
        }

        // Deactivate user instead of deleting (soft delete)
        user.isActive = false;
        await user.save();

        res.json({
            success: true,
            message: 'Account deactivated successfully'
        });
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ message: 'Server error while deactivating account' });
    }
});

// @desc    Get user statistics
// @route   GET /api/user/stats
// @access  Private
router.get('/stats', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get basic user stats
        const stats = {
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                currency: user.currency,
                timezone: user.timezone,
                memberSince: user.createdAt,
                lastLogin: user.lastLogin
            },
            preferences: {
                notificationSettings: user.notificationSettings
            }
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ message: 'Server error while fetching user statistics' });
    }
});

module.exports = router;
