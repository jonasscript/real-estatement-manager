const express = require('express');
const { body, param, query } = require('express-validator');
const userController = require('../controllers/userController');
const {
  authenticateToken,
  authorizeRoles,
  checkRealEstateAccess,
} = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('roleId').isInt({ min: 1 }).withMessage('Valid role ID is required'),
  body('phone').optional(),
];

const updateUserValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
];

const userIdValidation = [
  param('userId').isInt({ min: 1 }).withMessage('Valid user ID is required'),
];

const realEstateIdValidation = [
  param('realEstateId')
    .isInt({ min: 1 })
    .withMessage('Valid real estate ID is required'),
];

const clientIdValidation = [
  param('clientId')
    .isInt({ min: 1 })
    .withMessage('Valid client ID is required'),
];

// Routes

// Get all users (System Admin only)
router.get(
  '/',
  authenticateToken,
  //authorizeRoles('system_admin'),
  userController.getAllUsers
);

// Get user statistics (System Admin only)
router.get(
  '/statistics',
  authenticateToken,
  //authorizeRoles('system_admin'),
  userController.getUserStatistics
);

// Get user by ID
router.get(
  '/:userId',
  authenticateToken,
  userIdValidation,
  userController.getUserById
);

// Create new user (System Admin and Real Estate Admin)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('system_admin', 'real_estate_admin'),
  createUserValidation,
  userController.createUser
);

// Create new user (System Admin and Real Estate Admin)
router.post('/register_new', createUserValidation, (req, res) =>
  userController.createUser(req, res, true)
);

// Update user
router.put(
  '/:userId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  userIdValidation,
  updateUserValidation,
  userController.updateUser
);

// Delete user (System Admin only)
router.delete(
  '/:userId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  userIdValidation,
  userController.deleteUser
);

// Get users by role
router.get(
  '/role/:role',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  userController.getUsersByRole
);

// Get sellers by real estate
router.get(
  '/real-estate/:realEstateId/sellers',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  userController.getSellersByRealEstate
);

// Get clients by real estate
router.get(
  '/real-estate/:realEstateId/clients',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  userController.getClientsByRealEstate
);

// Assign seller to client
router.put(
  '/clients/:clientId/assign-seller',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  clientIdValidation,
  [
    body('sellerId')
      .isInt({ min: 1 })
      .withMessage('Valid seller ID is required'),
  ],
  userController.assignSellerToClient
);

// Get sellers by real estate (filtered by role_id = 3 for sellers)
router.get(
  '/real-estate/:realEstateId/sellers-only',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  userController.getSellersOnlyByRealEstate
);

// Get users with seller role for a specific real estate (for seller service)
router.get(
  '/real-estate/:realEstateId/sellers-users',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  userController.getUsersSellersRealEstate
);

// Get available sellers for a real estate
router.get(
  '/real-estate/:realEstateId/available-sellers',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  userController.getAvailableSellers
);

// Get available clients for a real estate (role_id = 4, not already clients)
router.get(
  '/real-estate/:realEstateId/available-clients',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  userController.getAvailableClients
);

// Change user password (System Admin only)
router.put(
  '/:userId/password',
  authenticateToken,
  //authorizeRoles('system_admin'),
  userIdValidation,
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
  ],
  userController.changePassword
);

// Public user registration (for clients and sellers)
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('First name must be between 2 and 100 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Last name must be between 2 and 100 characters'),
    body('roleId')
      .isInt({ min: 3, max: 4 }) // Only allow client (4) and seller (3) roles for public registration
      .withMessage('Invalid role selected'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
  ],
  userController.registerUser
);

module.exports = router;
