const express = require('express');
const router = express.Router();
const propertyStatusController = require('../controllers/propertyStatusController');
const { authenticateToken } = require('../middleware/auth');

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

// Get all property statuses
router.get('/', authenticateToken, propertyStatusController.getAllPropertyStatuses);

// Get active property statuses
router.get('/active', authenticateToken, propertyStatusController.getActivePropertyStatuses);

// Get property status by ID
router.get('/:id', authenticateToken, propertyStatusController.getPropertyStatusById);

// Create new property status (system admin only)
router.post('/', authenticateToken, isSystemAdmin, propertyStatusController.createPropertyStatus);

// Update property status (system admin only)
router.put('/:id', authenticateToken, isSystemAdmin, propertyStatusController.updatePropertyStatus);

// Delete property status (system admin only)
router.delete('/:id', authenticateToken, isSystemAdmin, propertyStatusController.deletePropertyStatus);

module.exports = router;