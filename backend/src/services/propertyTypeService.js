const { query } = require('../config/database');

class PropertyTypeService {
  // Get all property types
  async getAllPropertyTypes() {
    try {
      const queryText = `
        SELECT * FROM property_types 
        WHERE is_active = true 
        ORDER BY name ASC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get property type by ID
  async getPropertyTypeById(id) {
    try {
      const queryText = `
        SELECT * FROM property_types 
        WHERE id = $1 AND is_active = true
      `;
      const result = await query(queryText, [id]);

      if (result.rows.length === 0) {
        throw new Error('Property type not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new property type (Admin only)
  async createPropertyType(propertyTypeData) {
    try {
      const { name, description } = propertyTypeData;

      const insertQuery = `
        INSERT INTO property_types (name, description)
        VALUES ($1, $2)
        RETURNING *
      `;

      const result = await query(insertQuery, [name, description]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Property type name already exists');
      }
      throw error;
    }
  }

  // Update property type (Admin only)
  async updatePropertyType(id, propertyTypeData) {
    try {
      const { name, description, is_active } = propertyTypeData;

      const updateQuery = `
        UPDATE property_types 
        SET name = $1, description = $2, is_active = $3
        WHERE id = $4
        RETURNING *
      `;

      const result = await query(updateQuery, [name, description, is_active, id]);

      if (result.rows.length === 0) {
        throw new Error('Property type not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Property type name already exists');
      }
      throw error;
    }
  }

  // Soft delete property type (Admin only)
  async deletePropertyType(id) {
    try {
      const updateQuery = `
        UPDATE property_types 
        SET is_active = false
        WHERE id = $1
        RETURNING *
      `;

      const result = await query(updateQuery, [id]);

      if (result.rows.length === 0) {
        throw new Error('Property type not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PropertyTypeService();