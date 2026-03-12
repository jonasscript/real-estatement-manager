const { query } = require('../config/database');

class BlockService {
  // Get all blocks with filters
  async getAllBlocks(filters = {}) {
    try {
      let queryText = `
        SELECT b.*, ph.name as phase_name, pht.name as phase_type_name,
               re.name as real_estate_name,
               COALESCE(bs.total_units, 0) as total_units,
               COALESCE(bs.available_units, 0) as available_units,
               COALESCE(bs.sold_units, 0) as sold_units,
               COALESCE(bs.sales_percentage, 0) as occupancy_rate
        FROM blocks b
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        LEFT JOIN block_summary bs ON bs.id = b.id
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
               re.name as real_estate_name,
               COALESCE(bs.total_units, 0) as total_units,
               COALESCE(bs.available_units, 0) as available_units,
               COALESCE(bs.sold_units, 0) as sold_units,
               COALESCE(bs.sales_percentage, 0) as occupancy_rate
        FROM blocks b
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        LEFT JOIN block_summary bs ON bs.id = b.id
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

  // Alias for controller compatibility
  async getBlockStatistics(blockId) {
    return this.getBlockSummary(blockId);
  }

  // Get blocks by phase
  async getBlocksByPhase(phaseId) {
    try {
      const queryText = `
        SELECT b.*, ph.name as phase_name,
               COALESCE(bs.total_units, 0) as total_units,
               COALESCE(bs.available_units, 0) as available_units,
               COALESCE(bs.sold_units, 0) as sold_units,
               COALESCE(bs.sales_percentage, 0) as occupancy_rate
        FROM blocks b
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN block_summary bs ON bs.id = b.id
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
        coordinatesX = null,
        coordinatesY = null
      } = blockData;

      const insertQuery = `
        INSERT INTO blocks (
          phase_id, name, description, coordinates_x, coordinates_y
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const result = await query(insertQuery, [
        phaseId, name, description, coordinatesX, coordinatesY
      ]);

      return this.getBlockById(result.rows[0].id);
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
        phaseId,
        name,
        description,
        coordinatesX = null,
        coordinatesY = null
      } = blockData;

      const updateQuery = `
        UPDATE blocks 
        SET phase_id = $1, name = $2, description = $3,
            coordinates_x = $4, coordinates_y = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id
      `;

      const result = await query(updateQuery, [
        phaseId, name, description, coordinatesX, coordinatesY, blockId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Block not found');
      }

      return this.getBlockById(result.rows[0].id);
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