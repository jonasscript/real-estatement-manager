const express = require('express');
const { body, param, query } = require('express-validator');
const realEstateController = require('../controllers/realEstateController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createRealEstateValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const updateRealEstateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty'),
  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty'),
  body('country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const realEstateIdValidation = [
  param('realEstateId')
    .isInt({ min: 1 })
    .withMessage('Valid real estate ID is required')
];

// Routes

// Get all real estates
router.get('/',
  authenticateToken,
  //authorizeRoles('system_admin'),
  realEstateController.getAllRealEstates
);

// Search real estates
router.get('/search',
  authenticateToken,
  //authorizeRoles('system_admin'),
  [
    query('q')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Search term must be at least 2 characters')
  ],
  realEstateController.searchRealEstates
);

// Get real estate by ID
router.get('/:realEstateId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  realEstateController.getRealEstateById
);

// Create new real estate (System Admin only)
router.post('/',
  authenticateToken,
  //authorizeRoles('system_admin'),
  createRealEstateValidation,
  realEstateController.createRealEstate
);

// Update real estate
router.put('/:realEstateId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  realEstateIdValidation,
  updateRealEstateValidation,
  realEstateController.updateRealEstate
);

// Delete real estate (System Admin only)
router.delete('/:realEstateId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  realEstateIdValidation,
  realEstateController.deleteRealEstate
);

// Get real estate statistics
router.get('/:realEstateId/statistics',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  realEstateController.getRealEstateStatistics
);

// Get all real estates statistics (System Admin only)
router.get('/statistics/all',
  authenticateToken,
  //authorizeRoles('system_admin'),
  realEstateController.getAllRealEstatesStatistics
);

// Get real estates by admin (for real estate admins)
router.get('/admin/my-real-estates',
  authenticateToken,
  //authorizeRoles('real_estate_admin'),
  realEstateController.getRealEstatesByAdmin
);

module.exports = router;