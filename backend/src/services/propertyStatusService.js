const { query } = require('../config/database');

class PropertyStatusService {
  // Get all property status
  async getAllPropertyStatus() {
    try {
      const queryText = `
        SELECT * FROM property_status 
        WHERE is_active = true 
        ORDER BY name ASC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get property status by ID
  async getPropertyStatusById(id) {
    try {
      const queryText = `
        SELECT * FROM property_status 
        WHERE id = $1 AND is_active = true
      `;
      const result = await query(queryText, [id]);

      if (result.rows.length === 0) {
        throw new Error('Property status not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new property status (Admin only)
  async createPropertyStatus(statusData) {
    try {
      const { name, description, color } = statusData;

      const insertQuery = `
        INSERT INTO property_status (name, description, color)
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const result = await query(insertQuery, [name, description, color]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Property status name already exists');
      }
      throw error;
    }
  }

  // Update property status (Admin only)
  async updatePropertyStatus(id, statusData) {
    try {
      const { name, description, color, is_active } = statusData;

      const updateQuery = `
        UPDATE property_status 
        SET name = $1, description = $2, color = $3, is_active = $4
        WHERE id = $5
        RETURNING *
      `;

      const result = await query(updateQuery, [name, description, color, is_active, id]);

      if (result.rows.length === 0) {
        throw new Error('Property status not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Property status name already exists');
      }
      throw error;
    }
  }

  // Soft delete property status (Admin only)
  async deletePropertyStatus(id) {
    try {
      const updateQuery = `
        UPDATE property_status 
        SET is_active = false
        WHERE id = $1
        RETURNING *
      `;

      const result = await query(updateQuery, [id]);

      if (result.rows.length === 0) {
        throw new Error('Property status not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PropertyStatusService();