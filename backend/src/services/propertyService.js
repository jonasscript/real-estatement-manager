const { query } = require('../config/database');

class PropertyService {
  // Get all properties using direct joins instead of view
  async getAllProperties(filters = {}) {
    try {
      console.log('Getting all properties with filters:', filters);
      let queryText = `
        SELECT
          p.id,
          pm.name as model_name,
          pt.name as property_type,
          u.identifier as unit_identifier,
          u.unit_number,
          b.name as block_name,
          ph.name as phase_name,
          pht.name as phase_type,
          re.name as real_estate_name,
          ps.name as status,
          ps.color as status_color,
          COALESCE(p.custom_price, pm.base_price) as final_price,
          COALESCE(p.custom_down_payment_percentage, pm.down_payment_percentage) as final_down_payment_percentage,
          COALESCE(p.custom_installments, pm.total_installments) as final_installments,
          COALESCE(p.custom_installment_amount, pm.installment_amount) as final_installment_amount,
          pm.area_sqm,
          pm.bedrooms,
          pm.bathrooms,
          pm.parking_spaces,
          pm.features,
          p.notes,
          CONCAT(b.name, ' - ', u.identifier) as full_location,
          p.created_at,
          p.updated_at
        FROM properties p
        LEFT JOIN property_models pm ON p.property_model_id = pm.id
        LEFT JOIN property_types pt ON pm.property_type_id = pt.id
        LEFT JOIN units u ON p.unit_id = u.id
        LEFT JOIN blocks b ON u.block_id = b.id
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        LEFT JOIN property_status ps ON p.property_status_id = ps.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.realEstateId) {
        queryText += ` AND re.id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.propertyTypeId) {
        queryText += ` AND pt.id = $${paramIndex}`;
        queryParams.push(filters.propertyTypeId);
        paramIndex++;
      }

      if (filters.statusId) {
        queryText += ` AND ps.id = $${paramIndex}`;
        queryParams.push(filters.statusId);
        paramIndex++;
      }

      if (filters.phaseId) {
        queryText += ` AND ph.id = $${paramIndex}`;
        queryParams.push(filters.phaseId);
        paramIndex++;
      }

      if (filters.blockId) {
        queryText += ` AND b.id = $${paramIndex}`;
        queryParams.push(filters.blockId);
        paramIndex++;
      }

      if (filters.search) {
        queryText += ` AND (pm.name ILIKE $${paramIndex} OR u.identifier ILIKE $${paramIndex} OR b.name ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY p.created_at DESC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Error in getAllProperties:', error);
      throw error;
    }
  }

  // Get property by ID using direct joins
  async getPropertyById(propertyId) {
    try {
      const queryText = `
        SELECT
          p.id,
          pm.name as model_name,
          pt.name as property_type,
          u.identifier as unit_identifier,
          u.unit_number,
          b.name as block_name,
          ph.name as phase_name,
          pht.name as phase_type,
          re.name as real_estate_name,
          ps.name as status,
          ps.color as status_color,
          COALESCE(p.custom_price, pm.base_price) as final_price,
          COALESCE(p.custom_down_payment_percentage, pm.down_payment_percentage) as final_down_payment_percentage,
          COALESCE(p.custom_installments, pm.total_installments) as final_installments,
          COALESCE(p.custom_installment_amount, pm.installment_amount) as final_installment_amount,
          pm.area_sqm,
          pm.bedrooms,
          pm.bathrooms,
          pm.parking_spaces,
          pm.features,
          p.notes,
          CONCAT(b.name, ' - ', u.identifier) as full_location,
          p.created_at,
          p.updated_at
        FROM properties p
        LEFT JOIN property_models pm ON p.property_model_id = pm.id
        LEFT JOIN property_types pt ON pm.property_type_id = pt.id
        LEFT JOIN units u ON p.unit_id = u.id
        LEFT JOIN blocks b ON u.block_id = b.id
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        LEFT JOIN property_status ps ON p.property_status_id = ps.id
        WHERE p.id = $1
      `;
      const result = await query(queryText, [propertyId]);

      if (result.rows.length === 0) {
        throw new Error('Property not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error in getPropertyById:', error);
      throw error;
    }
  }

  // Create new property (now requires property_model_id and unit_id)
  async createProperty(propertyData, createdBy) {
    try {
      const {
        propertyModelId,
        unitId,
        propertyStatusId = 1, // Default to 'Disponible'
        customPrice,
        customDownPaymentPercentage,
        customInstallments,
        customInstallmentAmount,
        notes
      } = propertyData;

      const insertQuery = `
        INSERT INTO properties (
          property_model_id, unit_id, property_status_id, custom_price,
          custom_down_payment_percentage, custom_installments, 
          custom_installment_amount, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await query(insertQuery, [
        propertyModelId, unitId, propertyStatusId, customPrice,
        customDownPaymentPercentage, customInstallments,
        customInstallmentAmount, notes, createdBy
      ]);

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid property model ID, unit ID, or property status ID');
      }
      if (error.code === '23505') { // Unique violation
        throw new Error('This unit already has a property assigned');
      }
      throw error;
    }
  }

  // Update property (new structure)
  async updateProperty(propertyId, updateData) {
    try {
      const {
        propertyStatusId,
        customPrice,
        customDownPaymentPercentage,
        customInstallments,
        customInstallmentAmount,
        notes
      } = updateData;

      const updateQuery = `
        UPDATE properties
        SET property_status_id = COALESCE($1, property_status_id),
            custom_price = $2,
            custom_down_payment_percentage = $3,
            custom_installments = $4,
            custom_installment_amount = $5,
            notes = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;
      
      const result = await query(updateQuery, [
        propertyStatusId, customPrice, customDownPaymentPercentage,
        customInstallments, customInstallmentAmount, notes, propertyId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Property not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid property status ID');
      }
      throw error;
    }
  }

  // Delete property
  async deleteProperty(propertyId) {
    try {
      // Check if property has associated clients
      const checkQuery = 'SELECT COUNT(*) as client_count FROM clients WHERE property_id = $1';
      const checkResult = await query(checkQuery, [propertyId]);
      const clientCount = Number.parseInt(checkResult.rows[0].client_count);

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
      console.error('Error in deleteProperty:', error);
      throw error;
    }
  }

  // Get properties by real estate using new structure
  async getPropertiesByRealEstate(realEstateId) {
    try {
      return this.getAllProperties({ realEstateId });
    } catch (error) {
      console.error('Error in getPropertiesByRealEstate:', error);
      throw error;
    }
  }

  // Get available properties
  async getAvailableProperties() {
    try {
      const queryText = `
        SELECT
          p.id,
          pm.name as model_name,
          pt.name as property_type,
          u.identifier as unit_identifier,
          u.unit_number,
          b.name as block_name,
          ph.name as phase_name,
          pht.name as phase_type,
          re.name as real_estate_name,
          ps.name as status,
          ps.color as status_color,
          COALESCE(p.custom_price, pm.base_price) as final_price,
          COALESCE(p.custom_down_payment_percentage, pm.down_payment_percentage) as final_down_payment_percentage,
          COALESCE(p.custom_installments, pm.total_installments) as final_installments,
          COALESCE(p.custom_installment_amount, pm.installment_amount) as final_installment_amount,
          pm.area_sqm,
          pm.bedrooms,
          pm.bathrooms,
          pm.parking_spaces,
          pm.features,
          p.notes,
          CONCAT(b.name, ' - ', u.identifier) as full_location,
          p.created_at,
          p.updated_at
        FROM properties p
        LEFT JOIN property_models pm ON p.property_model_id = pm.id
        LEFT JOIN property_types pt ON pm.property_type_id = pt.id
        LEFT JOIN units u ON p.unit_id = u.id
        LEFT JOIN blocks b ON u.block_id = b.id
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        LEFT JOIN property_status ps ON p.property_status_id = ps.id
        WHERE ps.name = 'Disponible'
        ORDER BY p.created_at DESC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      console.error('Error in getAvailableProperties:', error);
      throw error;
    }
  }

  // Get properties by phase
  async getPropertiesByPhase(phaseId) {
    try {
      return this.getAllProperties({ phaseId });
    } catch (error) {
      console.error('Error in getPropertiesByPhase:', error);
      throw error;
    }
  }

  // Get properties by block
  async getPropertiesByBlock(blockId) {
    try {
      return this.getAllProperties({ blockId });
    } catch (error) {
      console.error('Error in getPropertiesByBlock:', error);
      throw error;
    }
  }

  // Search properties
  async searchProperties(searchTerm) {
    try {
      return this.getAllProperties({ search: searchTerm });
    } catch (error) {
      console.error('Error in searchProperties:', error);
      throw error;
    }
  }

  // Get property statistics using new structure
  async getPropertyStatistics(realEstateId = null) {
    try {
      let whereClause = '';
      let params = [];

      if (realEstateId) {
        whereClause = 'WHERE real_estate_name = (SELECT name FROM real_estates WHERE id = $1)';
        params = [realEstateId];
      }

      const statsQuery = `
        SELECT
          COUNT(*) as total_properties,
          COUNT(CASE WHEN ps.name = 'Disponible' THEN 1 END) as available_properties,
          COUNT(CASE WHEN ps.name = 'Vendido' THEN 1 END) as sold_properties,
          COUNT(CASE WHEN ps.name = 'Reservado' THEN 1 END) as reserved_properties,
          COUNT(CASE WHEN ps.name = 'En Construcción' THEN 1 END) as under_construction_properties,
          AVG(COALESCE(p.custom_price, pm.base_price)) as average_price
        FROM properties p
        LEFT JOIN property_models pm ON p.property_model_id = pm.id
        LEFT JOIN units u ON p.unit_id = u.id
        LEFT JOIN blocks b ON u.block_id = b.id
        LEFT JOIN phases ph ON b.phase_id = ph.id
        LEFT JOIN real_estates re ON ph.real_estate_id = re.id
        LEFT JOIN property_status ps ON p.property_status_id = ps.id
        ${whereClause}
      `;

      const result = await query(statsQuery, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getPropertyStatistics:', error);
      throw error;
    }
  }

  // Update property status
  async updatePropertyStatus(propertyId, statusId) {
    try {
      const updateQuery = `
        UPDATE properties 
        SET property_status_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await query(updateQuery, [statusId, propertyId]);

      if (result.rows.length === 0) {
        throw new Error('Property not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid property status ID');
      }
      throw error;
    }
  }
}

module.exports = new PropertyService();