const sellerService = require('../services/sellerService');
const { validationResult } = require('express-validator');

class SellerController {
  // Get all sellers
  async getAllSellers(req, res) {
    try {
      const filters = {
        realEstateId: req.query.realEstateId,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search
      };

      const sellers = await sellerService.getAllSellers(filters);

      res.json({
        message: 'Sellers retrieved successfully',
        data: sellers,
        count: sellers.length
      });
    } catch (error) {
      console.error('Get all sellers error:', error);
      res.status(500).json({
        error: 'Failed to retrieve sellers'
      });
    }
  }

  // Get seller by ID
  async getSellerById(req, res) {
    try {
      const { sellerId } = req.params;
      const seller = await sellerService.getSellerById(sellerId);

      res.json({
        message: 'Seller retrieved successfully',
        data: seller
      });
    } catch (error) {
      console.error('Get seller by ID error:', error);
      res.status(error.message === 'Seller not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve seller'
      });
    }
  }

  // Get seller by user ID
  async getSellerByUserId(req, res) {
    try {
      const { userId } = req.params;
      const seller = await sellerService.getSellerByUserId(userId);

      res.json({
        message: 'Seller retrieved successfully',
        data: seller
      });
    } catch (error) {
      console.error('Get seller by user ID error:', error);
      res.status(error.message === 'Seller not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve seller'
      });
    }
  }

  // Create new seller
  async createSeller(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const sellerData = req.body;
      const createdBy = req.user.id;

      const newSeller = await sellerService.createSeller(sellerData, createdBy);

      res.status(201).json({
        message: 'Seller created successfully',
        data: newSeller
      });
    } catch (error) {
      console.error('Create seller error:', error);
      res.status(error.message.includes('already a seller') ? 409 : 500).json({
        error: error.message || 'Failed to create seller'
      });
    }
  }

  // Update seller
  async updateSeller(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { sellerId } = req.params;
      const updateData = req.body;

      const updatedSeller = await sellerService.updateSeller(sellerId, updateData);

      res.json({
        message: 'Seller updated successfully',
        data: updatedSeller
      });
    } catch (error) {
      console.error('Update seller error:', error);
      res.status(error.message === 'Seller not found' ? 404 : 500).json({
        error: error.message || 'Failed to update seller'
      });
    }
  }

  // Delete seller
  async deleteSeller(req, res) {
    try {
      const { sellerId } = req.params;
      const deletedSeller = await sellerService.deleteSeller(sellerId);

      res.json({
        message: 'Seller deleted successfully',
        data: deletedSeller
      });
    } catch (error) {
      console.error('Delete seller error:', error);
      res.status(error.message.includes('Cannot delete') ? 409 : error.message === 'Seller not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete seller'
      });
    }
  }

  // Get sellers by real estate
  async getSellersByRealEstate(req, res) {
    try {
      const { realEstateId } = req.params;
      const sellers = await sellerService.getSellersByRealEstate(realEstateId);

      res.json({
        message: 'Sellers retrieved successfully',
        data: sellers,
        count: sellers.length
      });
    } catch (error) {
      console.error('Get sellers by real estate error:', error);
      res.status(500).json({
        error: 'Failed to retrieve sellers'
      });
    }
  }

  // Get seller statistics
  async getSellerStatistics(req, res) {
    try {
      const { realEstateId } = req.params;
      const statistics = await sellerService.getSellerStatistics(realEstateId);

      res.json({
        message: 'Seller statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get seller statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve seller statistics'
      });
    }
  }

  // Get all sellers statistics
  async getAllSellersStatistics(req, res) {
    try {
      const statistics = await sellerService.getSellerStatistics();

      res.json({
        message: 'All sellers statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get all sellers statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve sellers statistics'
      });
    }
  }

  // Get seller performance
  async getSellerPerformance(req, res) {
    try {
      const { sellerId } = req.params;
      const performance = await sellerService.getSellerPerformance(sellerId);

      res.json({
        message: 'Seller performance retrieved successfully',
        data: performance
      });
    } catch (error) {
      console.error('Get seller performance error:', error);
      res.status(error.message === 'Seller not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve seller performance'
      });
    }
  }

  // Get current user's seller profile
  async getMySellerProfile(req, res) {
    try {
      const seller = await sellerService.getSellerByUserId(req.user.id);

      res.json({
        message: 'Seller profile retrieved successfully',
        data: seller
      });
    } catch (error) {
      console.error('Get my seller profile error:', error);
      res.status(error.message === 'Seller not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve seller profile'
      });
    }
  }

  // Get current user's seller performance
  async getMySellerPerformance(req, res) {
    try {
      const seller = await sellerService.getSellerByUserId(req.user.id);
      const performance = await sellerService.getSellerPerformance(seller.id);

      res.json({
        message: 'Seller performance retrieved successfully',
        data: performance
      });
    } catch (error) {
      console.error('Get my seller performance error:', error);
      res.status(error.message === 'Seller not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve seller performance'
      });
    }
  }
}

module.exports = new SellerController();