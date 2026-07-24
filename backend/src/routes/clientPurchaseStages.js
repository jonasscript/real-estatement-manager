const express = require('express');
const { param } = require('express-validator');
const purchaseStageController = require('../controllers/purchaseStageController');
const { authenticateToken } = require('../middleware/auth');
const { uploadMemory, handleMulterError } = require('../middleware/upload');

const router = express.Router();

router.post('/:stageId/payments',
  authenticateToken,
  param('stageId').isInt({ min: 1 }).withMessage('Valid stage ID is required'),
  uploadMemory.single('proof'),
  handleMulterError,
  purchaseStageController.createStagePayment
);

module.exports = router;
