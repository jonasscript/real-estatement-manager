const clientService = require('../services/clientService');
const { validationResult } = require('express-validator');
const { query: dbQuery } = require('../config/database');

class ClientController {
  // Get all clients
  async getAllClients(req, res) {
    try {
      const filters = {
        realEstateId: req.query.realEstateId,
        sellerId: req.query.sellerId,
        contractSigned: req.query.contractSigned === 'true' ? true : req.query.contractSigned === 'false' ? false : undefined,
        search: req.query.search
      };

      const clients = await clientService.getAllClients(filters);

      res.json({
        message: 'Clients retrieved successfully',
        data: clients,
        count: clients.length
      });
    } catch (error) {
      console.error('Get all clients error:', error);
      res.status(500).json({
        error: 'Failed to retrieve clients'
      });
    }
  }

  // Get client by ID
  async getClientById(req, res) {
    try {
      const { clientId } = req.params;
      const client = await clientService.getClientById(clientId);

      res.json({
        message: 'Client retrieved successfully',
        data: client
      });
    } catch (error) {
      console.error('Get client by ID error:', error);
      res.status(error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve client'
      });
    }
  }

  // Get current user's client profile
  async getMyClientProfile(req, res) {
    try {
      const client = await clientService.getClientByUserId(req.user.id);

      res.json({
        message: 'Client profile retrieved successfully',
        data: client
      });
    } catch (error) {
      console.error('Get my client profile error:', error);
      res.status(error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve client profile'
      });
    }
  }

  // Create new client
  async createClient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const clientData = { ...req.body, realEstateId: req.user.real_estate_id };
      const createdBy = req.user.id;

      const newClient = await clientService.createClient(clientData, createdBy);

      res.status(201).json({
        message: 'Client created successfully',
        data: newClient
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({
        error: error.message || 'Failed to create client'
      });
    }
  }

  // Register client + user atomically
  async registerClientWithUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const realEstateId = req.user.real_estate_id;
      if (!realEstateId) {
        return res.status(400).json({ error: 'No real estate associated with your account' });
      }

      // If the logged-in user is a seller, auto-resolve their sellers.id from the token
      let bodyData = { ...req.body };
      if (req.user.role_name === 'seller' && !bodyData.assignedSellerId) {
        const sellerResult = await dbQuery('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
        if (sellerResult.rows.length > 0) {
          bodyData.assignedSellerId = sellerResult.rows[0].id;
        }
      }

      const result = await clientService.registerClientWithUser(bodyData, realEstateId);

      res.status(201).json({
        message: 'Client registered successfully',
        data: result
      });
    } catch (error) {
      console.error('Register client with user error:', error);
      const status = error.message === 'Email already exists' ? 409 : 500;
      res.status(status).json({
        error: error.message || 'Failed to register client'
      });
    }
  }

  // Update client
  async updateClient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { clientId } = req.params;
      const updateData = req.body;

      const updatedClient = await clientService.updateClient(clientId, updateData);

      res.json({
        message: 'Client updated successfully',
        data: updatedClient
      });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to update client'
      });
    }
  }

  // Delete client
  async deleteClient(req, res) {
    try {
      const { clientId } = req.params;
      const deletedClient = await clientService.deleteClient(clientId);

      res.json({
        message: 'Client deleted successfully',
        data: deletedClient
      });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(error.message.includes('Cannot delete') ? 409 : error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete client'
      });
    }
  }

  // Get clients by seller
  async getClientsBySeller(req, res) {
    try {
      const sellerId = req.user.role_name === 'seller' ? req.user.id : req.params.sellerId;
      const clients = await clientService.getClientsBySeller(sellerId);

      res.json({
        message: 'Clients retrieved successfully',
        data: clients,
        count: clients.length
      });
    } catch (error) {
      console.error('Get clients by seller error:', error);
      res.status(500).json({
        error: 'Failed to retrieve clients'
      });
    }
  }

  // Get client statistics
  async getClientStatistics(req, res) {
    try {
      const { realEstateId } = req.params;
      const statistics = await clientService.getClientStatistics(realEstateId);

      res.json({
        message: 'Client statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get client statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve client statistics'
      });
    }
  }

  // Get all clients statistics
  async getAllClientsStatistics(req, res) {
    try {
      const statistics = await clientService.getClientStatistics();

      res.json({
        message: 'All clients statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get all clients statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve clients statistics'
      });
    }
  }

  // Get client payment summary
  async getClientPaymentSummary(req, res) {
    try {
      const { clientId } = req.params;
      const summary = await clientService.getClientPaymentSummary(clientId);

      res.json({
        message: 'Client payment summary retrieved successfully',
        data: summary
      });
    } catch (error) {
      console.error('Get client payment summary error:', error);
      res.status(error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve payment summary'
      });
    }
  }

  // Get current user's payment summary
  async getMyPaymentSummary(req, res) {
    try {
      const client = await clientService.getClientByUserId(req.user.id);
      const summary = await clientService.getClientPaymentSummary(client.id);

      res.json({
        message: 'Payment summary retrieved successfully',
        data: summary
      });
    } catch (error) {
      console.error('Get my payment summary error:', error);
      res.status(error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve payment summary'
      });
    }
  }

  // Get client's installments (Client only)
  async getClientInstallments(req, res) {
    try {
      const client = await clientService.getClientByUserId(req.user.id);
      const installments = await clientService.getClientInstallments(client.id);

      res.json({
        message: 'Client installments retrieved successfully',
        data: installments,
        count: installments.length
      });
    } catch (error) {
      console.error('Get client installments error:', error);
      res.status(error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve installments'
      });
    }
  }

  // Get client's payments (Client only)
  async getClientPayments(req, res) {
    try {
      const client = await clientService.getClientByUserId(req.user.id);
      const payments = await clientService.getClientPayments(client.id);

      res.json({
        message: 'Client payments retrieved successfully',
        data: payments,
        count: payments.length
      });
    } catch (error) {
      console.error('Get client payments error:', error);
      res.status(error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve payments'
      });
    }
  }

  // Get current client's own property purchases
  async getMyProperties(req, res) {
    try {
      const client = await clientService.getClientByUserId(req.user.id);
      const properties = await clientService.getClientProperties(client.id);
      res.json({
        message: 'Client properties retrieved successfully',
        data: properties,
        count: properties.length
      });
    } catch (error) {
      console.error('Get my properties error:', error);
      res.status(error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve properties'
      });
    }
  }

  // Get assigned clients (Seller only)
  async getAssignedClients(req, res) {
    try {
      const sellerId = req.user.id;
      const clients = await clientService.getClientsBySeller(sellerId);

      res.json({
        message: 'Assigned clients retrieved successfully',
        data: clients,
        count: clients.length
      });
    } catch (error) {
      console.error('Get assigned clients error:', error);
      res.status(500).json({
        error: 'Failed to retrieve assigned clients'
      });
    }
  }

  // Get all property purchases for a specific client
  async getClientProperties(req, res) {
    try {
      const { clientId } = req.params;
      const purchases = await clientService.getClientProperties(clientId);

      res.json({
        message: 'Client properties retrieved successfully',
        data: purchases,
        count: purchases.length
      });
    } catch (error) {
      console.error('Get client properties error:', error);
      res.status(500).json({
        error: error.message || 'Failed to retrieve client properties'
      });
    }
  }

  // Add a new property purchase to an existing client
  async addPropertyToClient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { clientId } = req.params;
      const realEstateId = req.user.real_estate_id;
      const purchase = await clientService.addPropertyToClient(clientId, req.body, realEstateId);

      res.status(201).json({
        message: 'Property added to client successfully',
        data: purchase
      });
    } catch (error) {
      console.error('Add property to client error:', error);
      const status = error.message === 'Property already purchased by this client' ? 409 : 500;
      res.status(status).json({
        error: error.message || 'Failed to add property to client'
      });
    }
  }
}

module.exports = new ClientController();