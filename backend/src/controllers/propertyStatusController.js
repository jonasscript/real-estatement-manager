const propertyStatusService = require('../services/propertyStatusService');

class PropertyStatusController {
  // Get all property statuses
  async getAllPropertyStatuses(req, res) {
    try {
      const statuses = await propertyStatusService.getAllPropertyStatus();
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error('Error getting property statuses:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving property statuses',
        error: error.message
      });
    }
  }

  // Get property status by ID
  async getPropertyStatusById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid property status ID is required'
        });
      }

      const status = await propertyStatusService.getPropertyStatusById(Number.parseInt(id, 10));
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting property status:', error);
      if (error.message === 'Property status not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving property status',
        error: error.message
      });
    }
  }

  // Create new property status (admin only)
  async createPropertyStatus(req, res) {
    try {
      const { name, description, color, isActive } = req.body;
      const createdBy = req.user.id;

      // Validation
      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Property status name is required'
        });
      }

      if (name.trim().length < 2 || name.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Property status name must be between 2 and 50 characters'
        });
      }

      const statusData = {
        name: name.trim(),
        description: description?.trim() || null,
        color: color?.trim() || null,
        isActive: isActive !== false // Default to true
      };

      const newStatus = await propertyStatusService.createPropertyStatus(statusData, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Property status created successfully',
        data: newStatus
      });
    } catch (error) {
      console.error('Error creating property status:', error);
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating property status',
        error: error.message
      });
    }
  }

  // Update property status (admin only)
  async updatePropertyStatus(req, res) {
    try {
      const { id } = req.params;
      const { name, description, color, isActive } = req.body;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid property status ID is required'
        });
      }

      // Validation
      if (name !== undefined) {
        if (!name?.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Property status name cannot be empty'
          });
        }

        if (name.trim().length < 2 || name.trim().length > 50) {
          return res.status(400).json({
            success: false,
            message: 'Property status name must be between 2 and 50 characters'
          });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (color !== undefined) updateData.color = color?.trim() || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedStatus = await propertyStatusService.updatePropertyStatus(Number.parseInt(id, 10), updateData);
      
      res.json({
        success: true,
        message: 'Property status updated successfully',
        data: updatedStatus
      });
    } catch (error) {
      console.error('Error updating property status:', error);
      if (error.message === 'Property status not found') {
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
        message: 'Error updating property status',
        error: error.message
      });
    }
  }

  // Delete property status (admin only)
  async deletePropertyStatus(req, res) {
    try {
      const { id } = req.params;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid property status ID is required'
        });
      }

      const deletedStatus = await propertyStatusService.deletePropertyStatus(Number.parseInt(id, 10));
      
      res.json({
        success: true,
        message: 'Property status deleted successfully',
        data: deletedStatus
      });
    } catch (error) {
      console.error('Error deleting property status:', error);
      if (error.message === 'Property status not found') {
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
        message: 'Error deleting property status',
        error: error.message
      });
    }
  }

  // Get active property statuses
  async getActivePropertyStatuses(req, res) {
    try {
      const statuses = await propertyStatusService.getActivePropertyStatuses();
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error('Error getting active property statuses:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving active property statuses',
        error: error.message
      });
    }
  }
}

module.exports = new PropertyStatusController();