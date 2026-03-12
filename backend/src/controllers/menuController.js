const menuService = require('../services/menuService');
const { validationResult } = require('express-validator');

class MenuController {
  // Get menu options for current user
  async getMenuOptions(req, res) {
    try {
      const menuOptions = await menuService.getMenuOptionsForUser(req.user.id);

      res.json({
        message: 'Menu options retrieved successfully',
        data: menuOptions
      });
    } catch (error) {
      console.error('Get menu options error:', error);
      res.status(500).json({
        error: 'Failed to retrieve menu options'
      });
    }
  }

  // Get menu options by role (admin only)
  async getMenuOptionsByRole(req, res) {
    try {
      const { roleId } = req.params;
      const menuOptions = await menuService.getMenuOptionsByRole(roleId);

      res.json({
        message: 'Menu options retrieved successfully',
        data: menuOptions
      });
    } catch (error) {
      console.error('Get menu options by role error:', error);
      res.status(500).json({
        error: 'Failed to retrieve menu options'
      });
    }
  }

  // Get all menu options (admin only)
  async getAllMenuOptions(req, res) {
    try {
      const menuOptions = await menuService.getAllMenuOptions();

      res.json({
        message: 'All menu options retrieved successfully',
        data: menuOptions
      });
    } catch (error) {
      console.error('Get all menu options error:', error);
      res.status(500).json({
        error: 'Failed to retrieve menu options'
      });
    }
  }

  // Create menu option (admin only)
  async createMenuOption(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const menuData = req.body;
      const newMenuOption = await menuService.createMenuOption(menuData);

      res.status(201).json({
        message: 'Menu option created successfully',
        data: newMenuOption
      });
    } catch (error) {
      console.error('Create menu option error:', error);
      res.status(500).json({
        error: error.message || 'Failed to create menu option'
      });
    }
  }

  // Update menu option (admin only)
  async updateMenuOption(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { menuId } = req.params;
      const updateData = req.body;

      const updatedMenuOption = await menuService.updateMenuOption(menuId, updateData);

      res.json({
        message: 'Menu option updated successfully',
        data: updatedMenuOption
      });
    } catch (error) {
      console.error('Update menu option error:', error);
      res.status(error.message === 'Menu option not found' ? 404 : 500).json({
        error: error.message || 'Failed to update menu option'
      });
    }
  }

  // Delete menu option (admin only)
  async deleteMenuOption(req, res) {
    try {
      const { menuId } = req.params;
      const deletedMenuOption = await menuService.deleteMenuOption(menuId);

      res.json({
        message: 'Menu option deleted successfully',
        data: deletedMenuOption
      });
    } catch (error) {
      console.error('Delete menu option error:', error);
      res.status(error.message === 'Menu option not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete menu option'
      });
    }
  }

  // Assign menu to role (admin only)
  async assignMenuToRole(req, res) {
    try {
      const { roleId, menuOptionId } = req.params;

      const assignment = await menuService.assignMenuToRole(roleId, menuOptionId);

      res.json({
        message: 'Menu option assigned to role successfully',
        data: assignment
      });
    } catch (error) {
      console.error('Assign menu to role error:', error);
      res.status(500).json({
        error: error.message || 'Failed to assign menu option'
      });
    }
  }

  // Remove menu from role (admin only)
  async removeMenuFromRole(req, res) {
    try {
      const { roleId, menuOptionId } = req.params;

      const removedAssignment = await menuService.removeMenuFromRole(roleId, menuOptionId);

      res.json({
        message: 'Menu option removed from role successfully',
        data: removedAssignment
      });
    } catch (error) {
      console.error('Remove menu from role error:', error);
      res.status(error.message === 'Menu option not assigned to this role' ? 404 : 500).json({
        error: error.message || 'Failed to remove menu option'
      });
    }
  }

  // Get menu option by ID (admin only)
  async getMenuOptionById(req, res) {
    try {
      const { menuId } = req.params;
      const menuOption = await menuService.getMenuOptionById(menuId);

      res.json({
        message: 'Menu option retrieved successfully',
        data: menuOption
      });
    } catch (error) {
      console.error('Get menu option by ID error:', error);
      res.status(error.message === 'Menu option not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve menu option'
      });
    }
  }

  // Get all role-menu assignments (admin only)
  async getAllRoleMenuOptions(req, res) {
    try {
      const roleMenuOptions = await menuService.getAllRoleMenuOptions();

      res.json({
        message: 'Role menu options retrieved successfully',
        data: roleMenuOptions,
        count: roleMenuOptions.length
      });
    } catch (error) {
      console.error('Get all role menu options error:', error);
      res.status(500).json({
        error: 'Failed to retrieve role menu options'
      });
    }
  }

  // Get menus by role ID (admin only)
  async getMenusByRoleId(req, res) {
    try {
      const { roleId } = req.params;
      const menus = await menuService.getMenusByRole(parseInt(roleId));

      res.json({
        message: 'Menus for role retrieved successfully',
        data: menus,
        count: menus.length
      });
    } catch (error) {
      console.error('Get menus by role error:', error);
      res.status(500).json({
        error: 'Failed to retrieve menus for role'
      });
    }
  }

  // Bulk update role menus (admin only)
  async updateRoleMenus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { roleId } = req.params;
      const { menuOptionIds } = req.body;

      const updatedMenus = await menuService.updateRoleMenus(parseInt(roleId), menuOptionIds);

      res.json({
        message: 'Role menus updated successfully',
        data: updatedMenus,
        count: updatedMenus.length
      });
    } catch (error) {
      console.error('Update role menus error:', error);
      res.status(500).json({
        error: error.message || 'Failed to update role menus'
      });
    }
  }

  // Get menu hierarchy (admin only)
  async getMenuHierarchy(req, res) {
    try {
      const hierarchy = await menuService.getMenuHierarchy();

      res.json({
        message: 'Menu hierarchy retrieved successfully',
        data: hierarchy
      });
    } catch (error) {
      console.error('Get menu hierarchy error:', error);
      res.status(500).json({
        error: 'Failed to retrieve menu hierarchy'
      });
    }
  }
}

module.exports = new MenuController();