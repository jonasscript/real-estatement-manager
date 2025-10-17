const { query } = require('../config/database');

class RealEstateService {
  // Get all real estates
  async getAllRealEstates() {
    try {
      const queryText = `
        SELECT re.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM real_estates re
        LEFT JOIN users u ON re.created_by = u.id
        ORDER BY re.created_at DESC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get real estate by ID
  async getRealEstateById(realEstateId) {
    try {
      const queryText = `
        SELECT re.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM real_estates re
        LEFT JOIN users u ON re.created_by = u.id
        WHERE re.id = $1
      `;
      const result = await query(queryText, [realEstateId]);

      if (result.rows.length === 0) {
        throw new Error('Real estate not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new real estate
  async createRealEstate(realEstateData, createdBy) {
    try {
      const { name, address, city, country, phone, email } = realEstateData;

      const insertQuery = `
        INSERT INTO real_estates (name, address, city, country, phone, email, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const insertResult = await query(insertQuery, [
        name, address, city, country, phone, email, createdBy
      ]);

      return insertResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update real estate
  async updateRealEstate(realEstateId, updateData) {
    try {
      const { name, address, city, country, phone, email } = updateData;

      const updateQuery = `
        UPDATE real_estates
        SET name = $1, address = $2, city = $3, country = $4, phone = $5, email = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [
        name, address, city, country, phone, email, realEstateId
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error('Real estate not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete real estate
  async deleteRealEstate(realEstateId) {
    try {
      // Check if real estate has associated clients or properties
      const checkQuery = `
        SELECT
          (SELECT COUNT(*) FROM clients WHERE real_estate_id = $1) as client_count,
          (SELECT COUNT(*) FROM properties WHERE real_estate_id = $1) as property_count
      `;
      const checkResult = await query(checkQuery, [realEstateId]);
      const { client_count, property_count } = checkResult.rows[0];

      if (parseInt(client_count) > 0 || parseInt(property_count) > 0) {
        throw new Error('Cannot delete real estate with associated clients or properties');
      }

      const deleteQuery = 'DELETE FROM real_estates WHERE id = $1 RETURNING *';
      const deleteResult = await query(deleteQuery, [realEstateId]);

      if (deleteResult.rows.length === 0) {
        throw new Error('Real estate not found');
      }

      return deleteResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get real estate statistics
  async getRealEstateStatistics(realEstateId = null) {
    try {
      let whereClause = '';
      let params = [];

      if (realEstateId) {
        whereClause = 'WHERE re.id = $1';
        params = [realEstateId];
      }

      const statsQuery = `
        SELECT
          re.id,
          re.name,
          COUNT(DISTINCT p.id) as property_count,
          COUNT(DISTINCT c.id) as client_count,
          COUNT(DISTINCT CASE WHEN c.contract_signed = true THEN c.id END) as signed_contracts_count,
          COALESCE(SUM(c.total_down_payment), 0) as total_down_payments,
          COALESCE(SUM(c.remaining_balance), 0) as total_remaining_balance
        FROM real_estates re
        LEFT JOIN properties p ON re.id = p.real_estate_id
        LEFT JOIN clients c ON re.id = c.real_estate_id
        ${whereClause}
        GROUP BY re.id, re.name
        ORDER BY re.name
      `;

      const result = await query(statsQuery, params);
      return realEstateId ? result.rows[0] : result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get real estates created by a specific admin
  async getRealEstatesByAdmin(adminId) {
    try {
      const queryText = `
        SELECT re.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM real_estates re
        LEFT JOIN users u ON re.created_by = u.id
        WHERE re.created_by = $1
        ORDER BY re.created_at DESC
      `;
      const result = await query(queryText, [adminId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Search real estates
  async searchRealEstates(searchTerm) {
    try {
      const queryText = `
        SELECT re.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM real_estates re
        LEFT JOIN users u ON re.created_by = u.id
        WHERE re.name ILIKE $1 OR re.city ILIKE $1 OR re.country ILIKE $1
        ORDER BY re.created_at DESC
      `;
      const result = await query(queryText, [`%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RealEstateService();