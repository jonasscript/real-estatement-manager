const express = require('express');
const { body, param, query } = require('express-validator');
const sellerController = require('../controllers/sellerController');
const { authenticateToken, authorizeRoles, checkRealEstateAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createSellerValidation = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  body('realEstateId')
    .isInt({ min: 1 })
    .withMessage('Valid real estate ID is required'),
  body('commissionRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Commission rate must be between 0 and 100')
];

const updateSellerValidation = [
  body('commissionRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Commission rate must be between 0 and 100'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  body('totalSales')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total sales must be a positive number'),
  body('totalCommission')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total commission must be a positive number')
];

const sellerIdValidation = [
  param('sellerId')
    .isInt({ min: 1 })
    .withMessage('Valid seller ID is required')
];

const userIdValidation = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required')
];

const realEstateIdValidation = [
  param('realEstateId')
    .isInt({ min: 1 })
    .withMessage('Valid real estate ID is required')
];

// Routes

// Get all sellers
router.get('/',
  authenticateToken,
  authorizeRoles('system_admin', 'real_estate_admin'),
  sellerController.getAllSellers
);

// Search sellers
router.get('/search',
  authenticateToken,
  authorizeRoles('system_admin', 'real_estate_admin'),
  [
    query('q')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Search term must be at least 2 characters')
  ],
  sellerController.getAllSellers
);

// Get seller by ID
router.get('/:sellerId',
  authenticateToken,
  authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  sellerIdValidation,
  sellerController.getSellerById
);

// Get seller by user ID
router.get('/user/:userId',
  authenticateToken,
  authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  userIdValidation,
  sellerController.getSellerByUserId
);

// Create new seller (Real Estate Admin only)
router.post('/',
  authenticateToken,
  authorizeRoles('system_admin', 'real_estate_admin'),
  createSellerValidation,
  sellerController.createSeller
);

// Update seller
router.put('/:sellerId',
  authenticateToken,
  authorizeRoles('system_admin', 'real_estate_admin'),
  sellerIdValidation,
  updateSellerValidation,
  sellerController.updateSeller
);

// Delete seller (System Admin only)
router.delete('/:sellerId',
  authenticateToken,
  authorizeRoles('system_admin'),
  sellerIdValidation,
  sellerController.deleteSeller
);

// Get sellers by real estate
router.get('/real-estate/:realEstateId/sellers',
  authenticateToken,
  authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  sellerController.getSellersByRealEstate
);

// Get seller statistics
router.get('/statistics/real-estate/:realEstateId',
  authenticateToken,
  authorizeRoles('system_admin', 'real_estate_admin'),
  realEstateIdValidation,
  checkRealEstateAccess,
  sellerController.getSellerStatistics
);

// Get all sellers statistics (System Admin only)
router.get('/statistics/all',
  authenticateToken,
  authorizeRoles('system_admin'),
  sellerController.getAllSellersStatistics
);

// Get seller performance
router.get('/:sellerId/performance',
  authenticateToken,
  authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  sellerIdValidation,
  sellerController.getSellerPerformance
);

// Get current user's seller profile (for sellers)
router.get('/profile/my',
  authenticateToken,
  authorizeRoles('seller'),
  sellerController.getMySellerProfile
);

// Get current user's seller performance (for sellers)
router.get('/performance/my',
  authenticateToken,
  authorizeRoles('seller'),
  sellerController.getMySellerPerformance
);

module.exports = router;