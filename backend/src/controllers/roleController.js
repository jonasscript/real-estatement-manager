const roleService = require('../services/roleService');
const { validationResult } = require('express-validator');

class RoleController {
  // Get all roles
  async getAllRoles(req, res) {
    try {
      const roles = await roleService.getAllRoles();

      res.json({
        message: 'Roles retrieved successfully',
        data: roles,
        count: roles.length
      });
    } catch (error) {
      console.error('Get all roles error:', error);
      res.status(500).json({
        error: 'Failed to retrieve roles'
      });
    }
  }

  // Get roles for registration (exclude system_admin)
  async getRolesForRegistration(req, res) {
    try {
      const roles = await roleService.getRolesForRegistration();

      res.json({
        message: 'Registration roles retrieved successfully',
        data: roles,
        count: roles.length
      });
    } catch (error) {
      console.error('Get registration roles error:', error);
      res.status(500).json({
        error: 'Failed to retrieve registration roles'
      });
    }
  }

  // Get admin roles (real_estate_admin and seller)
  async getAdminRoles(req, res) {
    try {
      const roles = await roleService.getAdminRoles();

      res.json({
        message: 'Admin roles retrieved successfully',
        data: roles,
        count: roles.length
      });
    } catch (error) {
      console.error('Get admin roles error:', error);
      res.status(500).json({
        error: 'Failed to retrieve admin roles'
      });
    }
  }

  // Get role by ID
  async getRoleById(req, res) {
    try {
      const { roleId } = req.params;
      const role = await roleService.getRoleById(roleId);

      res.json({
        message: 'Role retrieved successfully',
        data: role
      });
    } catch (error) {
      console.error('Get role by ID error:', error);
      res.status(error.message === 'Role not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve role'
      });
    }
  }

  // Create new role (admin only)
  async createRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const roleData = req.body;
      const newRole = await roleService.createRole(roleData);

      res.status(201).json({
        message: 'Role created successfully',
        data: newRole
      });
    } catch (error) {
      console.error('Create role error:', error);
      res.status(error.message === 'Role name already exists' ? 409 : 500).json({
        error: error.message || 'Failed to create role'
      });
    }
  }

  // Update role (admin only)
  async updateRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { roleId } = req.params;
      const updateData = req.body;

      const updatedRole = await roleService.updateRole(roleId, updateData);

      res.json({
        message: 'Role updated successfully',
        data: updatedRole
      });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(error.message === 'Role not found' || error.message === 'Role name already exists' ? 400 : 500).json({
        error: error.message || 'Failed to update role'
      });
    }
  }

  // Delete role (admin only)
  async deleteRole(req, res) {
    try {
      const { roleId } = req.params;
      const deletedRole = await roleService.deleteRole(roleId);

      res.json({
        message: 'Role deleted successfully',
        data: deletedRole
      });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(error.message.includes('Cannot delete') ? 409 : error.message === 'Role not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete role'
      });
    }
  }

  // Get role statistics (admin only)
  async getRoleStatistics(req, res) {
    try {
      const statistics = await roleService.getRoleStatistics();

      res.json({
        message: 'Role statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      console.error('Get role statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve role statistics'
      });
    }
  }

  // Get all user-role assignments (admin only)
  async getAllUserRoles(req, res) {
    try {
      const userRoles = await roleService.getAllUserRoles();

      res.json({
        message: 'User-role assignments retrieved successfully',
        data: userRoles,
        count: userRoles.length
      });
    } catch (error) {
      console.error('Get user-role assignments error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user-role assignments'
      });
    }
  }

  // Get users by role ID (admin only)
  async getUsersByRoleId(req, res) {
    try {
      const { roleId } = req.params;
      const users = await roleService.getUsersByRoleId(roleId);

      res.json({
        message: 'Users retrieved successfully',
        data: users,
        count: users.length
      });
    } catch (error) {
      console.error('Get users by role error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users'
      });
    }
  }

  // Assign role to user (admin only)
  async assignRoleToUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId, roleId } = req.body;
      const updatedUser = await roleService.assignRoleToUser(userId, roleId);

      res.json({
        message: 'Role assigned to user successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Assign role to user error:', error);
      res.status(
        error.message === 'User not found' || error.message === 'Role not found' ? 404 : 500
      ).json({
        error: error.message || 'Failed to assign role'
      });
    }
  }

  // Bulk assign roles (admin only)
  async bulkAssignRoles(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { assignments } = req.body;
      const results = await roleService.bulkAssignRoles(assignments);

      res.json({
        message: 'Roles assigned successfully',
        data: results,
        count: results.length
      });
    } catch (error) {
      console.error('Bulk assign roles error:', error);
      res.status(500).json({
        error: error.message || 'Failed to bulk assign roles'
      });
    }
  }

  // Get role assignment statistics (admin only)
  async getRoleAssignmentStats(req, res) {
    try {
      const stats = await roleService.getRoleAssignmentStats();

      res.json({
        message: 'Role assignment statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Get role assignment stats error:', error);
      res.status(500).json({
        error: 'Failed to retrieve role assignment statistics'
      });
    }
  }

  // Get available users for a specific role (admin only)
  async getAvailableUsersForRole(req, res) {
    try {
      const { roleId } = req.params;
      const users = await roleService.getAvailableUsersForRole(roleId);

      res.json({
        message: 'Available users retrieved successfully',
        data: users,
        count: users.length
      });
    } catch (error) {
      console.error('Get available users for role error:', error);
      res.status(500).json({
        error: 'Failed to retrieve available users'
      });
    }
  }
}

module.exports = new RoleController();