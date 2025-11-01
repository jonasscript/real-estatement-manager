-- Database Schema for Real Estate Installment Payment System

-- Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('system_admin', 'System Administrator with full access'),
('real_estate_admin', 'Real Estate Administrator'),
('seller', 'Real Estate Seller'),
('client', 'Property Client');

-- Real Estates table (managed by system admin) - Must be created before users
CREATE TABLE real_estates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    created_by INTEGER, -- Will be updated after users table is created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    real_estate_id INTEGER REFERENCES real_estates(id), -- For real estate admins, sellers, and clients
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update real_estates foreign key after users table is created
ALTER TABLE real_estates ADD CONSTRAINT fk_real_estates_created_by FOREIGN KEY (created_by) REFERENCES users(id);

-- Sellers table (extends users for better performance)
CREATE TABLE sellers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    commission_rate DECIMAL(5,2) DEFAULT 5.00, -- Commission percentage
    total_sales DECIMAL(15,2) DEFAULT 0,
    total_commission DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Types table (catalog)
CREATE TABLE property_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- house, apartment, land, commercial, villa, townhouse
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Status table (catalog)
CREATE TABLE property_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- available, reserved, sold, under_construction, planning
    description TEXT,
    color VARCHAR(7), -- Hex color for UI display
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default property types
INSERT INTO property_types (name, description) VALUES
('Casa', 'Casa unifamiliar'),
('Departamento', 'Unidad de apartamento'),
('Terreno', 'Terreno vacío/lote'),
('Local', 'Propiedad comercial');

-- Insert default property status
INSERT INTO property_status (name, description, color) VALUES
('Disponible', 'Propiedad disponible para venta', '#28a745'),
('Reservado', 'Propiedad reservada por cliente', '#ffc107'),
('Vendido', 'Propiedad vendida', '#dc3545'),
('En Construcción', 'Propiedad en construcción', '#17a2b8'),
('Planificación', 'Propiedad en fase de planificación', '#6c757d');

-- Phase Types table (catalog)
CREATE TABLE phase_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- ciudadela, tower, terreno, sector
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default phase types
INSERT INTO phase_types (name, description) VALUES
('Ciudadela', 'Desarrollo de ciudadela con múltiples manzanas'),
('Torre', 'Torre residencial o comercial'),
('Terreno', 'Desarrollo de terrenos individuales'),
('Sector', 'Sector específico de un desarrollo'),
('Condominios', 'Desarrollo de condominios');

-- Phases table - Etapas/Fases por Real Estate
CREATE TABLE phases (
    id SERIAL PRIMARY KEY,
    real_estate_id INTEGER REFERENCES real_estates(id) ON DELETE CASCADE,
    phase_type_id INTEGER REFERENCES phase_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL, -- "Etapa 1", "Torre A", "Sector Norte"
    description TEXT,
    status VARCHAR(20), -- planning, development, selling, completed
    start_date DATE,
    completion_date DATE,
    total_units INTEGER DEFAULT 0, -- Total planned units in this phase
    sold_units INTEGER DEFAULT 0, -- Units sold
    available_units INTEGER DEFAULT 0, -- Units available
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Models table - Modelos/Tipos de Propiedades
CREATE TABLE property_models (
    id SERIAL PRIMARY KEY,
    real_estate_id INTEGER REFERENCES real_estates(id) ON DELETE CASCADE,
    property_type_id INTEGER REFERENCES property_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL, -- "Casa Modelo A", "Casa Modelo B", "Apartamento Tipo 1"
    description TEXT,
    area_sqm DECIMAL(10,2),
    bedrooms INTEGER,
    bathrooms INTEGER,
    parking_spaces INTEGER DEFAULT 0,
    features TEXT[], -- Array de características
    base_price DECIMAL(15,2) NOT NULL,
    down_payment_percentage DECIMAL(5,2) NOT NULL,
    total_installments INTEGER NOT NULL,
    installment_amount DECIMAL(15,2) NOT NULL,
    floor_plan_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Locations table - Ubicaciones Físicas dentro de Phases
-- REPLACED WITH BLOCKS AND UNITS STRUCTURE BELOW

-- Blocks table - Manzanas dentro de Phases
CREATE TABLE blocks (
    id SERIAL PRIMARY KEY,
    phase_id INTEGER REFERENCES phases(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- "Manzana A", "Manzana B", "Bloque 1"
    description TEXT,
    total_units INTEGER DEFAULT 0, -- Total planned units in this block
    available_units INTEGER DEFAULT 0, -- Units available
    sold_units INTEGER DEFAULT 0, -- Units sold
    coordinates_x DECIMAL(10,6), -- GPS coordinates for block center
    coordinates_y DECIMAL(10,6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phase_id, name) -- Block name unique per phase
);

-- Units table - Villas/Apartamentos/Lotes dentro de Blocks
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,
    identifier VARCHAR(100) NOT NULL, -- "Villa 1", "Apto 101", "Lote 15"
    unit_number VARCHAR(20), -- Número específico de la unidad
    area_notes TEXT, -- Notas específicas del área
    coordinates_x DECIMAL(10,6), -- GPS coordinates específicas de la unidad
    coordinates_y DECIMAL(10,6),
    property_status_id INTEGER REFERENCES property_status(id) DEFAULT 1, -- Default to 'available'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(block_id, identifier) -- Unit identifier unique per block
);

-- Properties table - Asignación de Modelos a Unidades (ESTRUCTURA MEJORADA)
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    property_model_id INTEGER REFERENCES property_models(id) ON DELETE CASCADE,
    unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
    property_status_id INTEGER REFERENCES property_status(id) DEFAULT 1, -- Default to 'available'
    custom_price DECIMAL(15,2), -- NULL usa el precio base del modelo
    custom_down_payment_percentage DECIMAL(5,2), -- NULL usa el del modelo
    custom_installments INTEGER, -- NULL usa los del modelo
    custom_installment_amount DECIMAL(15,2), -- NULL usa el del modelo
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(unit_id) -- Una unidad solo puede tener una propiedad
);

-- Clients table (linked to users)
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assigned_seller_id INTEGER REFERENCES sellers(id), -- Now references sellers table
    contract_signed BOOLEAN DEFAULT false,
    contract_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Installments table
CREATE TABLE installments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, late
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, installment_number)
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    installment_id INTEGER REFERENCES installments(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) NOT NULL, -- bank_transfer, deposit
    reference_number VARCHAR(100), -- transaction reference
    proof_file_path VARCHAR(500), -- path to uploaded proof file
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by INTEGER REFERENCES users(id), -- who approved the payment
    approved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id), -- who triggered the notification
    type VARCHAR(50) NOT NULL, -- payment_uploaded, payment_overdue, payment_approved, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_client_id INTEGER REFERENCES clients(id),
    related_payment_id INTEGER REFERENCES payments(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_real_estate ON users(real_estate_id);
CREATE INDEX idx_sellers_user ON sellers(user_id);
CREATE INDEX idx_phases_real_estate ON phases(real_estate_id);
CREATE INDEX idx_phases_type ON phases(phase_type_id);
CREATE INDEX idx_property_models_real_estate ON property_models(real_estate_id);
CREATE INDEX idx_property_models_type ON property_models(property_type_id);
CREATE INDEX idx_blocks_phase ON blocks(phase_id);
CREATE INDEX idx_units_block ON units(block_id);
CREATE INDEX idx_units_status ON units(property_status_id);
CREATE INDEX idx_properties_model ON properties(property_model_id);
CREATE INDEX idx_properties_unit ON properties(unit_id);
CREATE INDEX idx_properties_status ON properties(property_status_id);
CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_clients_seller ON clients(assigned_seller_id);
CREATE INDEX idx_installments_client ON installments(client_id);
CREATE INDEX idx_installments_due_date ON installments(due_date);
CREATE INDEX idx_payments_installment ON payments(installment_id);
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_real_estates_updated_at BEFORE UPDATE ON real_estates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_models_updated_at BEFORE UPDATE ON property_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_installments_updated_at BEFORE UPDATE ON installments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Menu Options table
CREATE TABLE menu_options (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    path VARCHAR(255),
    icon VARCHAR(50),
    parent_id INTEGER REFERENCES menu_options(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role Menu Options table (many-to-many relationship)
CREATE TABLE role_menu_options (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    menu_option_id INTEGER REFERENCES menu_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, menu_option_id)
);

-- Insert default menu options
INSERT INTO menu_options (name, label, path, icon, sort_order) VALUES
-- System Admin menus
('admin_dashboard', 'Dashboard', '/admin/dashboard', 'dashboard', 1),
('admin_real_estates', 'Real Estates', '/admin/real-estates', 'building', 2),
('admin_users', 'Users', '/admin/users', 'users', 3),

-- Real Estate Admin menus
('real_estate_dashboard', 'Dashboard', '/real-estate-admin/dashboard', 'dashboard', 1),
('real_estate_properties', 'Properties', '/real-estate-admin/properties', 'home', 2),
('real_estate_clients', 'Clients', '/real-estate-admin/clients', 'users', 3),
('real_estate_sellers', 'Sellers', '/real-estate-admin/sellers', 'user-check', 4),
('real_estate_users', 'Users', '/real-estate-admin/users', 'user-plus', 6),

-- Seller menus
('seller_dashboard', 'Dashboard', '/seller/dashboard', 'dashboard', 1),
('seller_clients', 'My Clients', '/seller/clients', 'users', 2),
('seller_payments', 'Payments', '/seller/payments', 'credit-card', 3),

-- Client menus
('client_dashboard', 'Dashboard', '/client/dashboard', 'dashboard', 1),
('client_payments', 'My Payments', '/client/payments', 'credit-card', 2),
('client_installments', 'Installments', '/client/installments', 'calendar', 3);

-- Assign menu options to roles
-- System Admin gets all admin menus
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r, menu_options mo
WHERE r.name = 'system_admin' AND mo.name LIKE 'admin_%';

-- Real Estate Admin gets real estate admin menus
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r, menu_options mo
WHERE r.name = 'real_estate_admin' AND mo.name LIKE 'real_estate_%'
AND mo.name != 'real_estate_users'; -- Exclude duplicate

-- Add specific assignment for real_estate_users menu to real_estate_admin role (only once)
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r, menu_options mo
WHERE r.name = 'real_estate_admin' AND mo.name = 'real_estate_users'
AND NOT EXISTS (
    SELECT 1 FROM role_menu_options rmo
    WHERE rmo.role_id = r.id AND rmo.menu_option_id = mo.id
);

-- Seller gets seller menus
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r, menu_options mo
WHERE r.name = 'seller' AND mo.name LIKE 'seller_%';

-- Client gets client menus
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r, menu_options mo
WHERE r.name = 'client' AND mo.name LIKE 'client_%';

-- Add Sellers menu option for Real Estate Admin (only if not exists)
INSERT INTO menu_options (name, label, path, icon, sort_order)
SELECT 'real_estate_sellers_component', 'Sellers Management', './real-estate-admin/sellers/sellers.component', 'user-check', 5
WHERE NOT EXISTS (SELECT 1 FROM menu_options WHERE name = 'real_estate_sellers_component');

-- Assign Sellers component to real_estate_admin role (only if not exists)
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r, menu_options mo
WHERE r.name = 'real_estate_admin' AND mo.name = 'real_estate_sellers_component'
AND NOT EXISTS (
    SELECT 1 FROM role_menu_options rmo
    WHERE rmo.role_id = r.id AND rmo.menu_option_id = mo.id
);

-- Indexes for menu options
CREATE INDEX idx_menu_options_parent ON menu_options(parent_id);
CREATE INDEX idx_menu_options_active ON menu_options(is_active);
CREATE INDEX idx_role_menu_options_role ON role_menu_options(role_id);
CREATE INDEX idx_role_menu_options_menu ON role_menu_options(menu_option_id);

-- Trigger for menu_options updated_at
CREATE TRIGGER update_menu_options_updated_at BEFORE UPDATE ON menu_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    component_name VARCHAR(100) NOT NULL, -- e.g., 'properties', 'users'
    action VARCHAR(50) NOT NULL, -- e.g., 'create', 'edit', 'delete', 'view'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions table (many-to-many relationship)
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Insert default permissions
INSERT INTO permissions (name, description, component_name, action) VALUES
-- Properties permissions
('properties_create', 'Can create new properties', 'properties', 'create'),
('properties_edit', 'Can edit existing properties', 'properties', 'edit'),
('properties_delete', 'Can delete properties', 'properties', 'delete'),
('properties_view', 'Can view properties', 'properties', 'view'),

-- Users permissions
('users_create', 'Can create new users', 'users', 'create'),
('users_edit', 'Can edit existing users', 'users', 'edit'),
('users_delete', 'Can delete users', 'users', 'delete'),
('users_view', 'Can view users', 'users', 'view');

-- Assign permissions to roles
-- System Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'system_admin';

-- Real Estate Admin gets properties permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'real_estate_admin' AND p.component_name = 'properties';

-- Seller gets view-only properties permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'seller' AND p.name = 'properties_view';

-- Client gets no permissions (for now)
-- No permissions assigned to client role

-- Indexes for permissions
CREATE INDEX idx_permissions_component ON permissions(component_name);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- Trigger for permissions updated_at
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update phase and block statistics
CREATE OR REPLACE FUNCTION update_phase_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update phase statistics when blocks or units change
    UPDATE phases SET
        total_units = (
            SELECT COALESCE(SUM(b.total_units), 0)
            FROM blocks b
            WHERE b.phase_id = COALESCE(NEW.phase_id, OLD.phase_id)
        ),
        available_units = (
            SELECT COALESCE(SUM(b.available_units), 0)
            FROM blocks b
            WHERE b.phase_id = COALESCE(NEW.phase_id, OLD.phase_id)
        ),
        sold_units = (
            SELECT COALESCE(SUM(b.sold_units), 0)
            FROM blocks b
            WHERE b.phase_id = COALESCE(NEW.phase_id, OLD.phase_id)
        )
    WHERE id = COALESCE(NEW.phase_id, OLD.phase_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to update block statistics
CREATE OR REPLACE FUNCTION update_block_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update block statistics when units change
    UPDATE blocks SET
        total_units = (
            SELECT COUNT(*)
            FROM units u
            WHERE u.block_id = COALESCE(NEW.block_id, OLD.block_id)
        ),
        available_units = (
            SELECT COUNT(*)
            FROM units u
            WHERE u.block_id = COALESCE(NEW.block_id, OLD.block_id)
            AND u.property_status_id = (SELECT id FROM property_status WHERE name = 'available')
        ),
        sold_units = (
            SELECT COUNT(*)
            FROM units u
            WHERE u.block_id = COALESCE(NEW.block_id, OLD.block_id)
            AND u.property_status_id = (SELECT id FROM property_status WHERE name = 'sold')
        )
    WHERE id = COALESCE(NEW.block_id, OLD.block_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers to update statistics
CREATE TRIGGER update_block_stats_on_unit_change 
    AFTER INSERT OR UPDATE OR DELETE ON units
    FOR EACH ROW EXECUTE FUNCTION update_block_statistics();

CREATE TRIGGER update_phase_stats_on_block_change 
    AFTER INSERT OR UPDATE OR DELETE ON blocks
    FOR EACH ROW EXECUTE FUNCTION update_phase_statistics();

-- View for complete property information
CREATE VIEW property_details AS
SELECT 
    p.id,
    pm.name as model_name,
    pt.name as property_type,
    u.identifier as unit_identifier,
    u.unit_number,
    b.name as block_name,
    ph.name as phase_name,
    pht.name as phase_type,
    re.name as real_estate_name,
    ps.name as status,
    ps.color as status_color,
    COALESCE(p.custom_price, pm.base_price) as final_price,
    COALESCE(p.custom_down_payment_percentage, pm.down_payment_percentage) as final_down_payment_percentage,
    COALESCE(p.custom_installments, pm.total_installments) as final_installments,
    COALESCE(p.custom_installment_amount, pm.installment_amount) as final_installment_amount,
    pm.area_sqm,
    pm.bedrooms,
    pm.bathrooms,
    pm.parking_spaces,
    pm.features,
    p.notes,
    CONCAT(b.name, ' - ', u.identifier) as full_location,
    p.created_at,
    p.updated_at
FROM properties p
LEFT JOIN property_models pm ON p.property_model_id = pm.id
LEFT JOIN property_types pt ON pm.property_type_id = pt.id
LEFT JOIN units u ON p.unit_id = u.id
LEFT JOIN blocks b ON u.block_id = b.id
LEFT JOIN phases ph ON b.phase_id = ph.id
LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
LEFT JOIN real_estates re ON ph.real_estate_id = re.id
LEFT JOIN property_status ps ON p.property_status_id = ps.id;

-- View for phase summary
CREATE VIEW phase_summary AS
SELECT 
    ph.id,
    ph.name,
    ph.description,
    pht.name as phase_type,
    ph.status,
    re.name as real_estate_name,
    ph.total_units,
    ph.available_units,
    ph.sold_units,
    (ph.sold_units::decimal / NULLIF(ph.total_units, 0) * 100) as sales_percentage,
    ph.start_date,
    ph.completion_date,
    COUNT(b.id) as total_blocks,
    ph.created_at,
    ph.updated_at
FROM phases ph
LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
LEFT JOIN real_estates re ON ph.real_estate_id = re.id
LEFT JOIN blocks b ON ph.id = b.phase_id
GROUP BY ph.id, pht.name, re.name;

-- View for block summary
CREATE VIEW block_summary AS
SELECT 
    b.id,
    b.name,
    b.description,
    ph.name as phase_name,
    pht.name as phase_type,
    re.name as real_estate_name,
    b.total_units,
    b.available_units,
    b.sold_units,
    (b.sold_units::decimal / NULLIF(b.total_units, 0) * 100) as sales_percentage,
    COUNT(u.id) as actual_units_count,
    b.created_at,
    b.updated_at
FROM blocks b
LEFT JOIN phases ph ON b.phase_id = ph.id
LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
LEFT JOIN real_estates re ON ph.real_estate_id = re.id
LEFT JOIN units u ON b.id = u.block_id
GROUP BY b.id, ph.name, pht.name, re.name;