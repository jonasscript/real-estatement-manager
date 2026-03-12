const { query } = require('../config/database');

class PhaseTypeService {
  // Get all phase types
  async getAllPhaseTypes() {
    try {
      const queryText = `
        SELECT * FROM phase_types 
        WHERE is_active = true 
        ORDER BY name ASC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get phase type by ID
  async getPhaseTypeById(id) {
    try {
      const queryText = `
        SELECT * FROM phase_types 
        WHERE id = $1 AND is_active = true
      `;
      const result = await query(queryText, [id]);

      if (result.rows.length === 0) {
        throw new Error('Phase type not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new phase type (Admin only)
  async createPhaseType(phaseTypeData) {
    try {
      const { name, description } = phaseTypeData;

      const insertQuery = `
        INSERT INTO phase_types (name, description)
        VALUES ($1, $2)
        RETURNING *
      `;

      const result = await query(insertQuery, [name, description]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Phase type name already exists');
      }
      throw error;
    }
  }

  // Update phase type (Admin only)
  async updatePhaseType(id, phaseTypeData) {
    try {
      const { name, description, is_active } = phaseTypeData;

      const updateQuery = `
        UPDATE phase_types 
        SET name = $1, description = $2, is_active = $3
        WHERE id = $4
        RETURNING *
      `;

      const result = await query(updateQuery, [name, description, is_active, id]);

      if (result.rows.length === 0) {
        throw new Error('Phase type not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Phase type name already exists');
      }
      throw error;
    }
  }

  // Soft delete phase type (Admin only)
  async deletePhaseType(id) {
    try {
      const updateQuery = `
        UPDATE phase_types 
        SET is_active = false
        WHERE id = $1
        RETURNING *
      `;

      const result = await query(updateQuery, [id]);

      if (result.rows.length === 0) {
        throw new Error('Phase type not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PhaseTypeService();