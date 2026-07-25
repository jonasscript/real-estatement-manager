const express = require('express');
const { body, param, query } = require('express-validator');
const clientController = require('../controllers/clientController');
const { authenticateToken, authorizeRoles, checkClientAssignment } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const clientIdValidation = [
  param('clientId')
    .isInt({ min: 1 })
    .withMessage('Valid client ID is required')
];

// Routes

// Get client's own info (Client only)
router.get('/my-info',
  authenticateToken,
  //authorizeRoles('client'),
  clientController.getMyClientProfile
);

// Get client's installments (Client only)
router.get('/installments',
  authenticateToken,
  //authorizeRoles('client'),
  clientController.getClientInstallments
);

// Get client's payments (Client only)
router.get('/payments',
  authenticateToken,
  //authorizeRoles('client'),
  clientController.getClientPayments
);

// Get assigned clients (Seller only)
router.get('/assigned',
  authenticateToken,
  //authorizeRoles('seller'),
  clientController.getAssignedClients
);

// Get all clients (System Admin, Real Estate Admin, Seller)
router.get('/all',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin', 'seller'),
  clientController.getAllClients
);

// Get current client's own properties
router.get('/my-properties',
  authenticateToken,
  clientController.getMyProperties
);

router.get('/:clientId/purchases/:purchaseId/stages',
  authenticateToken,
  clientIdValidation,
  [
    param('purchaseId')
      .isInt({ min: 1 })
      .withMessage('Valid purchase ID is required')
  ],
  require('../controllers/purchaseStageController').getClientPurchaseStages
);

// Get client by ID
router.get('/:clientId',
  authenticateToken,
  clientIdValidation,
  checkClientAssignment,
  clientController.getClientById
);

// Create client (System Admin, Real Estate Admin)
router.post('/',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  [
    body('userId')
      .isInt({ min: 1 })
      .withMessage('Valid user ID is required'),
    body('propertyPurchases')
      .optional()
      .isArray()
      .withMessage('propertyPurchases must be an array'),
    body('purchaseMode')
      .optional()
      .isIn(['individual', 'unified'])
      .withMessage('purchaseMode must be individual or unified'),
    body('groupDownPaymentPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('groupDownPaymentPercentage must be a number between 0 and 100'),
    body('groupInstallments')
      .optional()
      .isInt({ min: 1 })
      .withMessage('groupInstallments must be a positive integer'),
    body('propertyPurchases.*.propertyId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Each purchase propertyId must be a valid integer'),
    body('propertyPurchases.*.finalDownPaymentPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('finalDownPaymentPercentage must be a number between 0 and 100'),
    body('propertyPurchases.*.finalPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('finalPrice must be a positive number'),
    body('propertyPurchases.*.finalInstallments')
      .optional()
      .isInt({ min: 1 })
      .withMessage('finalInstallments must be a positive integer'),
    body('contractDate')
      .optional()
      .isISO8601()
      .withMessage('Valid contract date required'),
    body('assignedSellerId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Valid seller ID required'),
    body('contractSigned')
      .optional()
      .isBoolean()
      .withMessage('Contract signed must be boolean')
  ],
  clientController.createClient
);

// Register client with user (atomic transaction)
router.post('/register',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
    body('idNumber')
      .trim()
      .notEmpty()
      .withMessage('ID number is required'),
    body('birthday')
      .isISO8601()
      .withMessage('Valid birthday date is required'),
    body('phone')
      .optional()
      .trim(),
    body('propertyPurchases')
      .optional()
      .isArray()
      .withMessage('propertyPurchases must be an array'),
    body('purchaseMode')
      .optional()
      .isIn(['individual', 'unified'])
      .withMessage('purchaseMode must be individual or unified'),
    body('groupDownPaymentPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('groupDownPaymentPercentage must be a number between 0 and 100'),
    body('groupInstallments')
      .optional()
      .isInt({ min: 1 })
      .withMessage('groupInstallments must be a positive integer'),
    body('propertyPurchases.*.propertyId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Each purchase propertyId must be a valid integer'),
    body('propertyPurchases.*.finalDownPaymentPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('finalDownPaymentPercentage must be a number between 0 and 100'),
    body('propertyPurchases.*.finalPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('finalPrice must be a positive number'),
    body('propertyPurchases.*.finalInstallments')
      .optional()
      .isInt({ min: 1 })
      .withMessage('finalInstallments must be a positive integer'),
    body('assignedSellerId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Valid seller ID required'),
    body('contractDate')
      .optional()
      .isISO8601()
      .withMessage('Valid contract date required'),
    body('contractSigned')
      .optional()
      .isBoolean()
      .withMessage('Contract signed must be boolean')
  ],
  clientController.registerClientWithUser
);

// Update client
router.put('/:clientId',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  clientIdValidation,
  [
    body('contractSigned')
      .optional()
      .isBoolean()
      .withMessage('Contract signed must be boolean'),
    body('contractDate')
      .optional()
      .isISO8601()
      .withMessage('Valid contract date required')
  ],
  clientController.updateClient
);

// Delete client (System Admin only)
router.delete('/:clientId',
  authenticateToken,
  //authorizeRoles('system_admin'),
  clientIdValidation,
  clientController.deleteClient
);

// Get client statistics
router.get('/statistics/overview',
  authenticateToken,
  //authorizeRoles('system_admin', 'real_estate_admin'),
  clientController.getClientStatistics
);

// Get all property purchases for a client
router.get('/:clientId/properties',
  authenticateToken,
  clientIdValidation,
  clientController.getClientProperties
);

// Add a new property purchase to an existing client
router.post('/:clientId/properties',
  authenticateToken,
  clientIdValidation,
  [
    body('propertyId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Valid property ID is required'),
    body('finalDownPaymentPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('finalDownPaymentPercentage must be a number between 0 and 100'),
    body('finalPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('finalPrice must be a positive number'),
    body('finalInstallments')
      .optional()
      .isInt({ min: 1 })
      .withMessage('finalInstallments must be a positive integer'),
    body('propertyPurchases')
      .optional()
      .isArray()
      .withMessage('propertyPurchases must be an array'),
    body('propertyPurchases.*.propertyId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Each purchase propertyId must be a valid integer'),
    body('propertyPurchases.*.finalDownPaymentPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('finalDownPaymentPercentage must be a number between 0 and 100'),
    body('propertyPurchases.*.finalPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('finalPrice must be a positive number'),
    body('propertyPurchases.*.finalInstallments')
      .optional()
      .isInt({ min: 1 })
      .withMessage('finalInstallments must be a positive integer'),
    body('purchaseMode')
      .optional()
      .isIn(['individual', 'unified'])
      .withMessage('purchaseMode must be individual or unified'),
    body('groupDownPaymentPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('groupDownPaymentPercentage must be a number between 0 and 100'),
    body('groupInstallments')
      .optional()
      .isInt({ min: 1 })
      .withMessage('groupInstallments must be a positive integer'),
    body('sellerId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Valid seller ID required'),
    body('notes')
      .optional()
      .trim()
  ],
  clientController.addPropertyToClient
);

module.exports = router;
