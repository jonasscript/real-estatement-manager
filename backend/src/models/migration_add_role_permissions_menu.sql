-- Migration: Add role-permissions menu option
-- Date: 2026-01-29

-- Insert the new menu option for role-permissions management
INSERT INTO menu_options (name, label, path, icon, sort_order) 
VALUES ('admin_role_permissions', 'Permisos por Rol', '/admin/role-permissions', 'user-lock', 9)
ON CONFLICT (name) DO NOTHING;

-- Assign the new menu option to system_admin role
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r, menu_options mo
WHERE r.name = 'system_admin' AND mo.name = 'admin_role_permissions'
ON CONFLICT (role_id, menu_option_id) DO NOTHING;
