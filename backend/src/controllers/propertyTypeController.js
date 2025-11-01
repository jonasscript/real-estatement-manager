const propertyTypeService = require('../services/propertyTypeService');
const { validationResult } = require('express-validator');

class PropertyTypeController {
  // Get all property types
  async getAllPropertyTypes(req, res) {
    try {
      const propertyTypes = await propertyTypeService.getAllPropertyTypes();

      res.json({
        message: 'Property types retrieved successfully',
        data: propertyTypes,
        count: propertyTypes.length
      });
    } catch (error) {
      console.error('Get all property types error:', error);
      res.status(500).json({
        error: 'Failed to retrieve property types'
      });
    }
  }

  // Get property type by ID
  async getPropertyTypeById(req, res) {
    try {
      const { id } = req.params;
      const propertyType = await propertyTypeService.getPropertyTypeById(id);

      res.json({
        message: 'Property type retrieved successfully',
        data: propertyType
      });
    } catch (error) {
      console.error('Get property type by ID error:', error);
      res.status(error.message === 'Property type not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve property type'
      });
    }
  }

  // Create new property type (Admin only)
  async createPropertyType(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const propertyType = await propertyTypeService.createPropertyType(req.body);

      res.status(201).json({
        message: 'Property type created successfully',
        data: propertyType
      });
    } catch (error) {
      console.error('Create property type error:', error);
      res.status(error.message === 'Property type name already exists' ? 409 : 500).json({
        error: error.message || 'Failed to create property type'
      });
    }
  }

  // Update property type (Admin only)
  async updatePropertyType(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const propertyType = await propertyTypeService.updatePropertyType(id, req.body);

      res.json({
        message: 'Property type updated successfully',
        data: propertyType
      });
    } catch (error) {
      console.error('Update property type error:', error);
      const statusCode = error.message === 'Property type not found' ? 404 :
                        error.message === 'Property type name already exists' ? 409 : 500;
      res.status(statusCode).json({
        error: error.message || 'Failed to update property type'
      });
    }
  }

  // Delete property type (Admin only)
  async deletePropertyType(req, res) {
    try {
      const { id } = req.params;
      const propertyType = await propertyTypeService.deletePropertyType(id);

      res.json({
        message: 'Property type deleted successfully',
        data: propertyType
      });
    } catch (error) {
      console.error('Delete property type error:', error);
      res.status(error.message === 'Property type not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete property type'
      });
    }
  }

  // Get active property types
  async getActivePropertyTypes(req, res) {
    try {
      const propertyTypes = await propertyTypeService.getActivePropertyTypes();

      res.json({
        message: 'Active property types retrieved successfully',
        data: propertyTypes,
        count: propertyTypes.length
      });
    } catch (error) {
      console.error('Get active property types error:', error);
      res.status(500).json({
        error: 'Failed to retrieve active property types'
      });
    }
  }
}

module.exports = new PropertyTypeController();