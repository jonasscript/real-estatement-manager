const express = require('express');
const router = express.Router();
const blockController = require('../controllers/blockController');
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

// Get all blocks
router.get('/', authenticateToken, blockController.getAllBlocks);

// Get blocks by phase
router.get('/phase/:phaseId', authenticateToken, blockController.getBlocksByPhase);

// Get block statistics
router.get('/:id/statistics', authenticateToken, blockController.getBlockStatistics);

// Get block by ID
router.get('/:id', authenticateToken, blockController.getBlockById);

// Create new block (admin only)
router.post('/', authenticateToken, isAdmin, blockController.createBlock);

// Update block (admin only)
router.put('/:id', authenticateToken, isAdmin, blockController.updateBlock);

// Delete block (admin only)
router.delete('/:id', authenticateToken, isAdmin, blockController.deleteBlock);

module.exports = router;