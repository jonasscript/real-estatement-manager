const realEstateService = require('../services/realEstateService');
const { validationResult } = require('express-validator');

class RealEstateController {
  // Get all real estates
  async getAllRealEstates(req, res) {
    try {
      const realEstates = await realEstateService.getAllRealEstates();

      res.json({
        message: 'Real estates retrieved successfully',
        data: realEstates,
        count: realEstates.length
      });
    } catch (error) {
      console.error('Get all real estates error:', error);
      res.status(500).json({
        error: 'Failed to retrieve real estates'
      });
    }
  }

  // Get real estate by ID
  async getRealEstateById(req, res) {
    try {
      const { realEstateId } = req.params;
      const realEstate = await realEstateService.getRealEstateById(realEstateId);

      res.json({
        message: 'Real estate retrieved successfully',
        data: realEstate
      });
    } catch (error) {
      console.error('Get real estate by ID error:', error);
      res.status(error.message === 'Real estate not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve real estate'
      });
    }
  }

  // Create new real estate
  async createRealEstate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const realEstateData = req.body;
      const createdBy = req.user.id;

      const newRealEstate = await realEstateService.createRealEstate(realEstateData, createdBy);

      res.status(201).json({
        message: 'Real estate created successfully',
        data: newRealEstate
      });
    } catch (error) {
      console.error('Create real estate error:', error);
      res.status(500).json({
        error: error.message || 'Failed to create real estate'
      });
    }
  }

  // Update real estate
  async updateRealEstate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { realEstateId } = req.params;
      const updateData = req.body;

      const updatedRealEstate = await realEstateService.updateRealEstate(realEstateId, updateData);

      res.json({
        message: 'Real estate updated successfully',
        data: updatedRealEstate
      });
    } catch (error) {
      console.error('Update real estate error:', error);
      res.status(error.message === 'Real estate not found' ? 404 : 500).json({
        error: error.message || 'Failed to update real estate'
      });
    }
  }

  // Delete real estate
  async deleteRealEstate(req, res) {
    try {
      const { realEstateId } = req.params;
      const deletedRealEstate = await realEstateService.deleteRealEstate(realEstateId);

      res.json({
        message: 'Real estate deleted successfully',
        data: deletedRealEstate
      });
    } catch (error) {
      console.error('Delete real estate error:', error);
      res.status(error.message.includes('Cannot delete') ? 409 : error.message === 'Real estate not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete real estate'
      });
    }
  }

  // Get real estate statistics
  async getRealEstateStatistics(req, res) {
    try {
      const { realEstateId } = req.params;
      const statistics = await realEstateService.getRealEstateStatistics(realEstateId);

      res.json({
        message: 'Real estate statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get real estate statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve real estate statistics'
      });
    }
  }

  // Get all real estates statistics
  async getAllRealEstatesStatistics(req, res) {
    try {
      const statistics = await realEstateService.getRealEstateStatistics();

      res.json({
        message: 'All real estates statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get all real estates statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve real estates statistics'
      });
    }
  }

  // Get real estates by admin
  async getRealEstatesByAdmin(req, res) {
    try {
      const adminId = req.user.role_name === 'real_estate_admin' ? req.user.id : req.params.adminId;
      const realEstates = await realEstateService.getRealEstatesByAdmin(adminId);

      res.json({
        message: 'Real estates retrieved successfully',
        data: realEstates,
        count: realEstates.length
      });
    } catch (error) {
      console.error('Get real estates by admin error:', error);
      res.status(500).json({
        error: 'Failed to retrieve real estates'
      });
    }
  }

  // Search real estates
  async searchRealEstates(req, res) {
    try {
      const { q: searchTerm } = req.query;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          error: 'Search term must be at least 2 characters long'
        });
      }

      const realEstates = await realEstateService.searchRealEstates(searchTerm.trim());

      res.json({
        message: 'Real estates search completed successfully',
        data: realEstates,
        count: realEstates.length,
        searchTerm
      });
    } catch (error) {
      console.error('Search real estates error:', error);
      res.status(500).json({
        error: 'Failed to search real estates'
      });
    }
  }
}

module.exports = new RealEstateController();