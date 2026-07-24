const express = require('express');
const { body, param } = require('express-validator');
const purchaseStageController = require('../controllers/purchaseStageController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/:purchaseId/generate-down-payment-schedule',
  authenticateToken,
  param('purchaseId').isInt({ min: 1 }).withMessage('Valid purchase ID is required'),
  body('downPaymentPercentage').isFloat({ min: 0, max: 100 }).withMessage('downPaymentPercentage must be between 0 and 100'),
  body('installmentsCount').isInt({ min: 1 }).withMessage('installmentsCount must be a positive integer'),
  body('firstInstallmentDate').isISO8601().withMessage('firstInstallmentDate must be a valid date'),
  purchaseStageController.generateDownPaymentSchedule
);

module.exports = router;
