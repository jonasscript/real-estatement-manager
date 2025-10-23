const express = require('express');
const { body, param } = require('express-validator');
const permissionController = require('../controllers/permissionController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createPermissionValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Permission name must be between 2 and 100 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Permission name can only contain lowercase letters and underscores'),
  body('description')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Description must be between 5 and 255 characters'),
  body('componentName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Component name must be between 2 and 100 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Component name can only contain lowercase letters and underscores'),
  body('action')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Action must be between 2 and 50 characters')
    .matches(/^[a-z]+$/)
    .withMessage('Action can only contain lowercase letters')
];

const updatePermissionValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Permission name must be between 2 and 100 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Permission name can only contain lowercase letters and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Description must be between 5 and 255 characters'),
  body('componentName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Component name must be between 2 and 100 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Component name can only contain lowercase letters and underscores'),
  body('action')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Action must be between 2 and 50 characters')
    .matches(/^[a-z]+$/)
    .withMessage('Action can only contain lowercase letters')
];

const permissionIdValidation = [
  param('permissionId')
    .isInt({ min: 1 })
    .withMessage('Valid permission ID is required')
];

const roleIdValidation = [
  param('roleId')
    .isInt({ min: 1 })
    .withMessage('Valid role ID is required')
];

const componentValidation = [
  param('componentName')
    .matches(/^[a-z_]+$/)
    .withMessage('Component name can only contain lowercase letters and underscores')
];

const actionValidation = [
  param('action')
    .matches(/^[a-z]+$/)
    .withMessage('Action can only contain lowercase letters')
];

// Routes

// Get all permissions (authenticated users)
router.get('/',
  authenticateToken,
  permissionController.getAllPermissions
);

// Get permissions by role
router.get('/role/:roleId',
  authenticateToken,
  roleIdValidation,
  permissionController.getPermissionsByRole
);

// Get permissions by component and role
router.get('/component/:componentName/role/:roleId',
  authenticateToken,
  componentValidation,
  roleIdValidation,
  permissionController.getPermissionsByComponentAndRole
);

// Check user permission
router.get('/check/:roleId/:componentName/:action',
  authenticateToken,
  roleIdValidation,
  componentValidation,
  actionValidation,
  permissionController.checkPermission
);

// Get permission by ID
router.get('/:permissionId',
  authenticateToken,
  authorizeRoles('system_admin'),
  permissionIdValidation,
  permissionController.getPermissionById
);

// Create new permission (admin only)
router.post('/',
  authenticateToken,
  authorizeRoles('system_admin'),
  createPermissionValidation,
  permissionController.createPermission
);

// Update permission (admin only)
router.put('/:permissionId',
  authenticateToken,
  authorizeRoles('system_admin'),
  permissionIdValidation,
  updatePermissionValidation,
  permissionController.updatePermission
);

// Delete permission (admin only)
router.delete('/:permissionId',
  authenticateToken,
  authorizeRoles('system_admin'),
  permissionIdValidation,
  permissionController.deletePermission
);

// Assign permission to role (admin only)
router.post('/assign/:roleId/:permissionId',
  authenticateToken,
  authorizeRoles('system_admin'),
  roleIdValidation,
  permissionIdValidation,
  permissionController.assignPermissionToRole
);

// Remove permission from role (admin only)
router.delete('/assign/:roleId/:permissionId',
  authenticateToken,
  authorizeRoles('system_admin'),
  roleIdValidation,
  permissionIdValidation,
  permissionController.removePermissionFromRole
);

module.exports = router;