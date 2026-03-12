const express = require('express');
const { param, body } = require('express-validator');
const actionController = require('../controllers/actionController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const actionIdValidation = [
  param('actionId')
    .isInt({ min: 1 })
    .withMessage('Valid action ID is required')
];

const createActionValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Action name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Action name must be between 2 and 100 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Action name must contain only lowercase letters and underscores'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Action description is required')
    .isLength({ min: 5, max: 255 })
    .withMessage('Action description must be between 5 and 255 characters')
];

// Get all actions (authenticated users)
router.get('/',
  authenticateToken,
  actionController.getAllActions
);

// Create action
router.post('/',
  authenticateToken,
  createActionValidation,
  actionController.createAction
);

// Get action by ID
router.get('/:actionId',
  authenticateToken,
  actionIdValidation,
  actionController.getActionById
);

module.exports = router;
