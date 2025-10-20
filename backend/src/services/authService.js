const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

class AuthService {
  // Hash password
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Generate JWT token
  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'dsdsd',
      { expiresIn: '1h' } // <-- aquí defines la expiración
    );
  }

  // Authenticate user login
  async authenticateUser(email, password) {
    try {
      // Get user with role information and real estate
      const userQuery = `
        SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name,
               u.role_id, r.name as role_name, u.is_active, u.real_estate_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN clients c ON u.id = c.user_id
        WHERE u.email = $1
      `;
      const userResult = await query(userQuery, [email]);

      if (userResult.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(
        password,
        user.password_hash
      );
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Generate token
      const token = this.generateToken(user.id);

      // Return user data (excluding password)
      const { password_hash, ...userData } = user;

      return {
        user: {
          ...userData,
          real_estate_id: user.real_estate_id || null,
        },
        token,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const userQuery = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
               u.role_id, r.name as role_name, u.is_active, u.created_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
      `;
      const userResult = await query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      return userResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new user
  async createUser(userData) {
    try {
      const { email, password, firstName, lastName, phone, roleId } = userData;

      // Check if email already exists
      const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
      const existingUser = await query(existingUserQuery, [email]);

      if (existingUser.rows.length > 0) {
        throw new Error('Email already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Insert new user
      const insertQuery = `
        INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, first_name, last_name, phone, role_id, created_at
      `;
      const insertResult = await query(insertQuery, [
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        roleId,
      ]);

      return insertResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update user
  async updateUser(userId, updateData) {
    try {
      const { firstName, lastName, phone, isActive } = updateData;

      const updateQuery = `
        UPDATE users
        SET first_name = $1, last_name = $2, phone = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, email, first_name, last_name, phone, is_active, updated_at
      `;
      const updateResult = await query(updateQuery, [
        firstName,
        lastName,
        phone,
        isActive,
        userId,
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error('User not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get current password hash
      const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
      const userResult = await query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(
        currentPassword,
        userResult.rows[0].password_hash
      );
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      const updateQuery =
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
      await query(updateQuery, [newPasswordHash, userId]);

      return { message: 'Password changed successfully' };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();
