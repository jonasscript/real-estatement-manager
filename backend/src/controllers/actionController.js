const actionService = require('../services/actionService');

class ActionController {
  // Get all actions
  async getAllActions(req, res) {
    try {
      const actions = await actionService.getAllActions();
      res.json({
        message: 'Actions retrieved successfully',
        data: actions
      });
    } catch (error) {
      console.error('Get actions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve actions'
      });
    }
  }

  // Get action by ID
  async getActionById(req, res) {
    try {
      const { actionId } = req.params;
      const action = await actionService.getActionById(actionId);
      
      if (!action) {
        return res.status(404).json({
          error: 'Action not found'
        });
      }

      res.json({
        message: 'Action retrieved successfully',
        data: action
      });
    } catch (error) {
      console.error('Get action by ID error:', error);
      res.status(500).json({
        error: 'Failed to retrieve action'
      });
    }
  }

  // Create action
  async createAction(req, res) {
    try {
      const action = await actionService.createAction(req.body);
      res.status(201).json({
        message: 'Action created successfully',
        data: action
      });
    } catch (error) {
      console.error('Create action error:', error);
      if (error.message === 'Action with this name already exists') {
        return res.status(409).json({
          error: error.message
        });
      }
      res.status(500).json({
        error: 'Failed to create action'
      });
    }
  }
}

module.exports = new ActionController();
