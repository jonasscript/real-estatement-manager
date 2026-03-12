const componentService = require('../services/componentService');

class ComponentController {
  // Get all components
  async getAllComponents(req, res) {
    try {
      const components = await componentService.getAllComponents();
      res.json({
        message: 'Components retrieved successfully',
        data: components
      });
    } catch (error) {
      console.error('Get components error:', error);
      res.status(500).json({
        error: 'Failed to retrieve components'
      });
    }
  }

  // Get component by ID
  async getComponentById(req, res) {
    try {
      const { componentId } = req.params;
      const component = await componentService.getComponentById(componentId);
      
      if (!component) {
        return res.status(404).json({
          error: 'Component not found'
        });
      }

      res.json({
        message: 'Component retrieved successfully',
        data: component
      });
    } catch (error) {
      console.error('Get component by ID error:', error);
      res.status(500).json({
        error: 'Failed to retrieve component'
      });
    }
  }

  // Create component
  async createComponent(req, res) {
    try {
      const component = await componentService.createComponent(req.body);
      res.status(201).json({
        message: 'Component created successfully',
        data: component
      });
    } catch (error) {
      console.error('Create component error:', error);
      if (error.message === 'Component with this name already exists') {
        return res.status(409).json({
          error: error.message
        });
      }
      res.status(500).json({
        error: 'Failed to create component'
      });
    }
  }
}

module.exports = new ComponentController();
