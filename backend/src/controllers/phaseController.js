const phaseService = require('../services/phaseService');
const { validationResult } = require('express-validator');

class PhaseController {
  // Get all phases
  async getAllPhases(req, res) {
    try {
      const filters = {
        realEstateId: req.query.realEstateId,
        phaseTypeId: req.query.phaseTypeId,
        status: req.query.status,
        search: req.query.search
      };

      const phases = await phaseService.getAllPhases(filters);

      res.json({
        message: 'Phases retrieved successfully',
        data: phases,
        count: phases.length
      });
    } catch (error) {
      console.error('Get all phases error:', error);
      res.status(500).json({
        error: 'Failed to retrieve phases'
      });
    }
  }

  // Get phase by ID
  async getPhaseById(req, res) {
    try {
      const { id } = req.params;
      const phase = await phaseService.getPhaseById(id);

      res.json({
        message: 'Phase retrieved successfully',
        data: phase
      });
    } catch (error) {
      console.error('Get phase by ID error:', error);
      res.status(error.message === 'Phase not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve phase'
      });
    }
  }

  // Get phase summary
  async getPhaseSummary(req, res) {
    try {
      const { id } = req.params;
      const summary = await phaseService.getPhaseSummary(id);

      res.json({
        message: 'Phase summary retrieved successfully',
        data: summary
      });
    } catch (error) {
      console.error('Get phase summary error:', error);
      res.status(error.message === 'Phase not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve phase summary'
      });
    }
  }

  // Get phases by real estate
  async getPhasesByRealEstate(req, res) {
    try {
      const { realEstateId } = req.params;
      const phases = await phaseService.getPhasesByRealEstate(realEstateId);

      res.json({
        message: 'Phases retrieved successfully',
        data: phases,
        count: phases.length
      });
    } catch (error) {
      console.error('Get phases by real estate error:', error);
      res.status(500).json({
        error: 'Failed to retrieve phases'
      });
    }
  }

  // Create new phase
  async createPhase(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const phase = await phaseService.createPhase(req.body, req.user?.id);

      res.status(201).json({
        message: 'Phase created successfully',
        data: phase
      });
    } catch (error) {
      console.error('Create phase error:', error);
      res.status(error.message === 'Invalid real estate ID or phase type ID' ? 400 : 500).json({
        error: error.message || 'Failed to create phase'
      });
    }
  }

  // Create new phase using real estate ID from JWT
  async createPhaseForSelfRealEstate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }
      console.log('User info from JWT:', req.user);
      // Check if user has realEstateId in JWT
      if (!req.user?.realEstateId) {
        return res.status(400).json({
          error: 'User does not have an assigned real estate'
        });
      }

      // Add realEstateId from JWT to the phase data
      const phaseData = {
        ...req.body,
        realEstateId: req.user.realEstateId
      };

      const phase = await phaseService.createPhase(phaseData, req.user?.id);

      res.status(201).json({
        message: 'Phase created successfully',
        data: phase
      });
    } catch (error) {
      console.error('Create phase for self real estate error:', error);
      res.status(error.message === 'Invalid real estate ID or phase type ID' ? 400 : 500).json({
        error: error.message || 'Failed to create phase'
      });
    }
  }

  // Update phase
  async updatePhase(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const phase = await phaseService.updatePhase(id, req.body);

      res.json({
        message: 'Phase updated successfully',
        data: phase
      });
    } catch (error) {
      console.error('Update phase error:', error);
      const statusCode = error.message === 'Phase not found' ? 404 :
                        error.message === 'Invalid phase type ID' ? 400 : 500;
      res.status(statusCode).json({
        error: error.message || 'Failed to update phase'
      });
    }
  }

  // Delete phase
  async deletePhase(req, res) {
    try {
      const { id } = req.params;
      const phase = await phaseService.deletePhase(id);

      res.json({
        message: 'Phase deleted successfully',
        data: phase
      });
    } catch (error) {
      console.error('Delete phase error:', error);
      res.status(error.message === 'Phase not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete phase'
      });
    }
  }
}

module.exports = new PhaseController();