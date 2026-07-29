-- Ensure the Inmobiliarias screen has CRUD permissions.
INSERT INTO permissions (name, description, component_id, action_id)
SELECT
  CONCAT(c.name, '_', a.name) as name,
  CONCAT('Puede ', a.description, ' en ', c.description) as description,
  c.id as component_id,
  a.id as action_id
FROM components c
CROSS JOIN actions a
WHERE c.name = 'real_estates'
  AND a.name IN ('view', 'create', 'edit', 'delete')
  AND NOT EXISTS (
    SELECT 1
    FROM permissions p
    WHERE p.component_id = c.id AND p.action_id = a.id
  );

-- System admin must be able to see the action buttons on Inmobiliarias.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON true
JOIN components c ON p.component_id = c.id
WHERE r.name = 'system_admin'
  AND c.name = 'real_estates'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
