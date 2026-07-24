const express = require('express');
const { body, param } = require('express-validator');
const abonoController = require('../controllers/abonoController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { uploadMemory, handleMulterError } = require('../middleware/upload');

const router = express.Router();

const abonoValidation = [
  body('clientId').isInt({ min: 1 }).withMessage('clientId must be a positive integer'),
  body('purchaseId').isInt({ min: 1 }).withMessage('purchaseId must be a positive integer'),
  body('abonoAmount').isFloat({ min: 0.01 }).withMessage('abonoAmount must be a positive number'),
  body('abonoType').isIn(['reduce_amount', 'reduce_term']).withMessage('abonoType must be reduce_amount or reduce_term')
];

// POST /api/abono/process  — process a capital abono
router.post(
  '/process',
  authenticateToken,
  authorizeRoles('seller', 'real_estate_admin', 'system_admin'),
  uploadMemory.single('proof'),
  handleMulterError,
  abonoValidation,
  abonoController.processAbono
);

// GET /api/abono/purchase/:purchaseId — history of abonos for a purchase
router.get(
  '/purchase/:purchaseId',
  authenticateToken,
  param('purchaseId').isInt({ min: 1 }),
  abonoController.getAbonosByPurchase
);

module.exports = router;
