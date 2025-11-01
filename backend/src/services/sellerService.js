const { query } = require('../config/database');

class SellerService {
  // Get all sellers with user information
  async getAllSellers(filters = {}) {
    try {
      let queryText = `
        SELECT s.*, u.email, u.first_name, u.last_name, u.phone, u.is_active as user_active,
               re.name as real_estate_name
        FROM sellers s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN real_estates re ON s.real_estate_id = re.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.realEstateId) {
        queryText += ` AND s.real_estate_id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.isActive !== undefined) {
        queryText += ` AND s.is_active = $${paramIndex}`;
        queryParams.push(filters.isActive);
        paramIndex++;
      }

      if (filters.search) {
        queryText += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY s.created_at DESC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get seller by ID
  async getSellerById(sellerId) {
    try {
      const queryText = `
        SELECT s.*, u.email, u.first_name, u.last_name, u.phone, u.is_active as user_active,
               re.name as real_estate_name
        FROM sellers s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN real_estates re ON s.real_estate_id = re.id
        WHERE s.id = $1
      `;
      const result = await query(queryText, [sellerId]);

      if (result.rows.length === 0) {
        throw new Error('Seller not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get seller by user ID
  async getSellerByUserId(userId) {
    try {
      const queryText = `
        SELECT s.*, u.email, u.first_name, u.last_name, u.phone, u.is_active as user_active,
               re.name as real_estate_name
        FROM sellers s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN real_estates re ON s.real_estate_id = re.id
        WHERE s.user_id = $1
      `;
      const result = await query(queryText, [userId]);

      if (result.rows.length === 0) {
        throw new Error('Seller not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new seller
  async createSeller(sellerData, createdBy) {
    try {
      const { userId, realEstateId, commissionRate = 5.00 } = sellerData;

      // Check if user already exists as seller for this real estate
      const existingQuery = 'SELECT id FROM sellers WHERE user_id = $1 AND real_estate_id = $2';
      const existingResult = await query(existingQuery, [userId, realEstateId]);

      if (existingResult.rows.length > 0) {
        throw new Error('User is already a seller for this real estate');
      }

      const insertQuery = `
        INSERT INTO sellers (user_id, real_estate_id, commission_rate)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const insertResult = await query(insertQuery, [userId, realEstateId, commissionRate]);

      return insertResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update seller
  async updateSeller(sellerId, updateData) {
    try {
      const { commissionRate, isActive, totalSales, totalCommission } = updateData;

      const updateQuery = `
        UPDATE sellers
        SET commission_rate = $1, is_active = $2, total_sales = $3, total_commission = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [
        commissionRate, isActive, totalSales, totalCommission, sellerId
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error('Seller not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete seller
  async deleteSeller(sellerId) {
    try {
      // Check if seller has assigned clients
      const clientCheckQuery = 'SELECT COUNT(*) as client_count FROM clients WHERE assigned_seller_id = $1';
      const clientCheckResult = await query(clientCheckQuery, [sellerId]);
      const clientCount = parseInt(clientCheckResult.rows[0].client_count);

      if (clientCount > 0) {
        throw new Error('Cannot delete seller with assigned clients');
      }

      const deleteQuery = 'DELETE FROM sellers WHERE id = $1 RETURNING *';
      const deleteResult = await query(deleteQuery, [sellerId]);

      if (deleteResult.rows.length === 0) {
        throw new Error('Seller not found');
      }

      return deleteResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get sellers by real estate
  async getSellersByRealEstate(realEstateId) {
    try {
      return this.getAllSellers({ realEstateId });
    } catch (error) {
      throw error;
    }
  }

  // Get seller statistics
  async getSellerStatistics(realEstateId = null) {
    try {
      let whereClause = '';
      let params = [];

      if (realEstateId) {
        whereClause = 'WHERE s.real_estate_id = $1';
        params = [realEstateId];
      }

      const statsQuery = `
        SELECT
          COUNT(*) as total_sellers,
          COUNT(CASE WHEN s.is_active = true THEN 1 END) as active_sellers,
          COUNT(CASE WHEN s.is_active = false THEN 1 END) as inactive_sellers,
          COALESCE(SUM(s.total_sales), 0) as total_sales,
          COALESCE(SUM(s.total_commission), 0) as total_commissions,
          COALESCE(AVG(s.commission_rate), 0) as average_commission_rate
        FROM sellers s
        ${whereClause}
      `;

      const result = await query(statsQuery, params);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update seller sales and commission when a client makes a payment
  async updateSellerCommission(sellerId, saleAmount) {
    try {
      // Get seller's commission rate
      const sellerQuery = 'SELECT commission_rate FROM sellers WHERE id = $1';
      const sellerResult = await query(sellerQuery, [sellerId]);

      if (sellerResult.rows.length === 0) {
        throw new Error('Seller not found');
      }

      const commissionRate = sellerResult.rows[0].commission_rate;
      const commission = (saleAmount * commissionRate) / 100;

      const updateQuery = `
        UPDATE sellers
        SET total_sales = total_sales + $1, total_commission = total_commission + $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [saleAmount, commission, sellerId]);

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get seller performance metrics
  async getSellerPerformance(sellerId) {
    try {
      const performanceQuery = `
        SELECT
          s.total_sales,
          s.total_commission,
          s.commission_rate,
          COUNT(c.id) as total_clients,
          COUNT(CASE WHEN c.contract_signed = true THEN 1 END) as signed_clients
        FROM sellers s
        LEFT JOIN clients c ON s.id = c.assigned_seller_id
        WHERE s.id = $1
        GROUP BY s.id, s.total_sales, s.total_commission, s.commission_rate
      `;

      const result = await query(performanceQuery, [sellerId]);

      if (result.rows.length === 0) {
        throw new Error('Seller not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SellerService();