const { query } = require('../config/database');

class PropertyModelService {
  // Get all property models with filters
  async getAllPropertyModels(filters = {}) {
    try {
      let queryText = `
        SELECT pm.*, pt.name as property_type_name, re.name as real_estate_name
        FROM property_models pm
        LEFT JOIN property_types pt ON pm.property_type_id = pt.id
        LEFT JOIN real_estates re ON pm.real_estate_id = re.id
        WHERE pm.is_active = true
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.realEstateId) {
        queryText += ` AND pm.real_estate_id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.propertyTypeId) {
        queryText += ` AND pm.property_type_id = $${paramIndex}`;
        queryParams.push(filters.propertyTypeId);
        paramIndex++;
      }

      if (filters.search) {
        queryText += ` AND (pm.name ILIKE $${paramIndex} OR pm.description ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY pm.created_at DESC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get property model by ID
  async getPropertyModelById(modelId) {
    try {
      const queryText = `
        SELECT pm.*, pt.name as property_type_name, re.name as real_estate_name
        FROM property_models pm
        LEFT JOIN property_types pt ON pm.property_type_id = pt.id
        LEFT JOIN real_estates re ON pm.real_estate_id = re.id
        WHERE pm.id = $1 AND pm.is_active = true
      `;
      const result = await query(queryText, [modelId]);

      if (result.rows.length === 0) {
        throw new Error('Property model not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get property models by real estate
  async getPropertyModelsByRealEstate(realEstateId) {
    try {
      const queryText = `
        SELECT pm.*, pt.name as property_type_name
        FROM property_models pm
        LEFT JOIN property_types pt ON pm.property_type_id = pt.id
        WHERE pm.real_estate_id = $1 AND pm.is_active = true
        ORDER BY pm.name ASC
      `;
      const result = await query(queryText, [realEstateId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Create new property model
  async createPropertyModel(modelData, createdBy = null) {
    try {
      const {
        realEstateId,
        propertyTypeId,
        name,
        description,
        areaSqm,
        bedrooms,
        bathrooms,
        parkingSpaces = 0,
        features = [],
        basePrice,
        downPaymentPercentage,
        totalInstallments,
        floorPlanUrl
      } = modelData;

      // Calculate installment amount only if both downPaymentPercentage and totalInstallments are provided
      let installmentAmount = null;
      if (downPaymentPercentage !== undefined && downPaymentPercentage !== null && 
          totalInstallments !== undefined && totalInstallments !== null) {
        const downPaymentAmount = (basePrice * downPaymentPercentage) / 100;
        const remainingAmount = basePrice - downPaymentAmount;
        installmentAmount = remainingAmount / totalInstallments;
      }

      const insertQuery = `
        INSERT INTO property_models (
          real_estate_id, property_type_id, name, description, area_sqm,
          bedrooms, bathrooms, parking_spaces, features, base_price,
          down_payment_percentage, total_installments, installment_amount,
          floor_plan_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await query(insertQuery, [
        realEstateId, propertyTypeId, name, description, areaSqm,
        bedrooms, bathrooms, parkingSpaces, features, basePrice,
        downPaymentPercentage, totalInstallments, installmentAmount,
        floorPlanUrl
      ]);

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid real estate ID or property type ID');
      }
      throw error;
    }
  }

  // Update property model
  async updatePropertyModel(modelId, modelData) {
    try {
      const {
        propertyTypeId,
        name,
        description,
        areaSqm,
        bedrooms,
        bathrooms,
        parkingSpaces,
        features,
        basePrice,
        downPaymentPercentage,
        totalInstallments,
        floorPlanUrl
      } = modelData;

      // Calculate installment amount only if both downPaymentPercentage and totalInstallments are provided
      let installmentAmount = null;
      if (downPaymentPercentage !== undefined && downPaymentPercentage !== null && 
          totalInstallments !== undefined && totalInstallments !== null) {
        const downPaymentAmount = (basePrice * downPaymentPercentage) / 100;
        const remainingAmount = basePrice - downPaymentAmount;
        installmentAmount = remainingAmount / totalInstallments;
      }

      const updateQuery = `
        UPDATE property_models 
        SET property_type_id = $1, name = $2, description = $3, area_sqm = $4,
            bedrooms = $5, bathrooms = $6, parking_spaces = $7, features = $8,
            base_price = $9, down_payment_percentage = $10, total_installments = $11,
            installment_amount = $12, floor_plan_url = $13, updated_at = CURRENT_TIMESTAMP
        WHERE id = $14 AND is_active = true
        RETURNING *
      `;

      const result = await query(updateQuery, [
        propertyTypeId, name, description, areaSqm, bedrooms, bathrooms,
        parkingSpaces, features, basePrice, downPaymentPercentage,
        totalInstallments, installmentAmount, floorPlanUrl, modelId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Property model not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid property type ID');
      }
      throw error;
    }
  }

  // Soft delete property model
  async deletePropertyModel(modelId) {
    try {
      const updateQuery = `
        UPDATE property_models 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await query(updateQuery, [modelId]);

      if (result.rows.length === 0) {
        throw new Error('Property model not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PropertyModelService();