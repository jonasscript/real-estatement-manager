const express = require('express');
const { body, param, query } = require('express-validator');
const installmentController = require('../controllers/installmentController');
const { authenticateToken, authorizeRoles, checkClientAssignment } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const statusUpdateValidation = [
  body('status')
    .isIn(['pending', 'paid', 'overdue', 'late'])
    .withMessage('Status must be pending, paid, overdue, or late')
];

const installmentIdValidation = [
  param('installmentId')
    .isInt({ min: 1 })
    .withMessage('Valid installment ID is required')
];

const clientIdValidation = [
  param('clientId')
    .isInt({ min: 1 })
    .withMessage('Valid client ID is required')
];

const realEstateIdValidation = [
  param('realEstateId')
    .isInt({ min: 1 })
    .withMessage('Valid real estate ID is required')
];

// Routes

// Get all installments
router.get('/',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  installmentController.getAllInstallments
);

// Get installment by ID
router.get('/:installmentId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller', 'client'),
  installmentIdValidation,
  installmentController.getInstallmentById
);

// Get installments by client
router.get('/client/:clientId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  clientIdValidation,
  checkClientAssignment,
  installmentController.getInstallmentsByClient
);

// Get current user's installments
router.get('/my-installments/all',
  authenticateToken,
  //authorizeRoles('client'),
  installmentController.getMyInstallments
);

// Update installment status (Admin/Seller only)
router.put('/:installmentId/status',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  installmentIdValidation,
  statusUpdateValidation,
  installmentController.updateInstallmentStatus
);

// Get overdue installments
router.get('/overdue/real-estate/:realEstateId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  realEstateIdValidation,
  installmentController.getOverdueInstallments
);

// Get all overdue installments (System Admin)
router.get('/overdue/all',
  authenticateToken,
  //authorizeRoles('system_admin'),
  installmentController.getOverdueInstallments
);

// Get upcoming installments
router.get('/upcoming/real-estate/:realEstateId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  realEstateIdValidation,
  installmentController.getUpcomingInstallments
);

// Get all upcoming installments (System Admin)
router.get('/upcoming/all',
  authenticateToken,
  //authorizeRoles('system_admin'),
  installmentController.getUpcomingInstallments
);

// Get installment statistics
router.get('/statistics/all',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  installmentController.getInstallmentStatistics
);

// Get client installment summary
router.get('/summary/client/:clientId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  clientIdValidation,
  checkClientAssignment,
  installmentController.getClientInstallmentSummary
);

// Get current user's installment summary
router.get('/summary/my',
  authenticateToken,
  //authorizeRoles('client'),
  installmentController.getMyInstallmentSummary
);

module.exports = router;