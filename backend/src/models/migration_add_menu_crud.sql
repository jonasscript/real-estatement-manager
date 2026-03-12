-- Migration script to add menu management options for system admin role
-- Date: 2026-01-21
-- Description: Adds new menu options for managing menus and role-menu assignments

-- Insert new menu options (only if they don't exist)
INSERT INTO menu_options (name, label, path, icon, sort_order) 
SELECT 'admin_menu_options', 'Gestión de Menús', '/admin/menu-options', 'list', 4
WHERE NOT EXISTS (SELECT 1 FROM menu_options WHERE name = 'admin_menu_options');

INSERT INTO menu_options (name, label, path, icon, sort_order) 
SELECT 'admin_role_menu_options', 'Menús por Rol', '/admin/role-menu-options', 'user-cog', 5
WHERE NOT EXISTS (SELECT 1 FROM menu_options WHERE name = 'admin_role_menu_options');

-- Assign new menu options to system_admin role (only if not already assigned)
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r, menu_options mo
WHERE r.name = 'system_admin' 
  AND mo.name IN ('admin_menu_options', 'admin_role_menu_options')
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_options rmo
    WHERE rmo.role_id = r.id AND rmo.menu_option_id = mo.id
  );

-- Verify the changes
SELECT 
    mo.id,
    mo.name,
    mo.label,
    mo.path,
    r.name as assigned_to_role
FROM menu_options mo
LEFT JOIN role_menu_options rmo ON mo.id = rmo.menu_option_id
LEFT JOIN roles r ON rmo.role_id = r.id
WHERE mo.name IN ('admin_menu_options', 'admin_role_menu_options')
ORDER BY mo.id;
