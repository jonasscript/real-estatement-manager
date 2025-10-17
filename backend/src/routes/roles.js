const express = require('express');
const { body, param } = require('express-validator');
const roleController = require('../controllers/roleController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createRoleValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Role name can only contain lowercase letters and underscores'),
  body('description')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Description must be between 5 and 255 characters')
];

const updateRoleValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Role name can only contain lowercase letters and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Description must be between 5 and 255 characters')
];

const roleIdValidation = [
  param('roleId')
    .isInt({ min: 1 })
    .withMessage('Valid role ID is required')
];

// Routes

// Get all roles (public for registration)
router.get('/',
  roleController.getAllRoles
);

// Get roles for registration (exclude system_admin)
router.get('/registration',
  roleController.getRolesForRegistration
);

// Get role by ID
router.get('/:roleId',
  authenticateToken,
  authorizeRoles('system_admin'),
  roleIdValidation,
  roleController.getRoleById
);

// Create new role (admin only)
router.post('/',
  authenticateToken,
  authorizeRoles('system_admin'),
  createRoleValidation,
  roleController.createRole
);

// Update role (admin only)
router.put('/:roleId',
  authenticateToken,
  authorizeRoles('system_admin'),
  roleIdValidation,
  updateRoleValidation,
  roleController.updateRole
);

// Delete role (admin only)
router.delete('/:roleId',
  authenticateToken,
  authorizeRoles('system_admin'),
  roleIdValidation,
  roleController.deleteRole
);

// Get role statistics (admin only)
router.get('/statistics/all',
  authenticateToken,
  authorizeRoles('system_admin'),
  roleController.getRoleStatistics
);

module.exports = router;