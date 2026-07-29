const express = require('express');
const { body, param, query } = require('express-validator');
const realEstateController = require('../controllers/realEstateController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const validateSesSenderConfig = (senderEmail, { req }) => {
  const senderDomain = req.body.ses_sender_domain;

  if (!senderEmail && !senderDomain) {
    return true;
  }

  if (!senderEmail || !senderDomain) {
    throw new Error('SES sender email and domain must be configured together');
  }

  const emailDomain = String(senderEmail).split('@')[1]?.toLowerCase();
  const normalizedDomain = String(senderDomain).trim().replace(/^@/, '').toLowerCase();

  if (emailDomain !== normalizedDomain) {
    throw new Error('SES sender email must match the configured domain');
  }

  return true;
};

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
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('ses_sender_email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid SES sender email')
    .bail()
    .custom(validateSesSenderConfig),
  body('ses_sender_domain')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^@?([a-z0-9-]+\.)+[a-z]{2,}$/i)
    .withMessage('Please provide a valid SES sender domain'),
  body().custom((_, context) => validateSesSenderConfig(context.req.body.ses_sender_email, context))
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
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('ses_sender_email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid SES sender email')
    .bail()
    .custom(validateSesSenderConfig),
  body('ses_sender_domain')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^@?([a-z0-9-]+\.)+[a-z]{2,}$/i)
    .withMessage('Please provide a valid SES sender domain'),
  body().custom((_, context) => validateSesSenderConfig(context.req.body.ses_sender_email, context))
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
  authorizeRoles('system_admin'),
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
