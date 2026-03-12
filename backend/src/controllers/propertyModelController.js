const propertyModelService = require('../services/propertyModelService');

class PropertyModelController {
  // Get all property models
  async getAllPropertyModels(req, res) {
    try {
      const { realEstateId, propertyTypeId } = req.query;
      const filters = {};
      
      if (realEstateId) filters.realEstateId = realEstateId;
      if (propertyTypeId) filters.propertyTypeId = propertyTypeId;

      const models = await propertyModelService.getAllPropertyModels(filters);
      res.json({
        success: true,
        data: models
      });
    } catch (error) {
      console.error('Error getting property models:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving property models',
        error: error.message
      });
    }
  }

  // Get property model by ID
  async getPropertyModelById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid property model ID is required'
        });
      }

      const model = await propertyModelService.getPropertyModelById(Number.parseInt(id, 10));
      
      res.json({
        success: true,
        data: model
      });
    } catch (error) {
      console.error('Error getting property model:', error);
      if (error.message === 'Property model not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving property model',
        error: error.message
      });
    }
  }

  // Create new property model
  async createPropertyModel(req, res) {
    try {
      const {
        propertyTypeId,
        name,
        description,
        areaSqm,
        bedrooms,
        bathrooms,
        floorPlanUrl,
        features,
        isActive
      } = req.body;
      const createdBy = req.user.id;
      const realEstateId = req.user.realEstateId;

      if (!realEstateId) {
        return res.status(400).json({
          success: false,
          message: 'User does not have an assigned real estate'
        });
      }

      if (!propertyTypeId || Number.isNaN(Number(propertyTypeId))) {
        return res.status(400).json({
          success: false,
          message: 'Valid property type ID is required'
        });
      }

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Property model name is required'
        });
      }

      if (name.trim().length < 2 || name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Property model name must be between 2 and 100 characters'
        });
      }

      if (areaSqm && areaSqm <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Area must be greater than 0'
        });
      }

      if (bedrooms && bedrooms < 0) {
        return res.status(400).json({
          success: false,
          message: 'Bedrooms cannot be negative'
        });
      }

      if (bathrooms && bathrooms < 0) {
        return res.status(400).json({
          success: false,
          message: 'Bathrooms cannot be negative'
        });
      }

      const modelData = {
        realEstateId: realEstateId,
        propertyTypeId: Number.parseInt(propertyTypeId, 10),
        name: name.trim(),
        description: description?.trim() || null,
        areaSqm: areaSqm ? Number(areaSqm) : null,
        bedrooms: bedrooms ? Number.parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? Number.parseInt(bathrooms, 10) : null,
        floorPlanUrl: floorPlanUrl?.trim() || null,
        features: features || null,
        isActive: isActive !== false // Default to true
      };

      const newModel = await propertyModelService.createPropertyModel(modelData, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Property model created successfully',
        data: newModel
      });
    } catch (error) {
      console.error('Error creating property model:', error);
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes('Invalid')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating property model',
        error: error.message
      });
    }
  }

  // Update property model
  async updatePropertyModel(req, res) {
    try {
      const { id } = req.params;
      const {
        propertyTypeId,
        name,
        description,
        areaSqm,
        bedrooms,
        bathrooms,
        floorPlanUrl,
        features,
        isActive
      } = req.body;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid property model ID is required'
        });
      }

      // Validation
      if (propertyTypeId !== undefined && (Number.isNaN(Number(propertyTypeId)) || propertyTypeId <= 0)) {
        return res.status(400).json({
          success: false,
          message: 'Valid property type ID is required'
        });
      }

      if (name !== undefined) {
        if (!name?.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Property model name cannot be empty'
          });
        }

        if (name.trim().length < 2 || name.trim().length > 100) {
          return res.status(400).json({
            success: false,
            message: 'Property model name must be between 2 and 100 characters'
          });
        }
      }

      if (areaSqm !== undefined && areaSqm <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Area must be greater than 0'
        });
      }

      if (bedrooms !== undefined && bedrooms < 0) {
        return res.status(400).json({
          success: false,
          message: 'Bedrooms cannot be negative'
        });
      }

      if (bathrooms !== undefined && bathrooms < 0) {
        return res.status(400).json({
          success: false,
          message: 'Bathrooms cannot be negative'
        });
      }

      const updateData = {};
      if (propertyTypeId !== undefined) updateData.propertyTypeId = Number.parseInt(propertyTypeId, 10);
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (areaSqm !== undefined) updateData.areaSqm = areaSqm ? Number(areaSqm) : null;
      if (bedrooms !== undefined) updateData.bedrooms = bedrooms ? Number.parseInt(bedrooms, 10) : null;
      if (bathrooms !== undefined) updateData.bathrooms = bathrooms ? Number.parseInt(bathrooms, 10) : null;
      if (floorPlanUrl !== undefined) updateData.floorPlanUrl = floorPlanUrl?.trim() || null;
      if (features !== undefined) updateData.features = features;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedModel = await propertyModelService.updatePropertyModel(Number.parseInt(id, 10), updateData);
      
      res.json({
        success: true,
        message: 'Property model updated successfully',
        data: updatedModel
      });
    } catch (error) {
      console.error('Error updating property model:', error);
      if (error.message === 'Property model not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes('Invalid')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating property model',
        error: error.message
      });
    }
  }

  // Delete property model
  async deletePropertyModel(req, res) {
    try {
      const { id } = req.params;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid property model ID is required'
        });
      }

      const deletedModel = await propertyModelService.deletePropertyModel(Number.parseInt(id, 10));
      
      res.json({
        success: true,
        message: 'Property model deleted successfully',
        data: deletedModel
      });
    } catch (error) {
      console.error('Error deleting property model:', error);
      if (error.message === 'Property model not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes('Cannot delete')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting property model',
        error: error.message
      });
    }
  }

  // Get property models by real estate
  async getPropertyModelsByRealEstate(req, res) {
    try {
      const { realEstateId } = req.params;
      console.log('Getting property models for real estate ID:', realEstateId);
      if (!realEstateId || Number.isNaN(Number(realEstateId))) {
        return res.status(400).json({
          success: false,
          message: 'Valid real estate ID is required'
        });
      }

      const models = await propertyModelService.getPropertyModelsByRealEstate(Number.parseInt(realEstateId, 10));
      res.json({
        success: true,
        data: models
      });
    } catch (error) {
      console.error('Error getting property models by real estate:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving property models',
        error: error.message
      });
    }
  }

  // Get active property models
  async getActivePropertyModels(req, res) {
    try {
      const { realEstateId } = req.query;
      const filters = { isActive: true };
      
      if (realEstateId) filters.realEstateId = realEstateId;

      const models = await propertyModelService.getAllPropertyModels(filters);
      res.json({
        success: true,
        data: models
      });
    } catch (error) {
      console.error('Error getting active property models:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving active property models',
        error: error.message
      });
    }
  }
}

module.exports = new PropertyModelController();