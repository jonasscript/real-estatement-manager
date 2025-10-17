const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { pool } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const realEstateRoutes = require('./routes/realEstates');
const sellerRoutes = require('./routes/sellers');
const roleRoutes = require('./routes/roles');
const menuRoutes = require('./routes/menu');
const propertyRoutes = require('./routes/properties');
const clientRoutes = require('./routes/clients');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const installmentRoutes = require('./routes/installments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/real-estates', realEstateRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.message
    });
  }

  // Handle database errors
  if (error.code && error.code.startsWith('23')) {
    return res.status(400).json({
      error: 'Database constraint violation',
      details: error.detail || error.message
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;