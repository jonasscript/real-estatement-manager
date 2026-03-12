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

  // Get admin roles (real_estate_admin and seller)
  async getAdminRoles() {
    try {
      const queryText = `
        SELECT id, name, description, created_at
        FROM roles
        WHERE id IN (1, 2)
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

  // Get all user-role assignments
  async getAllUserRoles() {
    try {
      const queryText = `
        SELECT
          u.id as user_id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.is_active as user_active,
          r.id as role_id,
          r.name as role_name,
          r.description as role_description,
          u.created_at as assigned_at
        FROM users u
        INNER JOIN roles r ON u.role_id = r.id
        ORDER BY u.created_at DESC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get users by role
  async getUsersByRoleId(roleId) {
    try {
      const queryText = `
        SELECT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.is_active,
          u.created_at
        FROM users u
        WHERE u.role_id = $1
        ORDER BY u.first_name, u.last_name
      `;
      const result = await query(queryText, [roleId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Assign role to user
  async assignRoleToUser(userId, roleId) {
    try {
      // Check if user exists
      const userCheckQuery = 'SELECT id FROM users WHERE id = $1';
      const userCheck = await query(userCheckQuery, [userId]);
      
      if (userCheck.rows.length === 0) {
        throw new Error('User not found');
      }

      // Check if role exists
      const roleCheckQuery = 'SELECT id FROM roles WHERE id = $1';
      const roleCheck = await query(roleCheckQuery, [roleId]);
      
      if (roleCheck.rows.length === 0) {
        throw new Error('Role not found');
      }

      // Update user's role
      const updateQuery = `
        UPDATE users
        SET role_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, email, first_name, last_name, role_id
      `;
      const result = await query(updateQuery, [roleId, userId]);

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Bulk assign roles to users
  async bulkAssignRoles(assignments) {
    try {
      const results = [];
      
      for (const assignment of assignments) {
        const { userId, roleId } = assignment;
        const result = await this.assignRoleToUser(userId, roleId);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  }

  // Get role assignment history (simulated for now)
  async getRoleAssignmentStats() {
    try {
      const statsQuery = `
        SELECT
          r.id,
          r.name,
          r.description,
          COUNT(u.id) as total_users,
          COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN u.is_active = false THEN 1 END) as inactive_users
        FROM roles r
        LEFT JOIN users u ON r.id = u.role_id
        GROUP BY r.id, r.name, r.description
        ORDER BY r.name ASC
      `;
      const result = await query(statsQuery);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get available users for a specific role (users not assigned to this role)
  async getAvailableUsersForRole(roleId) {
    try {
      const queryText = `
        SELECT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.is_active,
          r.name as current_role_name,
          r.description as current_role_description
        FROM users u
        INNER JOIN roles r ON u.role_id = r.id
        WHERE u.role_id != $1 AND u.is_active = true
        ORDER BY u.first_name, u.last_name
      `;
      const result = await query(queryText, [roleId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RoleService();