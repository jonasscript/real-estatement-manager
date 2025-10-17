const { query } = require('../config/database');

class RoleService {
  // Get all roles
  async getAllRoles() {
    try {
      const queryText = `
        SELECT id, name, description, created_at
        FROM roles
        ORDER BY name ASC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get role by ID
  async getRoleById(roleId) {
    try {
      const queryText = `
        SELECT id, name, description, created_at
        FROM roles
        WHERE id = $1
      `;
      const result = await query(queryText, [roleId]);

      if (result.rows.length === 0) {
        throw new Error('Role not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get role by name
  async getRoleByName(roleName) {
    try {
      const queryText = `
        SELECT id, name, description, created_at
        FROM roles
        WHERE name = $1
      `;
      const result = await query(queryText, [roleName]);

      if (result.rows.length === 0) {
        throw new Error('Role not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get roles for registration (exclude system_admin)
  async getRolesForRegistration() {
    try {
      const queryText = `
        SELECT id, name, description, created_at
        FROM roles
        WHERE name != 'system_admin'
        ORDER BY name ASC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Create new role (admin only)
  async createRole(roleData) {
    try {
      const { name, description } = roleData;

      // Check if role name already exists
      const existingRoleQuery = 'SELECT id FROM roles WHERE name = $1';
      const existingRole = await query(existingRoleQuery, [name]);

      if (existingRole.rows.length > 0) {
        throw new Error('Role name already exists');
      }

      const insertQuery = `
        INSERT INTO roles (name, description)
        VALUES ($1, $2)
        RETURNING id, name, description, created_at
      `;
      const insertResult = await query(insertQuery, [name, description]);

      return insertResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update role (admin only)
  async updateRole(roleId, updateData) {
    try {
      const { name, description } = updateData;

      // Check if new name conflicts with existing roles (excluding current role)
      if (name) {
        const existingRoleQuery = 'SELECT id FROM roles WHERE name = $1 AND id != $2';
        const existingRole = await query(existingRoleQuery, [name, roleId]);

        if (existingRole.rows.length > 0) {
          throw new Error('Role name already exists');
        }
      }

      const updateQuery = `
        UPDATE roles
        SET name = $1, description = $2
        WHERE id = $3
        RETURNING id, name, description, created_at
      `;
      const updateResult = await query(updateQuery, [name, description, roleId]);

      if (updateResult.rows.length === 0) {
        throw new Error('Role not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete role (admin only)
  async deleteRole(roleId) {
    try {
      // Check if role is being used by users
      const userCheckQuery = 'SELECT COUNT(*) as user_count FROM users WHERE role_id = $1';
      const userCheckResult = await query(userCheckQuery, [roleId]);
      const userCount = parseInt(userCheckResult.rows[0].user_count);

      if (userCount > 0) {
        throw new Error('Cannot delete role that is assigned to users');
      }

      // Remove role-menu associations first
      await query('DELETE FROM role_menu_options WHERE role_id = $1', [roleId]);

      // Then delete the role
      const deleteQuery = 'DELETE FROM roles WHERE id = $1 RETURNING id, name';
      const deleteResult = await query(deleteQuery, [roleId]);

      if (deleteResult.rows.length === 0) {
        throw new Error('Role not found');
      }

      return deleteResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get role statistics
  async getRoleStatistics() {
    try {
      const statsQuery = `
        SELECT
          r.id,
          r.name,
          r.description,
          COUNT(u.id) as user_count
        FROM roles r
        LEFT JOIN users u ON r.id = u.role_id AND u.is_active = true
        GROUP BY r.id, r.name, r.description
        ORDER BY r.name ASC
      `;
      const result = await query(statsQuery);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RoleService();