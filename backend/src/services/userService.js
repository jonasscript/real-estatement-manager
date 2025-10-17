const { query } = require('../config/database');
const authService = require('./authService');

class UserService {
  // Get all users with role information
  async getAllUsers(filters = {}) {
    try {
      let queryText = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
               u.role_id, r.name as role_name, u.real_estate_id,
               re.name as real_estate_name, u.is_active, u.created_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN real_estates re ON u.real_estate_id = re.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.role) {
        queryText += ` AND r.name = $${paramIndex}`;
        queryParams.push(filters.role);
        paramIndex++;
      }

      if (filters.realEstateId) {
        queryText += ` AND u.real_estate_id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.isActive !== undefined) {
        queryText += ` AND u.is_active = $${paramIndex}`;
        queryParams.push(filters.isActive);
        paramIndex++;
      }

      if (filters.search) {
        queryText += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY u.created_at DESC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID with full details
  async getUserById(userId) {
    try {
      const queryText = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
               u.role_id, r.name as role_name, u.real_estate_id,
               re.name as real_estate_name, u.is_active, u.created_at,
               u.updated_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN real_estates re ON u.real_estate_id = re.id
        WHERE u.id = $1
      `;
      const result = await query(queryText, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new user
  async createUser(userData) {
    try {
      const { email, password, firstName, lastName, phone, roleId, realEstateId } = userData;

      // Check if email already exists
      const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
      const existingUser = await query(existingUserQuery, [email]);

      if (existingUser.rows.length > 0) {
        throw new Error('Email already exists');
      }

      // Hash password
      const passwordHash = await authService.hashPassword(password);

      // Insert new user
      const insertQuery = `
        INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, real_estate_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, first_name, last_name, phone, role_id, real_estate_id, created_at
      `;
      const insertResult = await query(insertQuery, [
        email, passwordHash, firstName, lastName, phone, roleId, realEstateId
      ]);

      return insertResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update user
  async updateUser(userId, updateData) {
    try {
      const { firstName, lastName, phone, isActive, realEstateId } = updateData;

      const updateQuery = `
        UPDATE users
        SET first_name = $1, last_name = $2, phone = $3, is_active = $4, real_estate_id = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, email, first_name, last_name, phone, is_active, real_estate_id, updated_at
      `;
      const updateResult = await query(updateQuery, [
        firstName, lastName, phone, isActive, realEstateId, userId
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error('User not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete user (soft delete by setting is_active to false)
  async deleteUser(userId) {
    try {
      const queryText = `
        UPDATE users
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, email, first_name, last_name, is_active
      `;
      const result = await query(queryText, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get users by role
  async getUsersByRole(roleName) {
    try {
      const queryText = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
               u.real_estate_id, re.name as real_estate_name, u.is_active, u.created_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN real_estates re ON u.real_estate_id = re.id
        WHERE r.name = $1 AND u.is_active = true
        ORDER BY u.created_at DESC
      `;
      const result = await query(queryText, [roleName]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get real estate admins
  async getRealEstateAdmins() {
    return this.getUsersByRole('real_estate_admin');
  }

  // Get sellers
  async getSellers() {
    return this.getUsersByRole('seller');
  }

  // Get clients
  async getClients() {
    return this.getUsersByRole('client');
  }

  // Get sellers by real estate
  async getSellersByRealEstate(realEstateId) {
    try {
      const queryText = `
        SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.phone,
               u.is_active, u.created_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        JOIN clients c ON c.assigned_seller_id = u.id
        WHERE r.name = 'seller' AND u.is_active = true AND c.real_estate_id = $1
        ORDER BY u.created_at DESC
      `;
      const result = await query(queryText, [realEstateId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get clients by real estate
  async getClientsByRealEstate(realEstateId) {
    try {
      const queryText = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
               u.is_active, u.created_at, c.id as client_id,
               c.contract_signed, c.total_down_payment, c.remaining_balance,
               c.assigned_seller_id, c.property_id,
               s.id as seller_id, s.user_id as seller_user_id,
               su.first_name as seller_first_name, su.last_name as seller_last_name,
               su.email as seller_email, su.phone as seller_phone
        FROM users u
        JOIN roles r ON u.role_id = r.id
        JOIN clients c ON c.user_id = u.id
        LEFT JOIN sellers s ON c.assigned_seller_id = s.id
        LEFT JOIN users su ON s.user_id = su.id
        WHERE r.name = 'client' AND u.is_active = true AND c.real_estate_id = $1
        ORDER BY u.created_at DESC
      `;
      const result = await query(queryText, [realEstateId]);
      
      // Map the results to include seller object
      const mappedResults = result.rows.map(row => ({
        id: row.id,
        user_id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        is_active: row.is_active,
        created_at: row.created_at,
        client_id: row.client_id,
        contract_signed: row.contract_signed,
        total_down_payment: row.total_down_payment,
        remaining_balance: row.remaining_balance,
        assigned_seller_id: row.assigned_seller_id,
        property_id: row.property_id,
        assigned_seller: row.seller_id ? {
          id: row.seller_id,
          user_id: row.seller_user_id,
          first_name: row.seller_first_name,
          last_name: row.seller_last_name,
          email: row.seller_email,
          phone: row.seller_phone
        } : null
      }));
      
      return mappedResults;
    } catch (error) {
      throw error;
    }
  }

  // Assign seller to client
  async assignSellerToClient(clientId, sellerId) {
    try {
      const queryText = `
        UPDATE clients
        SET assigned_seller_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, user_id, assigned_seller_id
      `;
      const result = await query(queryText, [sellerId, clientId]);

      if (result.rows.length === 0) {
        throw new Error('Client not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get user statistics
  async getUserStatistics() {
    try {
      const statsQuery = `
        SELECT
          r.name as role,
          COUNT(u.id) as count
        FROM roles r
        LEFT JOIN users u ON r.id = u.role_id AND u.is_active = true
        GROUP BY r.id, r.name
        ORDER BY r.name
      `;
      const statsResult = await query(statsQuery);

      const totalQuery = 'SELECT COUNT(*) as total FROM users WHERE is_active = true';
      const totalResult = await query(totalQuery);

      return {
        byRole: statsResult.rows,
        total: parseInt(totalResult.rows[0].total)
      };
    } catch (error) {
      throw error;
    }
  }

  // Get users by real estate
  async getUsersByRealEstate(realEstateId) {
    try {
      const queryText = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
               u.role_id, r.name as role_name, u.is_active, u.created_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.real_estate_id = $1 AND u.is_active = true
        ORDER BY r.name, u.created_at DESC
      `;
      const result = await query(queryText, [realEstateId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get available sellers for a real estate
  async getAvailableSellers(realEstateId) {
    try {
      const queryText = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name = 'seller' AND u.real_estate_id = $1 AND u.is_active = true
        ORDER BY u.created_at DESC
      `;
      const result = await query(queryText, [realEstateId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get available clients for a real estate (role_id = 4, not already clients)
  async getAvailableClients(realEstateId) {
    try {
      const queryText = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at
        FROM users u
        WHERE u.role_id = 4 AND u.real_estate_id = $1 AND u.is_active = true
        AND u.id NOT IN (
          SELECT DISTINCT c.user_id
          FROM clients c
          WHERE c.real_estate_id = $1
        )
        ORDER BY u.created_at DESC
      `;
      const result = await query(queryText, [realEstateId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get only sellers by real estate (role_id = 3)
  async getSellersOnlyByRealEstate(realEstateId) {
    try {
      const queryText = `
        SELECT u.id, u.email, u.first_name as "firstName", u.last_name as "lastName", u.phone as "phone", u.created_at as "createdAt"
        FROM users u
        WHERE u.role_id = 3 AND u.real_estate_id = $1 AND u.is_active = true
        ORDER BY u.created_at DESC
      `;
      const result = await query(queryText, [realEstateId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get all users with seller role (role_id = 3) for a specific real estate - for seller service
  async getUsersSellersRealEstate(realEstateId) {
    try {
      const queryText = `
        SELECT u.id, u.email, 
               u.first_name as "firstName", 
               u.last_name as "lastName", 
               u.phone, 
               u.role_id,
               u.real_estate_id,
               u.is_active,
               u.created_at as "createdAt",
               u.updated_at as "updatedAt"
        FROM users u
        WHERE u.role_id = 3 AND u.real_estate_id = $1 AND u.is_active = true
        ORDER BY u.created_at DESC
      `;
      const result = await query(queryText, [realEstateId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Change user password
  async changePassword(userId, newPassword) {
    try {
      // Hash the new password using authService
      const hashedPassword = await authService.hashPassword(newPassword);

      const queryText = `
        UPDATE users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND is_active = true
        RETURNING id, email, first_name, last_name, updated_at
      `;
      
      const result = await query(queryText, [hashedPassword, userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();