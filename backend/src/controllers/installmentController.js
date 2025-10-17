const installmentService = require('../services/installmentService');
const { validationResult } = require('express-validator');

class InstallmentController {
  // Get all installments
  async getAllInstallments(req, res) {
    try {
      const filters = {
        clientId: req.query.clientId,
        status: req.query.status,
        realEstateId: req.query.realEstateId,
        dueDateFrom: req.query.dueDateFrom,
        dueDateTo: req.query.dueDateTo
      };

      const installments = await installmentService.getAllInstallments(filters);

      res.json({
        message: 'Installments retrieved successfully',
        data: installments,
        count: installments.length
      });
    } catch (error) {
      console.error('Get all installments error:', error);
      res.status(500).json({
        error: 'Failed to retrieve installments'
      });
    }
  }

  // Get installment by ID
  async getInstallmentById(req, res) {
    try {
      const { installmentId } = req.params;
      const installment = await installmentService.getInstallmentById(installmentId);

      res.json({
        message: 'Installment retrieved successfully',
        data: installment
      });
    } catch (error) {
      console.error('Get installment by ID error:', error);
      res.status(error.message === 'Installment not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve installment'
      });
    }
  }

  // Get installments by client
  async getInstallmentsByClient(req, res) {
    try {
      const { clientId } = req.params;
      const installments = await installmentService.getInstallmentsByClient(clientId);

      res.json({
        message: 'Client installments retrieved successfully',
        data: installments,
        count: installments.length
      });
    } catch (error) {
      console.error('Get installments by client error:', error);
      res.status(500).json({
        error: 'Failed to retrieve client installments'
      });
    }
  }

  // Get current user's installments
  async getMyInstallments(req, res) {
    try {
      const installments = await installmentService.getMyInstallments(req.user.id);

      res.json({
        message: 'Your installments retrieved successfully',
        data: installments,
        count: installments.length
      });
    } catch (error) {
      console.error('Get my installments error:', error);
      res.status(error.message === 'Client profile not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve installments'
      });
    }
  }

  // Update installment status
  async updateInstallmentStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { installmentId } = req.params;
      const { status } = req.body;

      const updatedInstallment = await installmentService.updateInstallmentStatus(installmentId, status);

      res.json({
        message: 'Installment status updated successfully',
        data: updatedInstallment
      });
    } catch (error) {
      console.error('Update installment status error:', error);
      res.status(error.message === 'Installment not found' ? 404 : 500).json({
        error: error.message || 'Failed to update installment status'
      });
    }
  }

  // Get overdue installments
  async getOverdueInstallments(req, res) {
    try {
      const { realEstateId } = req.params;
      const overdueInstallments = await installmentService.getOverdueInstallments(realEstateId);

      res.json({
        message: 'Overdue installments retrieved successfully',
        data: overdueInstallments,
        count: overdueInstallments.length
      });
    } catch (error) {
      console.error('Get overdue installments error:', error);
      res.status(500).json({
        error: 'Failed to retrieve overdue installments'
      });
    }
  }

  // Get upcoming installments
  async getUpcomingInstallments(req, res) {
    try {
      const { realEstateId } = req.params;
      const upcomingInstallments = await installmentService.getUpcomingInstallments(realEstateId);

      res.json({
        message: 'Upcoming installments retrieved successfully',
        data: upcomingInstallments,
        count: upcomingInstallments.length
      });
    } catch (error) {
      console.error('Get upcoming installments error:', error);
      res.status(500).json({
        error: 'Failed to retrieve upcoming installments'
      });
    }
  }

  // Get installment statistics
  async getInstallmentStatistics(req, res) {
    try {
      const filters = {
        realEstateId: req.query.realEstateId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };

      const statistics = await installmentService.getInstallmentStatistics(filters);

      res.json({
        message: 'Installment statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get installment statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve installment statistics'
      });
    }
  }

  // Get client installment summary
  async getClientInstallmentSummary(req, res) {
    try {
      const { clientId } = req.params;
      const summary = await installmentService.getClientInstallmentSummary(clientId);

      res.json({
        message: 'Client installment summary retrieved successfully',
        data: summary
      });
    } catch (error) {
      console.error('Get client installment summary error:', error);
      res.status(error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve installment summary'
      });
    }
  }

  // Get current user's installment summary
  async getMyInstallmentSummary(req, res) {
    try {
      // Get client ID for current user
      const { query } = require('../config/database');
      const clientQuery = 'SELECT id FROM clients WHERE user_id = $1';
      const clientResult = await query(clientQuery, [req.user.id]);

      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Client profile not found'
        });
      }

      const clientId = clientResult.rows[0].id;
      const summary = await installmentService.getClientInstallmentSummary(clientId);

      res.json({
        message: 'Your installment summary retrieved successfully',
        data: summary
      });
    } catch (error) {
      console.error('Get my installment summary error:', error);
      res.status(500).json({
        error: 'Failed to retrieve installment summary'
      });
    }
  }
}

module.exports = new InstallmentController();