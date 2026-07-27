const cronConfigurationService = require('../services/cronConfigurationService');
const { validationResult } = require('express-validator');

class CronConfigurationController {
  handleValidation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return false;
    }
    return true;
  }

  async getConfigurations(req, res) {
    try {
      const configurations = await cronConfigurationService.getConfigurations(req.query, req.user);
      res.json({ message: 'Cron configurations retrieved successfully', data: configurations, count: configurations.length });
    } catch (error) {
      console.error('Get cron configurations error:', error);
      res.status(500).json({ error: error.message || 'Failed to retrieve cron configurations' });
    }
  }

  async createConfiguration(req, res) {
    try {
      if (!this.handleValidation(req, res)) return;
      const configuration = await cronConfigurationService.createConfiguration(req.body, req.user);
      res.status(201).json({ message: 'Cron configuration created successfully', data: configuration });
    } catch (error) {
      console.error('Create cron configuration error:', error);
      res.status(error.message.includes('required') ? 400 : 500).json({ error: error.message || 'Failed to create cron configuration' });
    }
  }

  async updateConfiguration(req, res) {
    try {
      if (!this.handleValidation(req, res)) return;
      const configuration = await cronConfigurationService.updateConfiguration(req.params.configId, req.body, req.user);
      res.json({ message: 'Cron configuration updated successfully', data: configuration });
    } catch (error) {
      console.error('Update cron configuration error:', error);
      const status = error.message === 'Cron configuration not found' ? 404 : error.message.includes('required') ? 400 : 500;
      res.status(status).json({ error: error.message || 'Failed to update cron configuration' });
    }
  }

  async deleteConfiguration(req, res) {
    try {
      const configuration = await cronConfigurationService.deleteConfiguration(req.params.configId, req.user);
      res.json({ message: 'Cron configuration deleted successfully', data: configuration });
    } catch (error) {
      console.error('Delete cron configuration error:', error);
      res.status(error.message === 'Cron configuration not found' ? 404 : 500).json({ error: error.message || 'Failed to delete cron configuration' });
    }
  }
}

module.exports = new CronConfigurationController();
