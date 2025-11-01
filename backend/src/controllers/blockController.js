const blockService = require('../services/blockService');

class BlockController {
  // Get all blocks
  async getAllBlocks(req, res) {
    try {
      const { phaseId } = req.query;
      const filters = {};
      
      if (phaseId) filters.phaseId = phaseId;

      const blocks = await blockService.getAllBlocks(filters);
      res.json({
        success: true,
        data: blocks
      });
    } catch (error) {
      console.error('Error getting blocks:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving blocks',
        error: error.message
      });
    }
  }

  // Get block by ID
  async getBlockById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid block ID is required'
        });
      }

      const block = await blockService.getBlockById(Number.parseInt(id, 10));
      
      res.json({
        success: true,
        data: block
      });
    } catch (error) {
      console.error('Error getting block:', error);
      if (error.message === 'Block not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error retrieving block',
        error: error.message
      });
    }
  }

  // Create new block
  async createBlock(req, res) {
    try {
      const {
        phaseId,
        name,
        description,
        isActive,
        totalUnits,
        availableUnits,
        coordinatesX,
        coordinatesY
      } = req.body;
      const createdBy = req.user.id;

      // Validation
      if (!phaseId || Number.isNaN(Number(phaseId))) {
        return res.status(400).json({
          success: false,
          message: 'Valid phase ID is required'
        });
      }

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Block name is required'
        });
      }

      if (name.trim().length < 1 || name.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Block name must be between 1 and 50 characters'
        });
      }

      // Parse numeric fields and apply sensible defaults
      const parsedTotalUnits = totalUnits !== undefined && totalUnits !== null
        ? Number.parseInt(totalUnits, 10)
        : 0;
      const parsedAvailableUnits = availableUnits !== undefined && availableUnits !== null
        ? Number.parseInt(availableUnits, 10)
        : parsedTotalUnits;

      if (Number.isNaN(parsedTotalUnits) || parsedTotalUnits < 0) {
        return res.status(400).json({ success: false, message: 'totalUnits must be a non-negative integer' });
      }

      if (Number.isNaN(parsedAvailableUnits) || parsedAvailableUnits < 0) {
        return res.status(400).json({ success: false, message: 'availableUnits must be a non-negative integer' });
      }

      if (parsedAvailableUnits > parsedTotalUnits) {
        return res.status(400).json({ success: false, message: 'availableUnits cannot be greater than totalUnits' });
      }

      const blockData = {
        phaseId: Number.parseInt(phaseId, 10),
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== false, // Default to true
        totalUnits: parsedTotalUnits,
        availableUnits: parsedAvailableUnits,
        coordinatesX: coordinatesX !== undefined ? coordinatesX : null,
        coordinatesY: coordinatesY !== undefined ? coordinatesY : null
      };

      const newBlock = await blockService.createBlock(blockData, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Block created successfully',
        data: newBlock
      });
    } catch (error) {
      console.error('Error creating block:', error);
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
        message: 'Error creating block',
        error: error.message
      });
    }
  }

  // Update block
  async updateBlock(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        isActive,
        totalUnits,
        availableUnits,
        coordinatesX,
        coordinatesY
      } = req.body;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid block ID is required'
        });
      }

      // Validation
      if (name !== undefined) {
        if (!name?.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Block name cannot be empty'
          });
        }

        if (name.trim().length < 1 || name.trim().length > 50) {
          return res.status(400).json({
            success: false,
            message: 'Block name must be between 1 and 50 characters'
          });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      if (totalUnits !== undefined) {
        const parsedTotalUnits = Number.parseInt(totalUnits, 10);
        if (Number.isNaN(parsedTotalUnits) || parsedTotalUnits < 0) {
          return res.status(400).json({ success: false, message: 'totalUnits must be a non-negative integer' });
        }
        updateData.totalUnits = parsedTotalUnits;
      }

      if (availableUnits !== undefined) {
        const parsedAvailableUnits = Number.parseInt(availableUnits, 10);
        if (Number.isNaN(parsedAvailableUnits) || parsedAvailableUnits < 0) {
          return res.status(400).json({ success: false, message: 'availableUnits must be a non-negative integer' });
        }
        updateData.availableUnits = parsedAvailableUnits;
      }

      if (coordinatesX !== undefined) updateData.coordinatesX = coordinatesX;
      if (coordinatesY !== undefined) updateData.coordinatesY = coordinatesY;

      // If both totals provided, ensure availableUnits <= totalUnits
      if (updateData.totalUnits !== undefined && updateData.availableUnits !== undefined) {
        if (updateData.availableUnits > updateData.totalUnits) {
          return res.status(400).json({ success: false, message: 'availableUnits cannot be greater than totalUnits' });
        }
      }

      const updatedBlock = await blockService.updateBlock(Number.parseInt(id, 10), updateData);
      
      res.json({
        success: true,
        message: 'Block updated successfully',
        data: updatedBlock
      });
    } catch (error) {
      console.error('Error updating block:', error);
      if (error.message === 'Block not found') {
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
        message: 'Error updating block',
        error: error.message
      });
    }
  }

  // Delete block
  async deleteBlock(req, res) {
    try {
      const { id } = req.params;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid block ID is required'
        });
      }

      const deletedBlock = await blockService.deleteBlock(Number.parseInt(id, 10));
      
      res.json({
        success: true,
        message: 'Block deleted successfully',
        data: deletedBlock
      });
    } catch (error) {
      console.error('Error deleting block:', error);
      if (error.message === 'Block not found') {
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
        message: 'Error deleting block',
        error: error.message
      });
    }
  }

  // Get blocks by phase
  async getBlocksByPhase(req, res) {
    try {
      const { phaseId } = req.params;

      if (!phaseId || Number.isNaN(Number(phaseId))) {
        return res.status(400).json({
          success: false,
          message: 'Valid phase ID is required'
        });
      }

      const blocks = await blockService.getBlocksByPhase(Number.parseInt(phaseId, 10));
      res.json({
        success: true,
        data: blocks
      });
    } catch (error) {
      console.error('Error getting blocks by phase:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving blocks',
        error: error.message
      });
    }
  }

  // Get block statistics
  async getBlockStatistics(req, res) {
    try {
      const { id } = req.params;

      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'Valid block ID is required'
        });
      }

      const stats = await blockService.getBlockStatistics(Number.parseInt(id, 10));
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting block statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving block statistics',
        error: error.message
      });
    }
  }
}

module.exports = new BlockController();