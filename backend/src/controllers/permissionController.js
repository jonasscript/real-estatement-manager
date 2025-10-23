const permissionService = require('../services/permissionService');
const { validationResult } = require('express-validator');

class PermissionController {
  // Get all permissions
  async getAllPermissions(req, res) {
    try {
      const permissions = await permissionService.getAllPermissions();

      res.json({
        message: 'Permissions retrieved successfully',
        data: permissions,
        count: permissions.length
      });
    } catch (error) {
      console.error('Get all permissions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve permissions'
      });
    }
  }

  // Get permissions by role
  async getPermissionsByRole(req, res) {
    try {
      const { roleId } = req.params;
      const permissions = await permissionService.getPermissionsByRole(roleId);

      res.json({
        message: 'Role permissions retrieved successfully',
        data: permissions,
        count: permissions.length
      });
    } catch (error) {
      console.error('Get permissions by role error:', error);
      res.status(error.message === 'Role not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve role permissions'
      });
    }
  }

  // Get permissions by component and role
  async getPermissionsByComponentAndRole(req, res) {
    try {
      const { componentName, roleId } = req.params;
      const permissions = await permissionService.getPermissionsByComponentAndRole(componentName, roleId);

      res.json({
        message: 'Component permissions retrieved successfully',
        data: permissions,
        count: permissions.length
      });
    } catch (error) {
      console.error('Get permissions by component and role error:', error);
      res.status(500).json({
        error: error.message || 'Failed to retrieve component permissions'
      });
    }
  }

  // Check user permission
  async checkPermission(req, res) {
    try {
      const { roleId, componentName, action } = req.params;
      const hasPermission = await permissionService.hasPermission(roleId, componentName, action);

      res.json({
        message: 'Permission check completed',
        data: {
          hasPermission,
          roleId: parseInt(roleId),
          componentName,
          action
        }
      });
    } catch (error) {
      console.error('Check permission error:', error);
      res.status(500).json({
        error: 'Failed to check permission'
      });
    }
  }

  // Get permission by ID
  async getPermissionById(req, res) {
    try {
      const { permissionId } = req.params;
      const permission = await permissionService.getPermissionById(permissionId);

      res.json({
        message: 'Permission retrieved successfully',
        data: permission
      });
    } catch (error) {
      console.error('Get permission by ID error:', error);
      res.status(error.message === 'Permission not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve permission'
      });
    }
  }

  // Create new permission (admin only)
  async createPermission(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const permissionData = req.body;
      const newPermission = await permissionService.createPermission(permissionData);

      res.status(201).json({
        message: 'Permission created successfully',
        data: newPermission
      });
    } catch (error) {
      console.error('Create permission error:', error);
      res.status(error.message === 'Permission name already exists' ? 409 : 500).json({
        error: error.message || 'Failed to create permission'
      });
    }
  }

  // Update permission (admin only)
  async updatePermission(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { permissionId } = req.params;
      const updateData = req.body;

      const updatedPermission = await permissionService.updatePermission(permissionId, updateData);

      res.json({
        message: 'Permission updated successfully',
        data: updatedPermission
      });
    } catch (error) {
      console.error('Update permission error:', error);
      res.status(error.message === 'Permission not found' || error.message === 'Permission name already exists' ? 400 : 500).json({
        error: error.message || 'Failed to update permission'
      });
    }
  }

  // Delete permission (admin only)
  async deletePermission(req, res) {
    try {
      const { permissionId } = req.params;
      const deletedPermission = await permissionService.deletePermission(permissionId);

      res.json({
        message: 'Permission deleted successfully',
        data: deletedPermission
      });
    } catch (error) {
      console.error('Delete permission error:', error);
      res.status(error.message.includes('Cannot delete') ? 409 : error.message === 'Permission not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete permission'
      });
    }
  }

  // Assign permission to role
  async assignPermissionToRole(req, res) {
    try {
      const { roleId, permissionId } = req.params;
      const assignment = await permissionService.assignPermissionToRole(roleId, permissionId);

      res.json({
        message: 'Permission assigned to role successfully',
        data: assignment
      });
    } catch (error) {
      console.error('Assign permission to role error:', error);
      res.status(error.message === 'Permission already assigned to this role' ? 409 : 500).json({
        error: error.message || 'Failed to assign permission to role'
      });
    }
  }

  // Remove permission from role
  async removePermissionFromRole(req, res) {
    try {
      const { roleId, permissionId } = req.params;
      const result = await permissionService.removePermissionFromRole(roleId, permissionId);

      res.json({
        message: 'Permission removed from role successfully',
        data: result
      });
    } catch (error) {
      console.error('Remove permission from role error:', error);
      res.status(error.message === 'Permission not assigned to this role' ? 404 : 500).json({
        error: error.message || 'Failed to remove permission from role'
      });
    }
  }
}

module.exports = new PermissionController();