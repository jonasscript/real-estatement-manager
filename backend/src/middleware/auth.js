const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user details from database
    const userQuery = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.role_id, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.is_active = true
    `;
    const userResult = await query(userQuery, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check if user has required role
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role_name
      });
    }

    next();
  };
};

// Middleware to check if user is assigned to specific real estate (for real estate admins)
const checkRealEstateAccess = async (req, res, next) => {
  const userRole = req.user.role_name;

  if (userRole === 'system_admin') {
    // System admin has access to all real estates
    return next();
  }

  if (userRole === 'real_estate_admin') {
    // Check if the real estate admin is associated with the requested real estate
    const realEstateId = req.params.realEstateId || req.body.realEstateId || req.query.realEstateId;

    if (!realEstateId) {
      return next(); // No specific real estate requested
    }

    const accessQuery = `
      SELECT 1 FROM real_estates
      WHERE id = $1
    `;
    const accessResult = await query(accessQuery, [realEstateId]);

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this real estate' });
    }
  }

  next();
};

// Middleware to check if seller is assigned to client
const checkClientAssignment = async (req, res, next) => {
  const userRole = req.user.role_name;
  const clientId = req.params.clientId || req.body.clientId || req.query.clientId;

  if (userRole === 'system_admin' || userRole === 'real_estate_admin') {
    return next();
  }

  if (userRole === 'seller') {
    if (!clientId) {
      return next();
    }

    const assignmentQuery = `
      SELECT 1 FROM clients
      WHERE id = $1 AND assigned_seller_id = $2
    `;
    const assignmentResult = await query(assignmentQuery, [clientId, req.user.id]);

    if (assignmentResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: not assigned to this client' });
    }
  }

  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  checkRealEstateAccess,
  checkClientAssignment
};