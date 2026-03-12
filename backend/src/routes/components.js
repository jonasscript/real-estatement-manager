const express = require('express');
const { param, body } = require('express-validator');
const componentController = require('../controllers/componentController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const componentIdValidation = [
  param('componentId')
    .isInt({ min: 1 })
    .withMessage('Valid component ID is required')
];

const createComponentValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Component name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Component name must be between 2 and 100 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Component name must contain only lowercase letters and underscores'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Component description is required')
    .isLength({ min: 5, max: 255 })
    .withMessage('Component description must be between 5 and 255 characters')
];

// Get all components (authenticated users)
router.get('/',
  authenticateToken,
  componentController.getAllComponents
);

// Create component
router.post('/',
  authenticateToken,
  createComponentValidation,
  componentController.createComponent
);

// Get component by ID
router.get('/:componentId',
  authenticateToken,
  componentIdValidation,
  componentController.getComponentById
);

module.exports = router;
