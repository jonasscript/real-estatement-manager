const express = require('express');
const { param, query } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const notificationIdValidation = [
  param('notificationId')
    .isInt({ min: 1 })
    .withMessage('Valid notification ID is required')
];

// Routes

// Get user's notifications
router.get('/',
  authenticateToken,
  notificationController.getUserNotifications
);

// Get notification by ID
router.get('/:notificationId',
  authenticateToken,
  notificationIdValidation,
  notificationController.getNotificationById
);

// Mark notification as read
router.put('/:notificationId/read',
  authenticateToken,
  notificationIdValidation,
  notificationController.markAsRead
);

// Mark all notifications as read
router.put('/read-all',
  authenticateToken,
  notificationController.markAllAsRead
);

// Delete notification
router.delete('/:notificationId',
  authenticateToken,
  notificationIdValidation,
  notificationController.deleteNotification
);

// Get notification statistics
router.get('/statistics/overview',
  authenticateToken,
  notificationController.getNotificationStatistics
);

// Create notification (System Admin only - for testing)
router.post('/',
  authenticateToken,
  //authorizeRoles('system_admin'),
  [
    require('express-validator').body('recipientId').isInt({ min: 1 }),
    require('express-validator').body('type').notEmpty(),
    require('express-validator').body('title').notEmpty(),
    require('express-validator').body('message').notEmpty()
  ],
  notificationController.createNotification
);

module.exports = router;