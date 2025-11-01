const { query } = require('../config/database');

class UnitService {
  // Get all units with filters
  async getAllUnits(filters = {}) {
    try {
      let queryText = `
        SELECT u.*, b.name as block_name, ph.name as phase_name,
               ps.name as status_name, ps.color as status_color,
               re.name as real_estate_name, pm.area_sqm as area,
               pm.base_price as price, pm.name as property_model_name,
               CASE WHEN c.id IS NULL THEN true ELSE false END as is_available
        FROM units u
        LEFT JOIN blocks b ON u.block_id = b.id
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN property_status ps ON u.property_status_id = ps.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        LEFT JOIN properties p ON u.id = p.unit_id
        LEFT JOIN property_models pm ON p.property_model_id = pm.id
        LEFT JOIN clients c ON p.id = c.property_id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.blockId) {
        queryText += ` AND u.block_id = $${paramIndex}`;
        queryParams.push(filters.blockId);
        paramIndex++;
      }

      if (filters.phaseId) {
        queryText += ` AND ph.id = $${paramIndex}`;
        queryParams.push(filters.phaseId);
        paramIndex++;
      }

      if (filters.realEstateId) {
        queryText += ` AND re.id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.statusId) {
        queryText += ` AND u.property_status_id = $${paramIndex}`;
        queryParams.push(filters.statusId);
        paramIndex++;
      }

      if (filters.search) {
        queryText += ` AND (u.identifier ILIKE $${paramIndex} OR u.area_notes ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY b.name ASC, u.identifier ASC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get unit by ID
  async getUnitById(unitId) {
    try {
      const queryText = `
        SELECT u.*, b.name as block_name, ph.name as phase_name,
               ps.name as status_name, ps.color as status_color,
               re.name as real_estate_name, pm.area_sqm as area,
               pm.base_price as price, pm.name as property_model_name,
               CASE WHEN c.id IS NULL THEN true ELSE false END as is_available
        FROM units u
        LEFT JOIN blocks b ON u.block_id = b.id
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN property_status ps ON u.property_status_id = ps.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        LEFT JOIN properties p ON u.id = p.unit_id
        LEFT JOIN property_models pm ON p.property_model_id = pm.id
        LEFT JOIN clients c ON p.id = c.property_id
        WHERE u.id = $1
      `;
      const result = await query(queryText, [unitId]);

      if (result.rows.length === 0) {
        throw new Error('Unit not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get units by block
  async getUnitsByBlock(blockId) {
    try {
      const queryText = `
        SELECT u.*, ps.name as status_name, ps.color as status_color,
               pm.area_sqm as area, pm.base_price as price, pm.name as property_model_name,
               CASE WHEN c.id IS NULL THEN true ELSE false END as is_available
        FROM units u
        LEFT JOIN property_status ps ON u.property_status_id = ps.id
        LEFT JOIN properties p ON u.id = p.unit_id
        LEFT JOIN property_models pm ON p.property_model_id = pm.id
        LEFT JOIN clients c ON p.id = c.property_id
        WHERE u.block_id = $1
        ORDER BY u.identifier ASC
      `;
      const result = await query(queryText, [blockId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get available units by block
  async getAvailableUnitsByBlock(blockId) {
    try {
      const queryText = `
        SELECT u.*, ps.name as status_name, ps.color as status_color,
               pm.area_sqm as area, pm.base_price as price, pm.name as property_model_name,
               CASE WHEN c.id IS NULL THEN true ELSE false END as is_available
        FROM units u
        LEFT JOIN property_status ps ON u.property_status_id = ps.id
        LEFT JOIN properties p ON u.id = p.unit_id
        LEFT JOIN property_models pm ON p.property_model_id = pm.id
        LEFT JOIN clients c ON p.id = c.property_id
        WHERE u.block_id = $1 AND ps.name = 'Disponible'
        ORDER BY u.identifier ASC
      `;
      const result = await query(queryText, [blockId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Create new unit and associated property
  async createUnit(unitData) {
    const client = await query('BEGIN');

    try {
      const {
        blockId,
        identifier,
        unitNumber,
        areaNotes,
        coordinatesX,
        coordinatesY,
        propertyStatusId = 1, // Default to 'Disponible'
        propertyModelId,
        createdBy
      } = unitData;

      // Insert unit
      const insertUnitQuery = `
        INSERT INTO units (
          block_id, identifier, unit_number,
          area_notes, coordinates_x, coordinates_y, property_status_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const unitResult = await query(insertUnitQuery, [
        blockId, identifier, unitNumber,
        areaNotes, coordinatesX, coordinatesY, propertyStatusId
      ]);

      const newUnit = unitResult.rows[0];

      // Create associated property if propertyModelId is provided
      if (propertyModelId) {
        const insertPropertyQuery = `
          INSERT INTO properties (
            property_model_id, unit_id, property_status_id, created_by
          )
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;

        await query(insertPropertyQuery, [
          propertyModelId, newUnit.id, propertyStatusId, createdBy
        ]);
      }

      await query('COMMIT');
      return newUnit;
    } catch (error) {
      await query('ROLLBACK');
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid block ID, property status ID, or property model ID');
      }
      if (error.code === '23505') { // Unique violation
        throw new Error('Unit identifier already exists in this block');
      }
      throw error;
    }
  }

  // Update unit
  async updateUnit(unitId, unitData) {
    try {
      const {
        identifier,
        unitNumber,
        areaNotes,
        coordinatesX,
        coordinatesY,
        propertyStatusId
      } = unitData;

      const updateQuery = `
        UPDATE units
        SET identifier = $1, unit_number = $2,
            area_notes = $3, coordinates_x = $4, coordinates_y = $5,
            property_status_id = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;

      const result = await query(updateQuery, [
        identifier, unitNumber, areaNotes,
        coordinatesX, coordinatesY, propertyStatusId, unitId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Unit not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid property status ID');
      }
      if (error.code === '23505') { // Unique violation
        throw new Error('Unit identifier already exists in this block');
      }
      throw error;
    }
  }

  // Update unit status
  async updateUnitStatus(unitId, statusId) {
    try {
      const updateQuery = `
        UPDATE units 
        SET property_status_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await query(updateQuery, [statusId, unitId]);

      if (result.rows.length === 0) {
        throw new Error('Unit not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid property status ID');
      }
      throw error;
    }
  }

  // Delete unit
  async deleteUnit(unitId) {
    try {
      const deleteQuery = `
        DELETE FROM units 
        WHERE id = $1
        RETURNING *
      `;

      const result = await query(deleteQuery, [unitId]);

      if (result.rows.length === 0) {
        throw new Error('Unit not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UnitService();