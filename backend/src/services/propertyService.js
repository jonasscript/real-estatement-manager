const { query } = require('../config/database');

class PropertyService {
  // Get all properties
  async getAllProperties(filters = {}) {
    try {
      let queryText = `
        SELECT p.*, re.name as real_estate_name,
               u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM properties p
        LEFT JOIN real_estates re ON p.real_estate_id = re.id
        LEFT JOIN users u ON p.created_by = u.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.realEstateId) {
        queryText += ` AND p.real_estate_id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.propertyType) {
        queryText += ` AND p.property_type = $${paramIndex}`;
        queryParams.push(filters.propertyType);
        paramIndex++;
      }

      if (filters.status) {
        queryText += ` AND p.status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }

      if (filters.search) {
        queryText += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY p.created_at DESC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get property by ID
  async getPropertyById(propertyId) {
    try {
      const queryText = `
        SELECT p.*, re.name as real_estate_name,
               u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM properties p
        LEFT JOIN real_estates re ON p.real_estate_id = re.id
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.id = $1
      `;
      const result = await query(queryText, [propertyId]);

      if (result.rows.length === 0) {
        throw new Error('Property not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new property
  async createProperty(propertyData, createdBy) {
    try {
      const {
        realEstateId,
        title,
        description,
        propertyType,
        address,
        city,
        price,
        downPaymentPercentage,
        totalInstallments,
        status = 'available'
      } = propertyData;

      // Calculate installment amount
      const downPaymentAmount = (price * downPaymentPercentage) / 100;
      const installmentAmount = downPaymentAmount / totalInstallments;

      const insertQuery = `
        INSERT INTO properties (
          real_estate_id, title, description, property_type, address, city,
          price, down_payment_percentage, total_installments, installment_amount, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      const insertResult = await query(insertQuery, [
        realEstateId, title, description, propertyType, address, city,
        price, downPaymentPercentage, totalInstallments, installmentAmount, status, createdBy
      ]);

      return insertResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update property
  async updateProperty(propertyId, updateData) {
    try {
      const {
        title,
        description,
        propertyType,
        address,
        city,
        price,
        downPaymentPercentage,
        totalInstallments,
        status
      } = updateData;

      // Recalculate installment amount if price or down payment changes
      let installmentAmount;
      if (price && downPaymentPercentage && totalInstallments) {
        const downPaymentAmount = (price * downPaymentPercentage) / 100;
        installmentAmount = downPaymentAmount / totalInstallments;
      }

      const updateQuery = `
        UPDATE properties
        SET title = $1, description = $2, property_type = $3, address = $4, city = $5,
            price = $6, down_payment_percentage = $7, total_installments = $8,
            installment_amount = COALESCE($9, installment_amount), status = $10, updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [
        title, description, propertyType, address, city,
        price, downPaymentPercentage, totalInstallments, installmentAmount, status, propertyId
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error('Property not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete property
  async deleteProperty(propertyId) {
    try {
      // Check if property has associated clients
      const checkQuery = 'SELECT COUNT(*) as client_count FROM clients WHERE property_id = $1';
      const checkResult = await query(checkQuery, [propertyId]);
      const clientCount = parseInt(checkResult.rows[0].client_count);

      if (clientCount > 0) {
        throw new Error('Cannot delete property with associated clients');
      }

      const deleteQuery = 'DELETE FROM properties WHERE id = $1 RETURNING *';
      const deleteResult = await query(deleteQuery, [propertyId]);

      if (deleteResult.rows.length === 0) {
        throw new Error('Property not found');
      }

      return deleteResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get properties by real estate
  async getPropertiesByRealEstate(realEstateId) {
    try {
      return this.getAllProperties({ realEstateId });
    } catch (error) {
      throw error;
    }
  }

  // Get available properties
  async getAvailableProperties() {
    try {
      return this.getAllProperties({ status: 'available' });
    } catch (error) {
      throw error;
    }
  }

  // Search properties
  async searchProperties(searchTerm) {
    try {
      return this.getAllProperties({ search: searchTerm });
    } catch (error) {
      throw error;
    }
  }

  // Get property statistics
  async getPropertyStatistics(realEstateId = null) {
    try {
      let whereClause = '';
      let params = [];

      if (realEstateId) {
        whereClause = 'WHERE p.real_estate_id = $1';
        params = [realEstateId];
      }

      const statsQuery = `
        SELECT
          COUNT(*) as total_properties,
          COUNT(CASE WHEN p.status = 'available' THEN 1 END) as available_properties,
          COUNT(CASE WHEN p.status = 'sold' THEN 1 END) as sold_properties,
          COUNT(CASE WHEN p.status = 'under_construction' THEN 1 END) as under_construction_properties,
          COALESCE(SUM(p.price), 0) as total_property_value,
          COALESCE(AVG(p.price), 0) as average_property_price
        FROM properties p
        ${whereClause}
      `;

      const result = await query(statsQuery, params);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PropertyService();