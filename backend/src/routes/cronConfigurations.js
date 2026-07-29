const express = require('express');
const { body, param, query } = require('express-validator');
const cronConfigurationController = require('../controllers/cronConfigurationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const configurationValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional({ nullable: true }).trim(),
  body('jobType').isIn(['PAYMENT_REMINDER', 'OVERDUE_PAYMENT', 'CLIENT_BIRTHDAY']).withMessage('jobType must be PAYMENT_REMINDER, OVERDUE_PAYMENT or CLIENT_BIRTHDAY'),
  body('frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('frequency must be daily, weekly or monthly'),
  body('dayOfWeek').optional({ nullable: true }).isInt({ min: 0, max: 6 }).withMessage('dayOfWeek must be between 0 and 6'),
  body('dayOfMonth').optional({ nullable: true }).isInt({ min: 1, max: 31 }).withMessage('dayOfMonth must be between 1 and 31'),
  body('timeOfDay').matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).withMessage('timeOfDay must be a valid HH:mm time'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('notifyEmail').optional().isBoolean().withMessage('notifyEmail must be boolean'),
  body('notifyWhatsapp').optional().isBoolean().withMessage('notifyWhatsapp must be boolean'),
];

router.get('/',
  authenticateToken,
  query('realEstateId').optional().isInt({ min: 1 }),
  cronConfigurationController.getConfigurations
);

router.post('/',
  authenticateToken,
  configurationValidation,
  cronConfigurationController.createConfiguration.bind(cronConfigurationController)
);

router.put('/:configId',
  authenticateToken,
  param('configId').isInt({ min: 1 }),
  configurationValidation,
  cronConfigurationController.updateConfiguration.bind(cronConfigurationController)
);

router.delete('/:configId',
  authenticateToken,
  param('configId').isInt({ min: 1 }),
  cronConfigurationController.deleteConfiguration
);

module.exports = router;
