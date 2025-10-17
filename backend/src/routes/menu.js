const express = require('express');
const { body, param } = require('express-validator');
const menuController = require('../controllers/menuController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createMenuValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('label')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Label must be between 2 and 100 characters'),
  body('path')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Path must be less than 255 characters'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon must be less than 50 characters'),
  body('parentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent ID must be a valid integer'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const updateMenuValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('label')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Label must be between 2 and 100 characters'),
  body('path')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Path must be less than 255 characters'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon must be less than 50 characters'),
  body('parentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent ID must be a valid integer'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const menuIdValidation = [
  param('menuId')
    .isInt({ min: 1 })
    .withMessage('Valid menu ID is required')
];

const roleIdValidation = [
  param('roleId')
    .isInt({ min: 1 })
    .withMessage('Valid role ID is required')
];

// Routes

// Get menu options for current user
router.get('/',
  authenticateToken,
  menuController.getMenuOptions
);

// Get menu options by role (admin only)
router.get('/role/:roleId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  roleIdValidation,
  menuController.getMenuOptionsByRole
);

// Get all menu options (admin only)
router.get('/all',
  authenticateToken,
  //authorizeRoles('system_admin'),
  menuController.getAllMenuOptions
);

// Create menu option (admin only)
router.post('/',
  authenticateToken,
  //authorizeRoles('system_admin'),
  createMenuValidation,
  menuController.createMenuOption
);

// Update menu option (admin only)
router.put('/:menuId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  menuIdValidation,
  updateMenuValidation,
  menuController.updateMenuOption
);

// Delete menu option (admin only)
router.delete('/:menuId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  menuIdValidation,
  menuController.deleteMenuOption
);

// Assign menu to role (admin only)
router.post('/assign/:roleId/:menuOptionId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  roleIdValidation,
  [
    param('menuOptionId')
      .isInt({ min: 1 })
      .withMessage('Valid menu option ID is required')
  ],
  menuController.assignMenuToRole
);

// Remove menu from role (admin only)
router.delete('/assign/:roleId/:menuOptionId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  roleIdValidation,
  [
    param('menuOptionId')
      .isInt({ min: 1 })
      .withMessage('Valid menu option ID is required')
  ],
  menuController.removeMenuFromRole
);

module.exports = router;