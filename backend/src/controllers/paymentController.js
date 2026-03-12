const paymentService = require('../services/paymentService');
const { validationResult } = require('express-validator');

class PaymentController {
  // Get client's payments
  async getClientPayments(req, res) {
    try {
      const clientId = req.client?.id || req.params.clientId;
      const filters = {
        status: req.query.status,
        installmentId: req.query.installmentId
      };

      const payments = await paymentService.getClientPayments(clientId, filters);

      res.json({
        message: 'Payments retrieved successfully',
        data: payments,
        count: payments.length
      });
    } catch (error) {
      console.error('Get client payments error:', error);
      res.status(500).json({
        error: error.message || 'Failed to retrieve payments'
      });
    }
  }

  // Create new payment with proof upload
  async createPayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const paymentData = {
        installmentId: req.body.installmentId,
        clientId: req.client?.id || req.body.clientId,
        amount: req.body.amount,
        paymentMethod: req.body.paymentMethod,
        referenceNumber: req.body.referenceNumber,
        notes: req.body.notes
      };

      const payment = await paymentService.createPayment(paymentData, req.file);

      res.status(201).json({
        message: 'Payment proof uploaded successfully',
        data: payment
      });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(error.message.includes('Invalid') ? 400 : 500).json({
        error: error.message || 'Failed to create payment'
      });
    }
  }

  // Get payment by ID
  async getPaymentById(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await paymentService.getPaymentById(paymentId);

      res.json({
        message: 'Payment retrieved successfully',
        data: payment
      });
    } catch (error) {
      console.error('Get payment by ID error:', error);
      res.status(error.message === 'Payment not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve payment'
      });
    }
  }

  // Approve or reject payment
  async approvePayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { paymentId } = req.params;
      const { status, notes } = req.body;
      const approvedBy = req.user.id;

      const updatedPayment = await paymentService.approvePayment(paymentId, approvedBy, status, notes);

      res.json({
        message: `Payment ${status} successfully`,
        data: updatedPayment
      });
    } catch (error) {
      console.error('Approve payment error:', error);
      res.status(error.message === 'Payment not found' ? 404 : 500).json({
        error: error.message || 'Failed to approve payment'
      });
    }
  }

  // Get pending payments for approval
  async getPendingPayments(req, res) {
    try {
      const filters = {
        realEstateId: req.query.realEstateId,
        sellerId: req.query.sellerId
      };

      const payments = await paymentService.getPendingPayments(filters);

      res.json({
        message: 'Pending payments retrieved successfully',
        data: payments,
        count: payments.length
      });
    } catch (error) {
      console.error('Get pending payments error:', error);
      res.status(500).json({
        error: 'Failed to retrieve pending payments'
      });
    }
  }

  // Delete payment proof
  async deletePaymentProof(req, res) {
    try {
      const { paymentId } = req.params;
      const result = await paymentService.deletePaymentProof(paymentId);

      res.json({
        message: result.message
      });
    } catch (error) {
      console.error('Delete payment proof error:', error);
      res.status(error.message === 'Payment not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete payment proof'
      });
    }
  }

  // Get payment statistics
  async getPaymentStatistics(req, res) {
    try {
      const filters = {
        clientId: req.query.clientId
      };

      const statistics = await paymentService.getPaymentStatistics(filters);

      res.json({
        message: 'Payment statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get payment statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve payment statistics'
      });
    }
  }

  // Download payment proof file
  async downloadPaymentProof(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await paymentService.getPaymentById(paymentId);

      if (!payment.proof_file_path) {
        return res.status(404).json({
          error: 'Payment proof not found'
        });
      }

      // Check if file exists
      const fs = require('fs');
      if (!fs.existsSync(payment.proof_file_path)) {
        return res.status(404).json({
          error: 'Payment proof file not found on server'
        });
      }

      // Send file
      res.download(payment.proof_file_path, (err) => {
        if (err) {
          console.error('File download error:', err);
          res.status(500).json({
            error: 'Failed to download file'
          });
        }
      });
    } catch (error) {
      console.error('Download payment proof error:', error);
      res.status(500).json({
        error: error.message || 'Failed to download payment proof'
      });
    }
  }
}

module.exports = new PaymentController();