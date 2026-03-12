const express = require('express');
const propertyTypeController = require('../controllers/propertyTypeController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is system admin
const isSystemAdmin = (req, res, next) => {
  if (req.user.role !== 'system_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. System admin privileges required.'
    });
  }
  next();
};

// Get all property types
router.get('/', authenticateToken, propertyTypeController.getAllPropertyTypes);

// Get active property types  
router.get('/active', authenticateToken, propertyTypeController.getActivePropertyTypes);

// Get property type by ID
router.get('/:id', authenticateToken, propertyTypeController.getPropertyTypeById);

// Create new property type (system admin only)
router.post('/', authenticateToken, isSystemAdmin, propertyTypeController.createPropertyType);

// Update property type (system admin only)
router.put('/:id', authenticateToken, isSystemAdmin, propertyTypeController.updatePropertyType);

// Delete property type (system admin only)
router.delete('/:id', authenticateToken, isSystemAdmin, propertyTypeController.deletePropertyType);

module.exports = router;