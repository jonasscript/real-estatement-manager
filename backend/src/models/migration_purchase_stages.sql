-- Configurable commercial stages and down-payment generation.

ALTER TABLE property_purchases ADD COLUMN IF NOT EXISTS commercial_status VARCHAR(30) NOT NULL DEFAULT 'prospect';
ALTER TABLE property_purchases ADD COLUMN IF NOT EXISTS down_payment_percentage DECIMAL(5,2);
ALTER TABLE property_purchases ADD COLUMN IF NOT EXISTS down_payment_amount DECIMAL(15,2);
ALTER TABLE property_purchases ADD COLUMN IF NOT EXISTS stage_paid_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE property_purchases ADD COLUMN IF NOT EXISTS remaining_down_payment_amount DECIMAL(15,2);

CREATE TABLE IF NOT EXISTS purchase_stage_definitions (
    id SERIAL PRIMARY KEY,
    real_estate_id INTEGER NOT NULL REFERENCES real_estates(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 1,
    value_type VARCHAR(20) NOT NULL DEFAULT 'fixed_amount'
        CHECK (value_type IN ('fixed_amount', 'percentage')),
    value DECIMAL(15,2) NOT NULL DEFAULT 0,
    requires_payment BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT true,
    blocks_next_stage BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS property_stage_overrides (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    stage_definition_id INTEGER NOT NULL REFERENCES purchase_stage_definitions(id) ON DELETE CASCADE,
    value_type VARCHAR(20)
        CHECK (value_type IN ('fixed_amount', 'percentage')),
    value DECIMAL(15,2),
    requires_payment BOOLEAN,
    requires_approval BOOLEAN,
    blocks_next_stage BOOLEAN,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, stage_definition_id)
);

CREATE TABLE IF NOT EXISTS client_purchase_stages (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    property_purchase_id INTEGER NOT NULL REFERENCES property_purchases(id) ON DELETE CASCADE,
    stage_definition_id INTEGER REFERENCES purchase_stage_definitions(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 1,
    value_type VARCHAR(20) NOT NULL DEFAULT 'fixed_amount'
        CHECK (value_type IN ('fixed_amount', 'percentage')),
    value DECIMAL(15,2) NOT NULL DEFAULT 0,
    amount_due DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    requires_payment BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT true,
    blocks_next_stage BOOLEAN DEFAULT true,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'payment_pending', 'approved', 'rejected', 'completed')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_type VARCHAR(30) NOT NULL DEFAULT 'down_payment_balance';
ALTER TABLE installments ADD COLUMN IF NOT EXISTS display_label VARCHAR(120);
ALTER TABLE installments ADD COLUMN IF NOT EXISTS display_order INTEGER;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS purchase_stage_id INTEGER REFERENCES client_purchase_stages(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(30) NOT NULL DEFAULT 'installment';
ALTER TABLE payments ALTER COLUMN installment_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_stage_definitions_real_estate ON purchase_stage_definitions(real_estate_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_property_stage_overrides_property ON property_stage_overrides(property_id);
CREATE INDEX IF NOT EXISTS idx_client_purchase_stages_purchase ON client_purchase_stages(property_purchase_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_client_purchase_stages_client ON client_purchase_stages(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_purchase_stage ON payments(purchase_stage_id);

SELECT setval(pg_get_serial_sequence('menu_options', 'id'), COALESCE((SELECT MAX(id) FROM menu_options), 1), (SELECT COUNT(*) > 0 FROM menu_options));
SELECT setval(pg_get_serial_sequence('role_menu_options', 'id'), COALESCE((SELECT MAX(id) FROM role_menu_options), 1), (SELECT COUNT(*) > 0 FROM role_menu_options));
SELECT setval(pg_get_serial_sequence('components', 'id'), COALESCE((SELECT MAX(id) FROM components), 1), (SELECT COUNT(*) > 0 FROM components));
SELECT setval(pg_get_serial_sequence('permissions', 'id'), COALESCE((SELECT MAX(id) FROM permissions), 1), (SELECT COUNT(*) > 0 FROM permissions));
SELECT setval(pg_get_serial_sequence('role_permissions', 'id'), COALESCE((SELECT MAX(id) FROM role_permissions), 1), (SELECT COUNT(*) > 0 FROM role_permissions));

INSERT INTO menu_options (name, label, path, icon, sort_order)
SELECT 'real_estate_purchase_stages', 'Fases Comerciales', '/real-estate-admin/purchase-stages', 'list', 5
WHERE NOT EXISTS (SELECT 1 FROM menu_options WHERE name = 'real_estate_purchase_stages');

INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r
JOIN menu_options mo ON mo.name = 'real_estate_purchase_stages'
WHERE r.name = 'real_estate_admin'
ON CONFLICT DO NOTHING;

INSERT INTO components (name, description)
SELECT 'purchase_stages', 'Gestión de fases comerciales'
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'purchase_stages');

INSERT INTO permissions (name, description, component_id, action_id)
SELECT CONCAT('purchase_stages_', a.name), CONCAT('Puede ', a.description, ' en Gestión de fases comerciales'), c.id, a.id
FROM components c
CROSS JOIN actions a
WHERE c.name = 'purchase_stages'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name LIKE 'purchase_stages_%'
WHERE r.name IN ('system_admin', 'real_estate_admin')
ON CONFLICT DO NOTHING;
