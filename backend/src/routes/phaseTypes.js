const express = require('express');
const router = express.Router();
const phaseTypeController = require('../controllers/phaseTypeController');
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

// Get all phase types
router.get('/', authenticateToken, phaseTypeController.getAllPhaseTypes);

// Get active phase types
router.get('/active', authenticateToken, phaseTypeController.getActivePhaseTypes);

// Get phase type by ID
router.get('/:id', authenticateToken, phaseTypeController.getPhaseTypeById);

// Create new phase type (system admin only)
router.post('/', authenticateToken, phaseTypeController.createPhaseType);

// Update phase type (system admin only)
router.put('/:id', authenticateToken, isSystemAdmin, phaseTypeController.updatePhaseType);

// Delete phase type (system admin only)
router.delete('/:id', authenticateToken, isSystemAdmin, phaseTypeController.deletePhaseType);

module.exports = router;