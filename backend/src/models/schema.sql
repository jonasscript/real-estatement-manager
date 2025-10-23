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
    real_estate_id INTEGER REFERENCES real_estates(id) ON DELETE CASCADE,
    commission_rate DECIMAL(5,2) DEFAULT 5.00, -- Commission percentage
    total_sales DECIMAL(15,2) DEFAULT 0,
    total_commission DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, real_estate_id)
);

-- Properties table
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    real_estate_id INTEGER REFERENCES real_estates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(50) NOT NULL, -- house, apartment, land, etc.
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    down_payment_percentage DECIMAL(5,2) NOT NULL, -- e.g., 10.00 for 10%
    total_installments INTEGER NOT NULL,
    installment_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available', -- available, sold, under_construction
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table (linked to users)
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    real_estate_id INTEGER REFERENCES real_estates(id) ON DELETE CASCADE,
    assigned_seller_id INTEGER REFERENCES sellers(id), -- Now references sellers table
    property_id INTEGER REFERENCES properties(id),
    contract_signed BOOLEAN DEFAULT false,
    contract_date DATE,
    total_down_payment DECIMAL(15,2),
    remaining_balance DECIMAL(15,2),
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
CREATE INDEX idx_sellers_real_estate ON sellers(real_estate_id);
CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_clients_seller ON clients(assigned_seller_id);
CREATE INDEX idx_clients_real_estate ON clients(real_estate_id);
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