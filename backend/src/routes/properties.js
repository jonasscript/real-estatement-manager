const express = require('express');
const { body, param, query } = require('express-validator');
const propertyController = require('../controllers/propertyController');
const { authenticateToken, authorizeRoles, checkRealEstateAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createPropertyValidation = [
  body('realEstateId')
    .isInt({ min: 1 })
    .withMessage('Valid real estate ID is required'),
  body('title')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Title must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('propertyType')
    .isIn(['house', 'apartment', 'land', 'commercial'])
    .withMessage('Property type must be house, apartment, land, or commercial'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('downPaymentPercentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Down payment percentage must be between 0 and 100'),
  body('totalInstallments')
    .isInt({ min: 1, max: 360 })
    .withMessage('Total installments must be between 1 and 360'),
  body('status')
    .optional()
    .isIn(['available', 'sold', 'under_construction'])
    .withMessage('Status must be available, sold, or under_construction')
];

const updatePropertyValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Title must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('propertyType')
    .optional()
    .isIn(['house', 'apartment', 'land', 'commercial'])
    .withMessage('Property type must be house, apartment, land, or commercial'),
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
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('downPaymentPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Down payment percentage must be between 0 and 100'),
  body('totalInstallments')
    .optional()
    .isInt({ min: 1, max: 360 })
    .withMessage('Total installments must be between 1 and 360'),
  body('status')
    .optional()
    .isIn(['available', 'sold', 'under_construction'])
    .withMessage('Status must be available, sold, or under_construction')
];

const propertyIdValidation = [
  param('propertyId')
    .isInt({ min: 1 })
    .withMessage('Valid property ID is required')
];

const realEstateIdValidation = [
  param('realEstateId')
    .isInt({ min: 1 })
    .withMessage('Valid real estate ID is required')
];

// Routes

// Get all properties
router.get('/',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  propertyController.getAllProperties
);

// Search properties
router.get('/search',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller', 'client'),
  [
    query('q')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Search term must be at least 2 characters')
  ],
  propertyController.searchProperties
);

// Get property by ID
router.get('/:propertyId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller', 'client'),
  propertyIdValidation,
  propertyController.getPropertyById
);

// Create new property (Real Estate Admin only)
router.post('/',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  createPropertyValidation,
  propertyController.createProperty
);

// Update property
router.put('/:propertyId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  propertyIdValidation,
  updatePropertyValidation,
  propertyController.updateProperty
);

// Delete property (System Admin only)
router.delete('/:propertyId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  propertyIdValidation,
  propertyController.deleteProperty
);

// Get properties by real estate
router.get('/real-estate/:realEstateId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  propertyController.getPropertiesByRealEstate
);

// Alternative route for properties by real estate (backward compatibility)
router.get('/real-estate/:realEstateId/properties',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  propertyController.getPropertiesByRealEstate
);

// Get available properties (for clients)
router.get('/available/all',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller', 'client'),
  propertyController.getAvailableProperties
);

// Get property statistics
router.get('/statistics/real-estate/:realEstateId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  propertyController.getPropertyStatistics
);

// Get all properties statistics (System Admin only)
router.get('/statistics/all',
  authenticateToken,
  //authorizeRoles('system_admin'),
  propertyController.getAllPropertiesStatistics
);

module.exports = router;