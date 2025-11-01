const phaseTypeService = require('../services/phaseTypeService');

class PhaseTypeController {
  // Get all phase types
  async getAllPhaseTypes(req, res) {
    try {
      const phaseTypes = await phaseTypeService.getAllPhaseTypes();
      res.json({
        success: true,
        data: phaseTypes
      });
    } catch (error) {
      console.error('Error getting phase types:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving phase types',
        error: error.message
      });
    }
  }

  // Get phase type by ID
  async getPhaseTypeById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid phase type ID is required'
        });
      }

      const phaseType = await phaseTypeService.getPhaseTypeById(Number.parseInt(id, 10));
      
      res.json({
        success: true,
        data: phaseType
      });
    } catch (error) {
      console.error('Error getting phase type:', error);
      if (error.message === 'Phase type not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving phase type',
        error: error.message
      });
    }
  }

  // Create new phase type (admin only)
  async createPhaseType(req, res) {
    try {
      const { name, description, isActive } = req.body;
      const createdBy = req.user.id;

      // Validation
      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Phase type name is required'
        });
      }

      if (name.trim().length < 2 || name.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Phase type name must be between 2 and 50 characters'
        });
      }

      const phaseTypeData = {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== false // Default to true
      };

      const newPhaseType = await phaseTypeService.createPhaseType(phaseTypeData, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Phase type created successfully',
        data: newPhaseType
      });
    } catch (error) {
      console.error('Error creating phase type:', error);
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating phase type',
        error: error.message
      });
    }
  }

  // Update phase type (admin only)
  async updatePhaseType(req, res) {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid phase type ID is required'
        });
      }

      // Validation
      if (name !== undefined) {
        if (!name?.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Phase type name cannot be empty'
          });
        }

        if (name.trim().length < 2 || name.trim().length > 50) {
          return res.status(400).json({
            success: false,
            message: 'Phase type name must be between 2 and 50 characters'
          });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedPhaseType = await phaseTypeService.updatePhaseType(Number.parseInt(id, 10), updateData);
      
      res.json({
        success: true,
        message: 'Phase type updated successfully',
        data: updatedPhaseType
      });
    } catch (error) {
      console.error('Error updating phase type:', error);
      if (error.message === 'Phase type not found') {
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
      
      res.status(500).json({
        success: false,
        message: 'Error updating phase type',
        error: error.message
      });
    }
  }

  // Delete phase type (admin only)
  async deletePhaseType(req, res) {
    try {
      const { id } = req.params;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid phase type ID is required'
        });
      }

      const deletedPhaseType = await phaseTypeService.deletePhaseType(Number.parseInt(id, 10));
      
      res.json({
        success: true,
        message: 'Phase type deleted successfully',
        data: deletedPhaseType
      });
    } catch (error) {
      console.error('Error deleting phase type:', error);
      if (error.message === 'Phase type not found') {
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
        message: 'Error deleting phase type',
        error: error.message
      });
    }
  }

  // Get active phase types
  async getActivePhaseTypes(req, res) {
    try {
      const phaseTypes = await phaseTypeService.getActivePhaseTypes();
      res.json({
        success: true,
        data: phaseTypes
      });
    } catch (error) {
      console.error('Error getting active phase types:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving active phase types',
        error: error.message
      });
    }
  }
}

module.exports = new PhaseTypeController();