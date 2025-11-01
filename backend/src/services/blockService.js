const { query } = require('../config/database');

class BlockService {
  // Get all blocks with filters
  async getAllBlocks(filters = {}) {
    try {
      let queryText = `
        SELECT b.*, ph.name as phase_name, pht.name as phase_type_name, 
               re.name as real_estate_name
        FROM blocks b
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.phaseId) {
        queryText += ` AND b.phase_id = $${paramIndex}`;
        queryParams.push(filters.phaseId);
        paramIndex++;
      }

      if (filters.realEstateId) {
        queryText += ` AND re.id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.search) {
        queryText += ` AND (b.name ILIKE $${paramIndex} OR b.description ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY b.id DESC'; // Changed from created_at to id

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Error in getAllBlocks:', error);
      throw error;
    }
  }

  // Get block by ID
  async getBlockById(blockId) {
    try {
      const queryText = `
        SELECT b.*, ph.name as phase_name, pht.name as phase_type_name, 
               re.name as real_estate_name
        FROM blocks b
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        WHERE b.id = $1
      `;
      const result = await query(queryText, [blockId]);

      if (result.rows.length === 0) {
        throw new Error('Block not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get block summary using view
  async getBlockSummary(blockId) {
    try {
      const queryText = `
        SELECT * FROM block_summary WHERE id = $1
      `;
      const result = await query(queryText, [blockId]);

      if (result.rows.length === 0) {
        throw new Error('Block not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get blocks by phase
  async getBlocksByPhase(phaseId) {
    try {
      const queryText = `
        SELECT b.*, ph.name as phase_name
        FROM blocks b
        LEFT JOIN phases ph ON b.phase_id = ph.id
        WHERE b.phase_id = $1
        ORDER BY b.name ASC
      `;
      const result = await query(queryText, [phaseId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Create new block
  async createBlock(blockData) {
    try {
      const {
        phaseId,
        name,
        description,
        totalUnits = 0,
        availableUnits = 0,
        coordinatesX = null,
        coordinatesY = null
      } = blockData;

      const insertQuery = `
        INSERT INTO blocks (
          phase_id, name, description, total_units, available_units, coordinates_x, coordinates_y
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await query(insertQuery, [
        phaseId, name, description, totalUnits, availableUnits, coordinatesX, coordinatesY
      ]);

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid phase ID');
      }
      if (error.code === '23505') { // Unique violation
        throw new Error('Block name already exists in this phase');
      }
      throw error;
    }
  }

  // Update block
  async updateBlock(blockId, blockData) {
    try {
      const {
        name,
        description,
        totalUnits = 0,
        availableUnits = 0,
        coordinatesX = null,
        coordinatesY = null
      } = blockData;

      const updateQuery = `
        UPDATE blocks 
        SET name = $1, description = $2, total_units = $3, available_units = $4,
            coordinates_x = $5, coordinates_y = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;

      const result = await query(updateQuery, [
        name, description, totalUnits, availableUnits, coordinatesX, coordinatesY, blockId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Block not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Block name already exists in this phase');
      }
      throw error;
    }
  }

  // Delete block (will cascade to units)
  async deleteBlock(blockId) {
    try {
      const deleteQuery = `
        DELETE FROM blocks 
        WHERE id = $1
        RETURNING *
      `;

      const result = await query(deleteQuery, [blockId]);

      if (result.rows.length === 0) {
        throw new Error('Block not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new BlockService();