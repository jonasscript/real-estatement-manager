const { query } = require('../config/database');

class PropertyService {
  getPayloadValue(payload, camelCaseKey, snakeCaseKey) {
    if (payload[camelCaseKey] !== undefined) {
      return payload[camelCaseKey];
    }

    if (snakeCaseKey && payload[snakeCaseKey] !== undefined) {
      return payload[snakeCaseKey];
    }

    return undefined;
  }

  normalizeDecimal(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : value;
    }

    if (typeof value === 'string') {
      const normalizedValue = value.trim().replace(',', '.');
      if (!normalizedValue) {
        return null;
      }

      const parsed = Number(normalizedValue);
      return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  normalizeInteger(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? value : Math.trunc(value);
    }

    const parsed = Number.parseInt(String(value).trim(), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  normalizeText(value) {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = String(value).trim();
    return normalized || null;
  }

  normalizeSaleStatus(value) {
    const normalized = this.normalizeText(value)?.toLowerCase();
    if (!normalized) {
      return null;
    }

    const statusMap = {
      available: 'available',
      disponible: 'available',
      reserved: 'reserved',
      reservado: 'reserved',
      sold: 'sold',
      vendido: 'sold',
      comprado: 'sold'
    };

    return statusMap[normalized] || null;
  }

  async findPropertyIdByUnitId(unitId) {
    const result = await query(
      'SELECT id FROM properties WHERE unit_id = $1 ORDER BY created_at DESC LIMIT 1',
      [unitId]
    );

    if (!result.rows.length) {
      return null;
    }

    return result.rows[0].id;
  }

  // Get all properties using direct joins instead of view
  async getAllProperties(filters = {}) {
    try {
      console.log('Getting all properties with filters:', filters);
      let queryText = `
        SELECT
          p.id,
          p.property_model_id,
          p.unit_id,
          p.property_status_id,
          p.sale_status,
          p.land_area_sqm,
          p.custom_price,
          p.custom_down_payment_percentage,
          p.custom_installments,
          p.created_by,
          pm.name as model_name,
          pt.name as property_type,
          u.identifier as unit_identifier,
          u.unit_number,
          b.name as block_name,
          ph.name as phase_name,
          pht.name as phase_type,
          re.name as real_estate_name,
          ps.name as construction_status,
          ps.color as construction_status_color,
          CASE p.sale_status
            WHEN 'reserved' THEN 'Reservado'
            WHEN 'sold' THEN 'Vendido'
            ELSE 'Disponible'
          END as status,
          CASE p.sale_status
            WHEN 'reserved' THEN '#ffc107'
            WHEN 'sold' THEN '#dc3545'
            ELSE '#28a745'
          END as status_color,
          p.custom_price as final_price,
          p.custom_down_payment_percentage as final_down_payment_percentage,
          p.custom_installments as final_installments,
          CASE
            WHEN p.custom_price IS NOT NULL
              AND p.custom_down_payment_percentage IS NOT NULL
              AND p.custom_installments IS NOT NULL
              AND p.custom_installments > 0
            THEN (p.custom_price * p.custom_down_payment_percentage / 100.0) / p.custom_installments
            ELSE NULL
          END as final_installment_amount,
          pm.area_sqm,
          pm.bedrooms,
          pm.bathrooms,
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
          p.property_model_id,
          p.unit_id,
          p.property_status_id,
          p.sale_status,
          p.land_area_sqm,
          p.custom_price,
          p.custom_down_payment_percentage,
          p.custom_installments,
          p.created_by,
          pm.name as model_name,
          pt.name as property_type,
          u.identifier as unit_identifier,
          u.unit_number,
          b.name as block_name,
          ph.name as phase_name,
          pht.name as phase_type,
          re.name as real_estate_name,
          ps.name as construction_status,
          ps.color as construction_status_color,
          CASE p.sale_status
            WHEN 'reserved' THEN 'Reservado'
            WHEN 'sold' THEN 'Vendido'
            ELSE 'Disponible'
          END as status,
          CASE p.sale_status
            WHEN 'reserved' THEN '#ffc107'
            WHEN 'sold' THEN '#dc3545'
            ELSE '#28a745'
          END as status_color,
          p.custom_price as final_price,
          p.custom_down_payment_percentage as final_down_payment_percentage,
          p.custom_installments as final_installments,
          CASE
            WHEN p.custom_price IS NOT NULL
              AND p.custom_down_payment_percentage IS NOT NULL
              AND p.custom_installments IS NOT NULL
              AND p.custom_installments > 0
            THEN (p.custom_price * p.custom_down_payment_percentage / 100.0) / p.custom_installments
            ELSE NULL
          END as final_installment_amount,
          pm.area_sqm,
          pm.bedrooms,
          pm.bathrooms,
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
      const propertyModelId = this.normalizeInteger(this.getPayloadValue(propertyData, 'propertyModelId', 'property_model_id'));
      const unitId = this.normalizeInteger(this.getPayloadValue(propertyData, 'unitId', 'unit_id'));
      const propertyStatusId = this.normalizeInteger(this.getPayloadValue(propertyData, 'propertyStatusId', 'property_status_id')) || 1;
      const saleStatus = this.normalizeSaleStatus(this.getPayloadValue(propertyData, 'saleStatus', 'sale_status')) || 'available';
      const landAreaSqm = this.normalizeDecimal(this.getPayloadValue(propertyData, 'landAreaSqm', 'land_area_sqm'));
      const customPrice = this.normalizeDecimal(this.getPayloadValue(propertyData, 'customPrice', 'custom_price'));
      const customDownPaymentPercentage = this.normalizeDecimal(this.getPayloadValue(propertyData, 'customDownPaymentPercentage', 'custom_down_payment_percentage'));
      const customInstallments = this.normalizeInteger(this.getPayloadValue(propertyData, 'customInstallments', 'custom_installments'));
      const notes = this.normalizeText(this.getPayloadValue(propertyData, 'notes', 'notes'));

      const insertQuery = `
        INSERT INTO properties (
          property_model_id, unit_id, property_status_id, sale_status, land_area_sqm,
          custom_price, custom_down_payment_percentage, custom_installments, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await query(insertQuery, [
        propertyModelId, unitId, propertyStatusId, saleStatus, landAreaSqm,
        customPrice, customDownPaymentPercentage, customInstallments,
        notes, createdBy
      ]);

      const createdProperty = await this.getPropertyById(result.rows[0].id);
      return {
        property: createdProperty,
        created: true
      };
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid property model ID, unit ID, or property status ID');
      }
      if (error.code === '23505') { // Unique violation
        const unitId = this.normalizeInteger(this.getPayloadValue(propertyData, 'unitId', 'unit_id'));

        if (unitId) {
          const existingPropertyId = await this.findPropertyIdByUnitId(unitId);

          if (existingPropertyId) {
            const existingProperty = await this.getPropertyById(existingPropertyId);
            return {
              property: existingProperty,
              created: false
            };
          }
        }

        throw new Error('This unit already has a property assigned');
      }
      throw error;
    }
  }

  // Update property (new structure)
  async updateProperty(propertyId, updateData) {
    try {
      const propertyModelId = this.normalizeInteger(this.getPayloadValue(updateData, 'propertyModelId', 'property_model_id'));
      const unitId = this.normalizeInteger(this.getPayloadValue(updateData, 'unitId', 'unit_id'));
      const propertyStatusId = this.normalizeInteger(this.getPayloadValue(updateData, 'propertyStatusId', 'property_status_id'));
      const saleStatus = this.normalizeSaleStatus(this.getPayloadValue(updateData, 'saleStatus', 'sale_status'));
      const landAreaSqm = this.normalizeDecimal(this.getPayloadValue(updateData, 'landAreaSqm', 'land_area_sqm'));
      const customPrice = this.normalizeDecimal(this.getPayloadValue(updateData, 'customPrice', 'custom_price'));
      const customDownPaymentPercentage = this.normalizeDecimal(this.getPayloadValue(updateData, 'customDownPaymentPercentage', 'custom_down_payment_percentage'));
      const customInstallments = this.normalizeInteger(this.getPayloadValue(updateData, 'customInstallments', 'custom_installments'));
      const notes = this.normalizeText(this.getPayloadValue(updateData, 'notes', 'notes'));

      const updateQuery = `
        UPDATE properties
        SET property_model_id = COALESCE($1, property_model_id),
            unit_id = COALESCE($2, unit_id),
            property_status_id = COALESCE($3, property_status_id),
            sale_status = COALESCE($4, sale_status),
            land_area_sqm = $5,
            custom_price = $6,
            custom_down_payment_percentage = $7,
            custom_installments = $8,
            notes = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING id
      `;
      
      const result = await query(updateQuery, [
        propertyModelId, unitId, propertyStatusId, saleStatus, landAreaSqm,
        customPrice, customDownPaymentPercentage, customInstallments,
        notes, propertyId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Property not found');
      }

      return this.getPropertyById(result.rows[0].id);
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
          p.sale_status,
          pm.name as model_name,
          pt.name as property_type,
          u.identifier as unit_identifier,
          u.unit_number,
          b.name as block_name,
          ph.name as phase_name,
          pht.name as phase_type,
          re.name as real_estate_name,
          ps.name as construction_status,
          ps.color as construction_status_color,
          CASE p.sale_status
            WHEN 'reserved' THEN 'Reservado'
            WHEN 'sold' THEN 'Vendido'
            ELSE 'Disponible'
          END as status,
          CASE p.sale_status
            WHEN 'reserved' THEN '#ffc107'
            WHEN 'sold' THEN '#dc3545'
            ELSE '#28a745'
          END as status_color,
          p.land_area_sqm,
          p.custom_price as final_price,
          p.custom_down_payment_percentage as final_down_payment_percentage,
          p.custom_installments as final_installments,
          CASE
            WHEN p.custom_price IS NOT NULL
              AND p.custom_down_payment_percentage IS NOT NULL
              AND p.custom_installments IS NOT NULL
              AND p.custom_installments > 0
            THEN (p.custom_price * p.custom_down_payment_percentage / 100.0) / p.custom_installments
            ELSE NULL
          END as final_installment_amount,
          pm.area_sqm,
          pm.bedrooms,
          pm.bathrooms,
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
        WHERE p.sale_status = 'available'
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
        whereClause = 'WHERE re.id = $1';
        params = [realEstateId];
      }

      const statsQuery = `
        SELECT
          COUNT(*) as total_properties,
          COUNT(CASE WHEN p.sale_status = 'available' THEN 1 END) as available_properties,
          COUNT(CASE WHEN p.sale_status = 'sold' THEN 1 END) as sold_properties,
          COUNT(CASE WHEN p.sale_status = 'reserved' THEN 1 END) as reserved_properties,
          COUNT(CASE WHEN ps.name = 'En Construcción' THEN 1 END) as under_construction_properties,
          AVG(p.custom_price) as average_price
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
