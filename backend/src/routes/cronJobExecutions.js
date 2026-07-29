const express = require('express');
const { body } = require('express-validator');
const cronJobExecutionController = require('../controllers/cronJobExecutionController');
const { authenticateInternalService } = require('../middleware/auth');

const router = express.Router();

// Internal service-to-service endpoint. Called by cronjobschedule/ when a
// cron_configurations row is due, not by end users — authorized with a
// shared secret (CRON_INTERNAL_TOKEN) instead of a user JWT.
router.post('/',
  authenticateInternalService,
  [
    body('jobType').isIn(['PAYMENT_REMINDER', 'OVERDUE_PAYMENT', 'CLIENT_BIRTHDAY']),
    body('realEstateId').isInt({ min: 1 }),
    body('notificationChannels').isObject(),
    body('cronConfigId').optional().isInt({ min: 1 }),
    body('cronConfigName').optional().trim(),
  ],
  cronJobExecutionController.execute
);

module.exports = router;
