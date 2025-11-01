const express = require('express');
const { body, param, query } = require('express-validator');
const propertyController = require('../controllers/propertyController');
const { authenticateToken, authorizeRoles, checkRealEstateAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createPropertyValidation = [
  body('propertyModelId')
    .isInt({ min: 1 })
    .withMessage('Valid property model ID is required'),
  body('unitId')
    .isInt({ min: 1 })
    .withMessage('Valid unit ID is required'),
  body('propertyStatusId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid property status ID is required'),
  body('customPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Custom price must be a positive number'),
  body('customDownPaymentPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Custom down payment percentage must be between 0 and 100'),
  body('customInstallments')
    .optional()
    .isInt({ min: 1, max: 360 })
    .withMessage('Custom installments must be between 1 and 360'),
  body('customInstallmentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Custom installment amount must be a positive number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

const updatePropertyValidation = [
  body('propertyStatusId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid property status ID is required'),
  body('customPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Custom price must be a positive number'),
  body('customDownPaymentPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Custom down payment percentage must be between 0 and 100'),
  body('customInstallments')
    .optional()
    .isInt({ min: 1, max: 360 })
    .withMessage('Custom installments must be between 1 and 360'),
  body('customInstallmentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Custom installment amount must be a positive number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
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
  [
    query('realEstateId').optional().isInt({ min: 1 }).withMessage('Valid real estate ID required'),
    query('propertyTypeId').optional().isInt({ min: 1 }).withMessage('Valid property type ID required'),
    query('statusId').optional().isInt({ min: 1 }).withMessage('Valid status ID required'),
    query('phaseId').optional().isInt({ min: 1 }).withMessage('Valid phase ID required'),
    query('blockId').optional().isInt({ min: 1 }).withMessage('Valid block ID required'),
    query('search').optional().trim().isLength({ min: 2 }).withMessage('Search term must be at least 2 characters')
  ],
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