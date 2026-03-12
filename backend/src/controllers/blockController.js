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

      const blockData = {
        phaseId: Number.parseInt(phaseId, 10),
        name: name.trim(),
        description: description?.trim() || null,
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
        phaseId,
        name,
        description,
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
      if (phaseId !== undefined) {
        if (Number.isNaN(Number(phaseId)) || Number(phaseId) <= 0) {
          return res.status(400).json({ success: false, message: 'phaseId must be a valid integer' });
        }
        updateData.phaseId = Number.parseInt(phaseId, 10);
      }
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;

      if (coordinatesX !== undefined) updateData.coordinatesX = coordinatesX;
      if (coordinatesY !== undefined) updateData.coordinatesY = coordinatesY;

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

      const stats = await blockService.getBlockSummary(Number.parseInt(id, 10));
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