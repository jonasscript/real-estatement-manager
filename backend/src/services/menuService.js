const { query } = require('../config/database');

class MenuService {
  // Get menu options by role ID with hierarchical structure
  async getMenuOptionsByRole(roleId) {
    try {
      const queryText = `
        SELECT mo.id, mo.name, mo.label, mo.path, mo.icon, mo.parent_id, mo.sort_order
        FROM menu_options mo
        JOIN role_menu_options rmo ON mo.id = rmo.menu_option_id
        WHERE rmo.role_id = $1 AND mo.is_active = true
        ORDER BY mo.sort_order ASC, mo.label ASC
      `;
      const result = await query(queryText, [roleId]);
      const menuItems = result.rows;

      // Build hierarchical structure
      return this.buildMenuTree(menuItems);
    } catch (error) {
      throw error;
    }
  }

  // Get menu options by role name with hierarchical structure
  async getMenuOptionsByRoleName(roleName) {
    try {
      const queryText = `
        SELECT mo.id, mo.name, mo.label, mo.path, mo.icon, mo.parent_id, mo.sort_order
        FROM menu_options mo
        JOIN role_menu_options rmo ON mo.id = rmo.menu_option_id
        JOIN roles r ON rmo.role_id = r.id
        WHERE r.name = $1 AND mo.is_active = true
        ORDER BY mo.sort_order ASC, mo.label ASC
      `;
      const result = await query(queryText, [roleName]);
      const menuItems = result.rows;

      // Build hierarchical structure
      return this.buildMenuTree(menuItems);
    } catch (error) {
      throw error;
    }
  }

  // Get all menu options (for admin management)
  async getAllMenuOptions() {
    try {
      const queryText = `
        SELECT mo.*, r.name as role_name
        FROM menu_options mo
        LEFT JOIN role_menu_options rmo ON mo.id = rmo.menu_option_id
        LEFT JOIN roles r ON rmo.role_id = r.id
        ORDER BY mo.sort_order ASC, mo.label ASC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Create new menu option
  async createMenuOption(menuData) {
    try {
      const { name, label, path, icon, parentId, sortOrder = 0, isActive = true } = menuData;

      const insertQuery = `
        INSERT INTO menu_options (name, label, path, icon, parent_id, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const insertResult = await query(insertQuery, [
        name, label, path, icon, parentId, sortOrder, isActive
      ]);

      return insertResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update menu option
  async updateMenuOption(menuId, updateData) {
    try {
      const { name, label, path, icon, parentId, sortOrder, isActive } = updateData;

      const updateQuery = `
        UPDATE menu_options
        SET name = $1, label = $2, path = $3, icon = $4, parent_id = $5,
            sort_order = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [
        name, label, path, icon, parentId, sortOrder, isActive, menuId
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error('Menu option not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete menu option
  async deleteMenuOption(menuId) {
    try {
      // First remove role associations
      await query('DELETE FROM role_menu_options WHERE menu_option_id = $1', [menuId]);

      // Then delete the menu option
      const deleteQuery = 'DELETE FROM menu_options WHERE id = $1 RETURNING *';
      const deleteResult = await query(deleteQuery, [menuId]);

      if (deleteResult.rows.length === 0) {
        throw new Error('Menu option not found');
      }

      return deleteResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Assign menu option to role
  async assignMenuToRole(roleId, menuOptionId) {
    try {
      const insertQuery = `
        INSERT INTO role_menu_options (role_id, menu_option_id)
        VALUES ($1, $2)
        ON CONFLICT (role_id, menu_option_id) DO NOTHING
        RETURNING *
      `;
      const insertResult = await query(insertQuery, [roleId, menuOptionId]);

      return insertResult.rows[0] || { role_id: roleId, menu_option_id: menuOptionId };
    } catch (error) {
      throw error;
    }
  }

  // Remove menu option from role
  async removeMenuFromRole(roleId, menuOptionId) {
    try {
      const deleteQuery = `
        DELETE FROM role_menu_options
        WHERE role_id = $1 AND menu_option_id = $2
        RETURNING *
      `;
      const deleteResult = await query(deleteQuery, [roleId, menuOptionId]);

      if (deleteResult.rows.length === 0) {
        throw new Error('Menu option not assigned to this role');
      }

      return deleteResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get menu options for user (based on their role) with hierarchical structure
  async getMenuOptionsForUser(userId) {
    try {
      const queryText = `
        SELECT mo.id, mo.name, mo.label, mo.path, mo.icon, mo.parent_id, mo.sort_order
        FROM menu_options mo
        JOIN role_menu_options rmo ON mo.id = rmo.menu_option_id
        JOIN roles r ON rmo.role_id = r.id
        JOIN users u ON u.role_id = r.id
        WHERE u.id = $1 AND mo.is_active = true AND u.is_active = true
        ORDER BY mo.sort_order ASC, mo.label ASC
      `;
      const result = await query(queryText, [userId]);
      const menuItems = result.rows;

      // Build hierarchical structure
      return this.buildMenuTree(menuItems);
    } catch (error) {
      throw error;
    }
  }

  // Build hierarchical menu tree structure
  buildMenuTree(menuItems) {
    const menuMap = new Map();
    const rootItems = [];

    // First pass: create all menu items map
    menuItems.forEach(item => {
      menuMap.set(item.id, {
        ...item,
        children: []
      });
    });

    // Second pass: build the tree structure
    menuItems.forEach(item => {
      const menuItem = menuMap.get(item.id);

      if (item.parent_id) {
        // This is a child item
        const parent = menuMap.get(item.parent_id);
        if (parent) {
          parent.children.push(menuItem);
          // Sort children by sort_order
          parent.children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        }
      } else {
        // This is a root item
        rootItems.push(menuItem);
      }
    });

    // Sort root items by sort_order
    rootItems.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return rootItems;
  }
}

module.exports = new MenuService();