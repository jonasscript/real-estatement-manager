const authService = require('../services/authService');
const userService = require('../services/userService');
const microsoftService = require('../services/microsoftService');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const getAllowedFrontendOrigins = () => {
  const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(configuredOrigins);
};

const isAllowedFrontendOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') {
    return false;
  }

  if (getAllowedFrontendOrigins().has(origin)) {
    return true;
  }

  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

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

  getMicrosoftLoginUrl(req, res) {
    try {
      const requestedOrigin = req.query.frontendOrigin;
      const frontendOrigin = isAllowedFrontendOrigin(requestedOrigin)
        ? requestedOrigin
        : microsoftService.frontendUrl;

      const state = jwt.sign(
        {
          nonce: Math.random().toString(36).slice(2),
          type: 'microsoft_oauth',
          frontendOrigin,
        },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      res.json({
        message: 'Microsoft login URL generated',
        data: {
          authUrl: microsoftService.buildAuthorizationUrl(state),
        },
      });
    } catch (error) {
      console.error('Microsoft login URL error:', error);
      res.status(500).json({
        error: error.message || 'Failed to start Microsoft login',
      });
    }
  }

  async microsoftCallback(req, res) {
    const getFrontendOriginFromState = () => {
      try {
        const decoded = jwt.verify(req.query.state, process.env.JWT_SECRET);
        return isAllowedFrontendOrigin(decoded.frontendOrigin)
          ? decoded.frontendOrigin
          : microsoftService.frontendUrl;
      } catch (error) {
        return microsoftService.frontendUrl;
      }
    };

    const sendPopupResult = (payload) => {
      const frontendOrigin = getFrontendOriginFromState();
      const encodedPayload = Buffer
        .from(JSON.stringify(payload), 'utf8')
        .toString('base64');
      res.redirect(`${frontendOrigin}/auth/microsoft-callback#result=${encodeURIComponent(encodedPayload)}`);
    };

    try {
      const { code, state, error, error_description } = req.query;
      if (error) {
        return sendPopupResult({
          source: 'microsoft-login',
          success: false,
          code: 'MICROSOFT_AUTH_CANCELLED',
          message: error_description || 'Inicio de sesión con Microsoft cancelado',
        });
      }

      const decodedState = jwt.verify(state, process.env.JWT_SECRET);
      if (decodedState.type !== 'microsoft_oauth') {
        throw new Error('Invalid Microsoft login state');
      }
      const result = await microsoftService.loginWithCode(code);

      sendPopupResult({
        source: 'microsoft-login',
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Microsoft callback error:', error);
      sendPopupResult({
        source: 'microsoft-login',
        success: false,
        code: error.message === 'Microsoft account not registered'
          ? 'MICROSOFT_ACCOUNT_NOT_REGISTERED'
          : 'MICROSOFT_AUTH_FAILED',
        message: error.message === 'Microsoft account not registered'
          ? 'No existe una cuenta registrada con ese correo. El registro lo realiza la administración del sistema.'
          : error.message || 'No se pudo iniciar sesión con Microsoft',
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

  // Register initial system admin (no auth required, role hardcoded to system_admin)
  async registerAdmin(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { firstName, lastName, email, phone, password } = req.body;

      const newUser = await userService.createSystemAdmin({
        firstName,
        lastName,
        email,
        phone,
        password
      });

      res.status(201).json({
        message: 'Administrador registrado exitosamente',
        data: newUser
      });
    } catch (error) {
      console.error('Register admin error:', error);
      res.status(error.message === 'Email already exists' ? 409 : 500).json({
        error: error.message || 'Error al registrar el administrador'
      });
    }
  }
}

module.exports = new AuthController();
