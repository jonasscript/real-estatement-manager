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
    body('propertyId')
      .isInt({ min: 1 })
      .withMessage('Valid property ID is required'),
    body('realEstateId')
      .isInt({ min: 1 })
      .withMessage('Valid real estate ID is required'),
    body('contractDate')
      .optional()
      .isISO8601()
      .withMessage('Valid contract date required')
  ],
  clientController.createClient
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

module.exports = router;