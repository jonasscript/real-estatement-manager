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
}

module.exports = new RoleController();