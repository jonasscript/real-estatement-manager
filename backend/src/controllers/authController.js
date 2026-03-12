const authService = require('../services/authService');
const { validationResult } = require('express-validator');

class AuthController {
  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      const result = await authService.authenticateUser(email, password);

      res.json({
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        error: error.message || 'Authentication failed'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await authService.getUserById(req.user.id);

      res.json({
        message: 'Profile retrieved successfully',
        data: user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to retrieve profile'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { firstName, lastName, phone } = req.body;

      const updatedUser = await authService.updateUser(req.user.id, {
        firstName,
        lastName,
        phone,
        isActive: req.user.is_active // Keep current active status
      });

      res.json({
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: error.message || 'Failed to update profile'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(req.user.id, currentPassword, newPassword);

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({
        error: error.message || 'Failed to change password'
      });
    }
  }

  // Logout (client-side token removal)
  async logout(req, res) {
    // In a stateless JWT system, logout is handled client-side
    // by removing the token from storage
    res.json({
      message: 'Logged out successfully'
    });
  }

  // Verify token (middleware handles this, but can be used for token validation)
  async verifyToken(req, res) {
    // If we reach here, the token is valid (checked by middleware)
    res.json({
      message: 'Token is valid',
      data: {
        user: req.user
      }
    });
  }
}

module.exports = new AuthController();