const purchaseStageService = require('../services/purchaseStageService');
const { validationResult } = require('express-validator');

class PurchaseStageController {
  handleValidation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return false;
    }
    return true;
  }

  async getDefinitions(req, res) {
    try {
      const definitions = await purchaseStageService.getDefinitions(req.query, req.user);
      res.json({ message: 'Stage definitions retrieved successfully', data: definitions, count: definitions.length });
    } catch (error) {
      console.error('Get stage definitions error:', error);
      res.status(500).json({ error: error.message || 'Failed to retrieve stage definitions' });
    }
  }

  async createDefinition(req, res) {
    try {
      if (!this.handleValidation(req, res)) return;
      const definition = await purchaseStageService.createDefinition(req.body, req.user);
      res.status(201).json({ message: 'Stage definition created successfully', data: definition });
    } catch (error) {
      console.error('Create stage definition error:', error);
      res.status(500).json({ error: error.message || 'Failed to create stage definition' });
    }
  }

  async updateDefinition(req, res) {
    try {
      if (!this.handleValidation(req, res)) return;
      const definition = await purchaseStageService.updateDefinition(req.params.definitionId, req.body, req.user);
      res.json({ message: 'Stage definition updated successfully', data: definition });
    } catch (error) {
      console.error('Update stage definition error:', error);
      res.status(error.message === 'Stage definition not found' ? 404 : 500).json({ error: error.message || 'Failed to update stage definition' });
    }
  }

  async deleteDefinition(req, res) {
    try {
      const definition = await purchaseStageService.deleteDefinition(req.params.definitionId, req.user);
      res.json({ message: 'Stage definition disabled successfully', data: definition });
    } catch (error) {
      console.error('Delete stage definition error:', error);
      res.status(error.message === 'Stage definition not found' ? 404 : 500).json({ error: error.message || 'Failed to delete stage definition' });
    }
  }

  async getPropertyOverrides(req, res) {
    try {
      const overrides = await purchaseStageService.getPropertyOverrides(req.params.propertyId, req.user);
      res.json({ message: 'Property stage overrides retrieved successfully', data: overrides, count: overrides.length });
    } catch (error) {
      console.error('Get property stage overrides error:', error);
      res.status(500).json({ error: error.message || 'Failed to retrieve property stage overrides' });
    }
  }

  async updatePropertyOverrides(req, res) {
    try {
      const overrides = await purchaseStageService.updatePropertyOverrides(req.params.propertyId, req.body.overrides || [], req.user);
      res.json({ message: 'Property stage overrides updated successfully', data: overrides });
    } catch (error) {
      console.error('Update property stage overrides error:', error);
      res.status(500).json({ error: error.message || 'Failed to update property stage overrides' });
    }
  }

  async getClientPurchaseStages(req, res) {
    try {
      const stages = await purchaseStageService.getStagesForPurchase(req.params.clientId, req.params.purchaseId, req.user);
      res.json({ message: 'Client purchase stages retrieved successfully', data: stages, count: stages.length });
    } catch (error) {
      console.error('Get client purchase stages error:', error);
      res.status(500).json({ error: error.message || 'Failed to retrieve client purchase stages' });
    }
  }

  async createStagePayment(req, res) {
    try {
      const fileBuffer = req.file?.buffer || null;
      const fileInfo = req.file
        ? { originalname: req.file.originalname, mimetype: req.file.mimetype }
        : null;
      const payment = await purchaseStageService.createStagePayment(req.params.stageId, req.body, fileBuffer, fileInfo, req.user);
      res.status(201).json({ message: 'Stage payment registered successfully', data: payment });
    } catch (error) {
      console.error('Create stage payment error:', error);
      res.status(error.message.includes('anteriores') ? 400 : 500).json({ error: error.message || 'Failed to register stage payment' });
    }
  }

  async generateDownPaymentSchedule(req, res) {
    try {
      const result = await purchaseStageService.generateDownPaymentSchedule(req.params.purchaseId, req.body, req.user);
      res.status(201).json({ message: 'Down payment schedule generated successfully', data: result });
    } catch (error) {
      console.error('Generate down payment schedule error:', error);
      res.status(error.message.includes('completar') || error.message.includes('already') ? 400 : 500).json({
        error: error.message || 'Failed to generate down payment schedule',
      });
    }
  }
}

module.exports = new PurchaseStageController();
