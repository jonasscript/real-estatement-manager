const express = require('express');
const router = express.Router();
const propertyModelController = require('../controllers/propertyModelController');
const { authenticateToken } = require('../middleware/auth');

// Middleware to check if user has admin privileges
const isAdmin = (req, res, next) => {
  const allowedRoles = ['system_admin', 'real_estate_admin'];
  if (!allowedRoles.includes(req.user.role_name)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Get all property models
router.get('/', authenticateToken, propertyModelController.getAllPropertyModels);

// Get active property models
router.get('/active', authenticateToken, propertyModelController.getActivePropertyModels);

// Get property models by real estate
router.get('/real-estate/:realEstateId', authenticateToken, propertyModelController.getPropertyModelsByRealEstate);

// Get property model by ID
router.get('/:id', authenticateToken, propertyModelController.getPropertyModelById);

// Create new property model (admin only)
router.post('/', authenticateToken, isAdmin, propertyModelController.createPropertyModel);

// Update property model (admin only)
router.put('/:id', authenticateToken, isAdmin, propertyModelController.updatePropertyModel);

// Delete property model (admin only)
router.delete('/:id', authenticateToken, isAdmin, propertyModelController.deletePropertyModel);

module.exports = router;