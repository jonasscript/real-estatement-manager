const { query } = require('../config/database');

class PhaseService {
  // Get all phases with filters
  async getAllPhases(filters = {}) {
    try {
      let queryText = `
        SELECT ph.*, pht.name as phase_type_name, re.name as real_estate_name
        FROM phases ph
        LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.realEstateId) {
        queryText += ` AND ph.real_estate_id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.phaseTypeId) {
        queryText += ` AND ph.phase_type_id = $${paramIndex}`;
        queryParams.push(filters.phaseTypeId);
        paramIndex++;
      }

      if (filters.status) {
        queryText += ` AND ph.status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }

      if (filters.search) {
        queryText += ` AND (ph.name ILIKE $${paramIndex} OR ph.description ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY ph.id DESC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Error in getAllPhases:', error);
      throw error;
    }
  }

  // Get phase by ID with full details
  async getPhaseById(phaseId) {
    try {
      const queryText = `
        SELECT ph.*, pht.name as phase_type_name, re.name as real_estate_name
        FROM phases ph
        LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        WHERE ph.id = $1
      `;
      const result = await query(queryText, [phaseId]);

      if (result.rows.length === 0) {
        throw new Error('Phase not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in getPhaseById:', error);
      throw error;
    }
  }

  // Get phase summary using view
  async getPhaseSummary(phaseId) {
    try {
      const queryText = `
        SELECT * FROM phase_summary WHERE id = $1
      `;
      const result = await query(queryText, [phaseId]);

      if (result.rows.length === 0) {
        throw new Error('Phase not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get phases by real estate
  async getPhasesByRealEstate(realEstateId) {
    try {
      const queryText = `
        SELECT ph.*, pht.name as phase_type_name
        FROM phases ph
        LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
        WHERE ph.real_estate_id = $1
        ORDER BY ph.id DESC
      `;
      const result = await query(queryText, [realEstateId]);
      return result.rows;
    } catch (error) {
      console.error('Error in getPhasesByRealEstate:', error);
      throw error;
    }
  }

  // Create new phase
  async createPhase(phaseData, createdBy = null) {
    try {
      const {
        realEstateId,
        phaseTypeId,
        name,
        description,
        status = 'planning',
        startDate,
        completionDate
      } = phaseData;

      const insertQuery = `
        INSERT INTO phases (
          real_estate_id, phase_type_id, name, description, status, 
          start_date, completion_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await query(insertQuery, [
        realEstateId, phaseTypeId, name, description, status,
        startDate, completionDate
      ]);

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid real estate ID or phase type ID');
      }
      console.error('Error in createPhase:', error);
      throw error;
    }
  }

  // Update phase
  async updatePhase(phaseId, phaseData) {
    try {
      const {
        phaseTypeId,
        name,
        description,
        status,
        startDate,
        completionDate
      } = phaseData;

      const updateQuery = `
        UPDATE phases 
        SET phase_type_id = $1, name = $2, description = $3, 
            status = $4, start_date = $5, completion_date = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;

      const result = await query(updateQuery, [
        phaseTypeId, name, description, status,
        startDate, completionDate, phaseId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Phase not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid phase type ID');
      }
      throw error;
    }
  }

  // Delete phase (will cascade to blocks and units)
  async deletePhase(phaseId) {
    try {
      const deleteQuery = `
        DELETE FROM phases 
        WHERE id = $1
        RETURNING *
      `;

      const result = await query(deleteQuery, [phaseId]);

      if (result.rows.length === 0) {
        throw new Error('Phase not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PhaseService();