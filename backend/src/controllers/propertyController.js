const propertyService = require('../services/propertyService');
const { validationResult } = require('express-validator');

class PropertyController {
  // Get all properties
  async getAllProperties(req, res) {
    try {
      const filters = {
        realEstateId: req.query.realEstateId,
        propertyType: req.query.propertyType,
        status: req.query.status,
        search: req.query.search
      };

      const properties = await propertyService.getAllProperties(filters);

      res.json({
        message: 'Properties retrieved successfully',
        data: properties,
        count: properties.length
      });
    } catch (error) {
      console.error('Get all properties error:', error);
      res.status(500).json({
        error: 'Failed to retrieve properties'
      });
    }
  }

  // Get property by ID
  async getPropertyById(req, res) {
    try {
      const { propertyId } = req.params;
      const property = await propertyService.getPropertyById(propertyId);

      res.json({
        message: 'Property retrieved successfully',
        data: property
      });
    } catch (error) {
      console.error('Get property by ID error:', error);
      res.status(error.message === 'Property not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve property'
      });
    }
  }

  // Create new property
  async createProperty(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const propertyData = req.body;
      const createdBy = req.user.id;

      const newProperty = await propertyService.createProperty(propertyData, createdBy);

      res.status(201).json({
        message: 'Property created successfully',
        data: newProperty
      });
    } catch (error) {
      console.error('Create property error:', error);
      res.status(500).json({
        error: error.message || 'Failed to create property'
      });
    }
  }

  // Update property
  async updateProperty(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { propertyId } = req.params;
      const updateData = req.body;

      const updatedProperty = await propertyService.updateProperty(propertyId, updateData);

      res.json({
        message: 'Property updated successfully',
        data: updatedProperty
      });
    } catch (error) {
      console.error('Update property error:', error);
      res.status(error.message === 'Property not found' ? 404 : 500).json({
        error: error.message || 'Failed to update property'
      });
    }
  }

  // Delete property
  async deleteProperty(req, res) {
    try {
      const { propertyId } = req.params;
      const deletedProperty = await propertyService.deleteProperty(propertyId);

      res.json({
        message: 'Property deleted successfully',
        data: deletedProperty
      });
    } catch (error) {
      console.error('Delete property error:', error);
      res.status(error.message.includes('Cannot delete') ? 409 : error.message === 'Property not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete property'
      });
    }
  }

  // Get properties by real estate
  async getPropertiesByRealEstate(req, res) {
    try {
      const { realEstateId } = req.params;
      const properties = await propertyService.getPropertiesByRealEstate(realEstateId);

      res.json({
        message: 'Properties retrieved successfully',
        data: properties,
        count: properties.length
      });
    } catch (error) {
      console.error('Get properties by real estate error:', error);
      res.status(500).json({
        error: 'Failed to retrieve properties'
      });
    }
  }

  // Get available properties
  async getAvailableProperties(req, res) {
    try {
      const properties = await propertyService.getAvailableProperties();

      res.json({
        message: 'Available properties retrieved successfully',
        data: properties,
        count: properties.length
      });
    } catch (error) {
      console.error('Get available properties error:', error);
      res.status(500).json({
        error: 'Failed to retrieve available properties'
      });
    }
  }

  // Search properties
  async searchProperties(req, res) {
    try {
      const { q: searchTerm } = req.query;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          error: 'Search term must be at least 2 characters long'
        });
      }

      const properties = await propertyService.searchProperties(searchTerm.trim());

      res.json({
        message: 'Properties search completed successfully',
        data: properties,
        count: properties.length,
        searchTerm
      });
    } catch (error) {
      console.error('Search properties error:', error);
      res.status(500).json({
        error: 'Failed to search properties'
      });
    }
  }

  // Get property statistics
  async getPropertyStatistics(req, res) {
    try {
      const { realEstateId } = req.params;
      const statistics = await propertyService.getPropertyStatistics(realEstateId);

      res.json({
        message: 'Property statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get property statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve property statistics'
      });
    }
  }

  // Get all properties statistics
  async getAllPropertiesStatistics(req, res) {
    try {
      const statistics = await propertyService.getPropertyStatistics();

      res.json({
        message: 'All properties statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get all properties statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve properties statistics'
      });
    }
  }
}

module.exports = new PropertyController();