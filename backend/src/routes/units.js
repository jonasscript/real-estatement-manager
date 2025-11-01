const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
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

// Get all units
router.get('/', authenticateToken, unitController.getAllUnits);

// Get available units
router.get('/available', authenticateToken, unitController.getAvailableUnits);

// Get units by block
router.get('/block/:blockId', authenticateToken, unitController.getUnitsByBlock);

// Get unit by ID
router.get('/:id', authenticateToken, unitController.getUnitById);

// Create new unit (admin only)
router.post('/', authenticateToken, isAdmin, unitController.createUnit);

// Update unit (admin only)
router.put('/:id', authenticateToken, isAdmin, unitController.updateUnit);

// Update unit status
router.patch('/:id/status', authenticateToken, isAdmin, unitController.updateUnitStatus);

// Delete unit (admin only)
router.delete('/:id', authenticateToken, isAdmin, unitController.deleteUnit);

module.exports = router;