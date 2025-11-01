const express = require('express');
const phaseController = require('../controllers/phaseController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user has admin privileges
const isAdmin = (req, res, next) => {
  const allowedRoles = ['system_admin', 'real_estate_admin'];
  console.log('User role:', req.user);
  if (!allowedRoles.includes(req.user.role_name)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Get all phases
router.get('/', authenticateToken, phaseController.getAllPhases);

// Get phases by real estate
router.get('/real-estate/:realEstateId', authenticateToken, phaseController.getPhasesByRealEstate);

// Get phase summary
router.get('/:id/summary', authenticateToken, phaseController.getPhaseSummary);

// Get phase by ID
router.get('/:id', authenticateToken, phaseController.getPhaseById);

// Create new phase (admin only)
router.post('/', authenticateToken, isAdmin, phaseController.createPhase);

// Create new phase using real estate ID from JWT (admin only)
router.post('/self-real-estate', authenticateToken, isAdmin, phaseController.createPhaseForSelfRealEstate);

// Update phase (admin only)
router.put('/:id', authenticateToken, isAdmin, phaseController.updatePhase);

// Delete phase (admin only)
router.delete('/:id', authenticateToken, isAdmin, phaseController.deletePhase);

module.exports = router;