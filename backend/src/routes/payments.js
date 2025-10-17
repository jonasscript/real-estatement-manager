const express = require('express');
const { body, param, query } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { authenticateToken, authorizeRoles, checkClientAssignment } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const createPaymentValidation = [
  body('installmentId')
    .isInt({ min: 1 })
    .withMessage('Valid installment ID is required'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Valid amount is required'),
  body('paymentMethod')
    .isIn(['bank_transfer', 'deposit'])
    .withMessage('Payment method must be bank_transfer or deposit'),
  body('referenceNumber')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Reference number must be between 1 and 100 characters'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const approvePaymentValidation = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const paymentIdValidation = [
  param('paymentId')
    .isInt({ min: 1 })
    .withMessage('Valid payment ID is required')
];

// Routes

// Get client's payments (Client only)
router.get('/my-payments',
  authenticateToken,
  //authorizeRoles('client'),
  paymentController.getClientPayments
);

// Create payment with proof upload (Client only)
router.post('/upload',
  authenticateToken,
  //authorizeRoles('client'),
  upload.single('proof'),
  handleMulterError,
  createPaymentValidation,
  paymentController.createPayment
);

// Get payment by ID
router.get('/:paymentId',
  authenticateToken,
  paymentIdValidation,
  paymentController.getPaymentById
);

// Download payment proof
router.get('/:paymentId/download',
  authenticateToken,
  paymentIdValidation,
  paymentController.downloadPaymentProof
);

// Approve or reject payment (System Admin, Real Estate Admin, Seller)
router.put('/:paymentId/approve',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  paymentIdValidation,
  approvePaymentValidation,
  paymentController.approvePayment
);

// Get pending payments for approval (System Admin, Real Estate Admin, Seller)
router.get('/pending/approvals',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  paymentController.getPendingPayments
);

// Delete payment proof (System Admin only)
router.delete('/:paymentId/proof',
  authenticateToken,
  //authorizeRoles('system_admin'),
  paymentIdValidation,
  paymentController.deletePaymentProof
);

// Get payment statistics
router.get('/statistics/overview',
  authenticateToken,
  paymentController.getPaymentStatistics
);

// Get client's payments by client ID (for admins and sellers)
router.get('/client/:clientId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  [
    param('clientId')
      .isInt({ min: 1 })
      .withMessage('Valid client ID is required')
  ],
  checkClientAssignment,
  (req, res, next) => {
    req.params.clientId = req.params.clientId; // Pass clientId to controller
    paymentController.getClientPayments(req, res);
  }
);

module.exports = router;