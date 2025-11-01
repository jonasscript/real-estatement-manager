const unitService = require('../services/unitService');

class UnitController {
  // Get all units
  async getAllUnits(req, res) {
    try {
      const { blockId } = req.query;
      const filters = {};
      
      if (blockId) filters.blockId = blockId;

      const units = await unitService.getAllUnits(filters);
      res.json({
        success: true,
        data: units
      });
    } catch (error) {
      console.error('Error getting units:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving units',
        error: error.message
      });
    }
  }

  // Get unit by ID
  async getUnitById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid unit ID is required'
        });
      }

      const unit = await unitService.getUnitById(Number.parseInt(id, 10));
      
      res.json({
        success: true,
        data: unit
      });
    } catch (error) {
      console.error('Error getting unit:', error);
      if (error.message === 'Unit not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving unit',
        error: error.message
      });
    }
  }

  // Create new unit
  async createUnit(req, res) {
    try {
      const {
        unitNumber,
        blockId,
        propertyModelId,
        propertyStatusId,
        description,
        isAvailable
      } = req.body;
      const createdBy = req.user.id;

      // Validation
      if (!blockId || Number.isNaN(Number(blockId))) {
        return res.status(400).json({
          success: false,
          message: 'Valid block ID is required'
        });
      }


      if (!unitNumber || !unitNumber.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Unit number is required'
        });
      }


      const unitData = {
        blockId: Number.parseInt(blockId, 10),
        identifier: unitNumber.trim(),
        unitNumber: unitNumber.trim(),
        areaNotes: description ? description.trim() : null,
        propertyStatusId: propertyStatusId ? Number(propertyStatusId) : 1,
        propertyModelId: propertyModelId ? Number(propertyModelId) : null,
        createdBy: createdBy
      };

      const newUnit = await unitService.createUnit(unitData);

      res.status(201).json({
        success: true,
        message: 'Unit created successfully',
        data: newUnit
      });
    } catch (error) {
      console.error('Error creating unit:', error);
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
        message: 'Error creating unit',
        error: error.message
      });
    }
  }

  // Update unit
  async updateUnit(req, res) {
    try {
      const { id } = req.params;
      const {
        unitNumber,
        blockId,
        propertyModelId,
        propertyStatusId,
        description,
        isAvailable
      } = req.body;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid unit ID is required'
        });
      }

      // Validation
      if (unitNumber !== undefined) {
        if (!unitNumber?.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Unit number cannot be empty'
          });
        }

        if (unitNumber.trim().length < 1 || unitNumber.trim().length > 20) {
          return res.status(400).json({
            success: false,
            message: 'Unit number must be between 1 and 20 characters'
          });
        }
      }


      const updateData = {};
      if (unitNumber !== undefined) updateData.unitNumber = unitNumber.trim();
      if (description !== undefined) updateData.areaNotes = description ? description.trim() : null;
      if (propertyStatusId !== undefined) updateData.propertyStatusId = propertyStatusId ? Number(propertyStatusId) : null;

      const updatedUnit = await unitService.updateUnit(Number.parseInt(id, 10), updateData);

      res.json({
        success: true,
        message: 'Unit updated successfully',
        data: updatedUnit
      });
    } catch (error) {
      console.error('Error updating unit:', error);
      if (error.message === 'Unit not found') {
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
        message: 'Error updating unit',
        error: error.message
      });
    }
  }

  // Delete unit
  async deleteUnit(req, res) {
    try {
      const { id } = req.params;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid unit ID is required'
        });
      }

      const deletedUnit = await unitService.deleteUnit(Number.parseInt(id, 10));
      
      res.json({
        success: true,
        message: 'Unit deleted successfully',
        data: deletedUnit
      });
    } catch (error) {
      console.error('Error deleting unit:', error);
      if (error.message === 'Unit not found') {
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
        message: 'Error deleting unit',
        error: error.message
      });
    }
  }

  // Get units by block
  async getUnitsByBlock(req, res) {
    try {
      const { blockId } = req.params;

      if (!blockId || Number.isNaN(Number(blockId))) {
        return res.status(400).json({
          success: false,
          message: 'Valid block ID is required'
        });
      }

      const units = await unitService.getUnitsByBlock(Number.parseInt(blockId, 10));
      res.json({
        success: true,
        data: units
      });
    } catch (error) {
      console.error('Error getting units by block:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving units',
        error: error.message
      });
    }
  }

  // Get available units
  async getAvailableUnits(req, res) {
    try {
      const { blockId } = req.query;
      const filters = { status: 'Disponible' };
      
      if (blockId) filters.blockId = blockId;

      const units = await unitService.getAllUnits(filters);
      res.json({
        success: true,
        data: units
      });
    } catch (error) {
      console.error('Error getting available units:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving available units',
        error: error.message
      });
    }
  }

  // Update unit status
  async updateUnitStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid unit ID is required'
        });
      }

      if (!status?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const validStatuses = ['Disponible', 'Reservado', 'Vendido', 'No Disponible'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
        });
      }

      const updatedUnit = await unitService.updateUnitStatus(Number.parseInt(id, 10), status);
      
      res.json({
        success: true,
        message: 'Unit status updated successfully',
        data: updatedUnit
      });
    } catch (error) {
      console.error('Error updating unit status:', error);
      if (error.message === 'Unit not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating unit status',
        error: error.message
      });
    }
  }
}

module.exports = new UnitController();