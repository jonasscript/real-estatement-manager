const express = require('express');
const { body, param, query } = require('express-validator');
const purchaseStageController = require('../controllers/purchaseStageController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const definitionValidation = [
  body('name').trim().notEmpty().withMessage('Stage name is required'),
  body('sortOrder').optional().isInt({ min: 1 }).withMessage('sortOrder must be a positive integer'),
  body('valueType').isIn(['fixed_amount', 'percentage']).withMessage('valueType must be fixed_amount or percentage'),
  body('value').isFloat({ min: 0 }).withMessage('value must be zero or greater'),
  body('requiresPayment').optional().isBoolean().withMessage('requiresPayment must be boolean'),
  body('requiresApproval').optional().isBoolean().withMessage('requiresApproval must be boolean'),
  body('blocksNextStage').optional().isBoolean().withMessage('blocksNextStage must be boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

router.get('/definitions',
  authenticateToken,
  query('realEstateId').optional().isInt({ min: 1 }),
  purchaseStageController.getDefinitions
);

router.post('/definitions',
  authenticateToken,
  definitionValidation,
  purchaseStageController.createDefinition.bind(purchaseStageController)
);

router.put('/definitions/:definitionId',
  authenticateToken,
  param('definitionId').isInt({ min: 1 }),
  definitionValidation,
  purchaseStageController.updateDefinition.bind(purchaseStageController)
);

router.delete('/definitions/:definitionId',
  authenticateToken,
  param('definitionId').isInt({ min: 1 }),
  purchaseStageController.deleteDefinition
);

module.exports = router;
