const { query } = require('../config/database');

class PermissionService {
  // Get all permissions
  async getAllPermissions() {
    try {
      const queryText = `
        SELECT id, name, description, component_name, action, created_at
        FROM permissions
        ORDER BY component_name, action ASC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get permissions by role ID
  async getPermissionsByRole(roleId) {
    try {
      const queryText = `
        SELECT p.id, p.name, p.description, p.component_name, p.action
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.component_name, p.action ASC
      `;
      const result = await query(queryText, [roleId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get permissions by component and role
  async getPermissionsByComponentAndRole(componentName, roleId) {
    try {
      const queryText = `
        SELECT p.id, p.name, p.description, p.action
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE p.component_name = $1 AND rp.role_id = $2
        ORDER BY p.action ASC
      `;
      const result = await query(queryText, [componentName, roleId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Check if user has permission
  async hasPermission(userRoleId, componentName, action) {
    try {
      const queryText = `
        SELECT COUNT(*) as count
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1 AND p.component_name = $2 AND p.action = $3
      `;
      const result = await query(queryText, [userRoleId, componentName, action]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get permission by ID
  async getPermissionById(permissionId) {
    try {
      const queryText = `
        SELECT id, name, description, component_name, action, created_at
        FROM permissions
        WHERE id = $1
      `;
      const result = await query(queryText, [permissionId]);

      if (result.rows.length === 0) {
        throw new Error('Permission not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new permission (admin only)
  async createPermission(permissionData) {
    try {
      const { name, description, componentName, action } = permissionData;

      // Check if permission name already exists
      const existingPermissionQuery = 'SELECT id FROM permissions WHERE name = $1';
      const existingPermission = await query(existingPermissionQuery, [name]);

      if (existingPermission.rows.length > 0) {
        throw new Error('Permission name already exists');
      }

      const insertQuery = `
        INSERT INTO permissions (name, description, component_name, action)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, component_name, action, created_at
      `;
      const insertResult = await query(insertQuery, [name, description, componentName, action]);

      return insertResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update permission (admin only)
  async updatePermission(permissionId, updateData) {
    try {
      const { name, description, componentName, action } = updateData;

      // Check if new name conflicts with existing permissions (excluding current permission)
      if (name) {
        const existingPermissionQuery = 'SELECT id FROM permissions WHERE name = $1 AND id != $2';
        const existingPermission = await query(existingPermissionQuery, [name, permissionId]);

        if (existingPermission.rows.length > 0) {
          throw new Error('Permission name already exists');
        }
      }

      const updateQuery = `
        UPDATE permissions
        SET name = $1, description = $2, component_name = $3, action = $4
        WHERE id = $5
        RETURNING id, name, description, component_name, action, created_at
      `;
      const updateResult = await query(updateQuery, [name, description, componentName, action, permissionId]);

      if (updateResult.rows.length === 0) {
        throw new Error('Permission not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete permission (admin only)
  async deletePermission(permissionId) {
    try {
      // Check if permission is being used by roles
      const roleCheckQuery = 'SELECT COUNT(*) as role_count FROM role_permissions WHERE permission_id = $1';
      const roleCheckResult = await query(roleCheckQuery, [permissionId]);
      const roleCount = parseInt(roleCheckResult.rows[0].role_count);

      if (roleCount > 0) {
        throw new Error('Cannot delete permission that is assigned to roles');
      }

      // Remove permission-role associations first
      await query('DELETE FROM role_permissions WHERE permission_id = $1', [permissionId]);

      // Then delete the permission
      const deleteQuery = 'DELETE FROM permissions WHERE id = $1 RETURNING id, name';
      const deleteResult = await query(deleteQuery, [permissionId]);

      if (deleteResult.rows.length === 0) {
        throw new Error('Permission not found');
      }

      return deleteResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Assign permission to role
  async assignPermissionToRole(roleId, permissionId) {
    try {
      // Check if assignment already exists
      const existingQuery = 'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2';
      const existing = await query(existingQuery, [roleId, permissionId]);

      if (existing.rows.length > 0) {
        throw new Error('Permission already assigned to this role');
      }

      const insertQuery = `
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        RETURNING id, role_id, permission_id, created_at
      `;
      const result = await query(insertQuery, [roleId, permissionId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Remove permission from role
  async removePermissionFromRole(roleId, permissionId) {
    try {
      const deleteQuery = 'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2 RETURNING id';
      const result = await query(deleteQuery, [roleId, permissionId]);

      if (result.rows.length === 0) {
        throw new Error('Permission not assigned to this role');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PermissionService();