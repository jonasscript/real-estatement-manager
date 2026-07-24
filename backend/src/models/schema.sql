-- Database Schema for Real Estate Installment Payment System

-- Idempotent helpers.
-- These functions live only for the current database session and let this script
-- keep running when an existing table belongs to another PostgreSQL role.
CREATE OR REPLACE FUNCTION pg_temp.codex_can_manage_public_relation(p_relation_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  can_manage BOOLEAN;
BEGIN
  SELECT pg_has_role(c.relowner, 'USAGE')
  INTO can_manage
  FROM pg_class c
  INNER JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = p_relation_name;

  RETURN COALESCE(can_manage, TRUE);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.codex_add_column_if_owner(
  p_table_name TEXT,
  p_column_name TEXT,
  p_sql TEXT
)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = p_column_name
  ) THEN
    RETURN;
  END IF;

  IF pg_temp.codex_can_manage_public_relation(p_table_name) THEN
    BEGIN
      EXECUTE p_sql;
    EXCEPTION
      WHEN undefined_column OR undefined_table OR insufficient_privilege THEN
        RAISE NOTICE 'Skipping column %.%: %', p_table_name, p_column_name, SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Skipping column %.%: current user (%) is not owner of relation %.', p_table_name, p_column_name, current_user, p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.codex_public_column_exists(
  p_table_name TEXT,
  p_column_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = p_column_name
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.codex_add_constraint_if_owner(
  p_table_name TEXT,
  p_constraint_name TEXT,
  p_sql TEXT
)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = p_constraint_name
  ) THEN
    RETURN;
  END IF;

  IF pg_temp.codex_can_manage_public_relation(p_table_name) THEN
    BEGIN
      EXECUTE p_sql;
    EXCEPTION
      WHEN undefined_column OR undefined_table OR insufficient_privilege OR foreign_key_violation THEN
        RAISE NOTICE 'Skipping constraint % on %: %', p_constraint_name, p_table_name, SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Skipping constraint % on %: current user (%) is not owner of relation %.', p_constraint_name, p_table_name, current_user, p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.codex_drop_constraint_if_owner(
  p_table_name TEXT,
  p_constraint_name TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = p_constraint_name
  ) THEN
    RETURN;
  END IF;

  IF pg_temp.codex_can_manage_public_relation(p_table_name) THEN
    BEGIN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', p_table_name, p_constraint_name);
    EXCEPTION
      WHEN undefined_table OR insufficient_privilege THEN
        RAISE NOTICE 'Skipping drop constraint % on %: %', p_constraint_name, p_table_name, SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Skipping drop constraint % on %: current user (%) is not owner of relation %.', p_constraint_name, p_table_name, current_user, p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.codex_create_index_if_owner(
  p_table_name TEXT,
  p_index_name TEXT,
  p_sql TEXT
)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    INNER JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = p_index_name
  ) THEN
    RETURN;
  END IF;

  IF pg_temp.codex_can_manage_public_relation(p_table_name) THEN
    BEGIN
      EXECUTE p_sql;
    EXCEPTION
      WHEN undefined_column OR undefined_table OR insufficient_privilege THEN
        RAISE NOTICE 'Skipping index % on %: %', p_index_name, p_table_name, SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Skipping index % on %: current user (%) is not owner of relation %.', p_index_name, p_table_name, current_user, p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.codex_recreate_trigger_if_owner(
  p_table_name TEXT,
  p_trigger_name TEXT,
  p_create_sql TEXT
)
RETURNS VOID AS $$
BEGIN
  IF pg_temp.codex_can_manage_public_relation(p_table_name) THEN
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', p_trigger_name, p_table_name);
      EXECUTE p_create_sql;
    EXCEPTION
      WHEN undefined_function OR undefined_table OR insufficient_privilege THEN
        RAISE NOTICE 'Skipping trigger % on %: %', p_trigger_name, p_table_name, SQLERRM;
    END;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    INNER JOIN pg_class c ON c.oid = t.tgrelid
    INNER JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = p_table_name
      AND t.tgname = p_trigger_name
      AND NOT t.tgisinternal
  ) THEN
    RAISE NOTICE 'Skipping trigger % on %: current user (%) is not owner of relation %.', p_trigger_name, p_table_name, current_user, p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.codex_replace_view_if_owner(
  p_view_name TEXT,
  p_sql TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT pg_temp.codex_can_manage_public_relation(p_view_name) THEN
    RAISE NOTICE 'Skipping view %: current user (%) is not owner of the existing view.', p_view_name, current_user;
    RETURN;
  END IF;

  BEGIN
    EXECUTE format('DROP VIEW IF EXISTS public.%I', p_view_name);
    EXECUTE p_sql;
  EXCEPTION
    WHEN undefined_column OR undefined_table OR insufficient_privilege THEN
      RAISE NOTICE 'Skipping view %: %', p_view_name, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.codex_sync_serial_sequence(
  p_table_name TEXT,
  p_column_name TEXT DEFAULT 'id'
)
RETURNS VOID AS $$
DECLARE
  sequence_name TEXT;
  max_id BIGINT;
  has_rows BOOLEAN;
BEGIN
  IF NOT pg_temp.codex_can_manage_public_relation(p_table_name) THEN
    RAISE NOTICE 'Skipping sequence sync for %: current user (%) is not owner of relation %.', p_table_name, current_user, p_table_name;
    RETURN;
  END IF;

  SELECT pg_get_serial_sequence(format('public.%I', p_table_name), p_column_name)
  INTO sequence_name;

  IF sequence_name IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('SELECT MAX(%I), COUNT(*) > 0 FROM public.%I', p_column_name, p_table_name)
  INTO max_id, has_rows;

  IF has_rows THEN
    PERFORM setval(sequence_name::regclass, max_id, true);
  ELSE
    PERFORM setval(sequence_name::regclass, 1, false);
  END IF;
EXCEPTION
  WHEN undefined_column OR undefined_table OR insufficient_privilege THEN
    RAISE NOTICE 'Skipping sequence sync for %.%: %', p_table_name, p_column_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT pg_temp.codex_sync_serial_sequence('roles');

-- Insert default roles
INSERT INTO roles (name, description)
SELECT seed.name, seed.description
FROM (VALUES
  ('system_admin', 'Administrador de sistema'),
  ('real_estate_admin', 'Administrador de inmobiliaria'),
  ('seller', 'Vendedor de inmobiliaria'),
  ('client', 'Cliente de propiedad')
) AS seed(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM roles r WHERE r.name = seed.name
);

-- Real Estates table (managed by system admin) - Must be created before users
CREATE TABLE IF NOT EXISTS real_estates (
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
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    id_number VARCHAR(20) UNIQUE NOT NULL, -- Número de identificación (cédula/DNI)
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    birthday DATE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    real_estate_id INTEGER REFERENCES real_estates(id), -- For real estate admins, sellers, and clients
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compatibility columns for existing users table
SELECT pg_temp.codex_add_column_if_owner('users', 'id_number', 'ALTER TABLE public.users ADD COLUMN id_number VARCHAR(20)');
SELECT pg_temp.codex_add_column_if_owner('users', 'birthday', 'ALTER TABLE public.users ADD COLUMN birthday DATE');
SELECT pg_temp.codex_add_column_if_owner('users', 'microsoft_account_id', 'ALTER TABLE public.users ADD COLUMN microsoft_account_id VARCHAR(255)');
SELECT pg_temp.codex_add_column_if_owner('users', 'microsoft_email', 'ALTER TABLE public.users ADD COLUMN microsoft_email VARCHAR(255)');
SELECT pg_temp.codex_add_column_if_owner('users', 'microsoft_access_token', 'ALTER TABLE public.users ADD COLUMN microsoft_access_token TEXT');
SELECT pg_temp.codex_add_column_if_owner('users', 'microsoft_refresh_token', 'ALTER TABLE public.users ADD COLUMN microsoft_refresh_token TEXT');
SELECT pg_temp.codex_add_column_if_owner('users', 'microsoft_token_expires_at', 'ALTER TABLE public.users ADD COLUMN microsoft_token_expires_at TIMESTAMP');
SELECT pg_temp.codex_add_column_if_owner('users', 'microsoft_scopes', 'ALTER TABLE public.users ADD COLUMN microsoft_scopes TEXT');

-- Update real_estates foreign key after users table is created
SELECT pg_temp.codex_add_constraint_if_owner(
  'real_estates',
  'fk_real_estates_created_by',
  'ALTER TABLE public.real_estates ADD CONSTRAINT fk_real_estates_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) NOT VALID'
);

-- Sellers table (extends users for better performance)
CREATE TABLE IF NOT EXISTS sellers (
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
CREATE TABLE IF NOT EXISTS property_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- house, apartment, land, commercial, villa, townhouse
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Construction Status table (catalog)
-- Tracks the physical/project progress of the property, not the sale lifecycle.
CREATE TABLE IF NOT EXISTS property_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- planning, under_construction, finishing, ready
    description TEXT,
    color VARCHAR(7), -- Hex color for UI display
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default property types
INSERT INTO property_types (name, description)
SELECT seed.name, seed.description
FROM (VALUES
  ('Casa', 'Casa unifamiliar'),
  ('Departamento', 'Unidad de apartamento'),
  ('Terreno', 'Terreno vacío/lote'),
  ('Local', 'Propiedad comercial')
) AS seed(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM property_types pt WHERE pt.name = seed.name
);

-- Insert default construction status
INSERT INTO property_status (name, description, color)
SELECT seed.name, seed.description, seed.color
FROM (VALUES
  ('Planificación', 'Propiedad en fase de planificación', '#6c757d'),
  ('En Construcción', 'Obra en construcción', '#17a2b8'),
  ('En Acabados', 'Obra en etapa de acabados', '#f59e0b'),
  ('Lista para Entrega', 'Obra lista para entrega', '#28a745')
) AS seed(name, description, color)
WHERE NOT EXISTS (
  SELECT 1 FROM property_status ps WHERE ps.name = seed.name
);

-- Phase Types table (catalog)
CREATE TABLE IF NOT EXISTS phase_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- ciudadela, tower, terreno, sector
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default phase types
INSERT INTO phase_types (name, description)
SELECT seed.name, seed.description
FROM (VALUES
  ('Ciudadela', 'Desarrollo de ciudadela con múltiples manzanas'),
  ('Torre', 'Torre residencial o comercial'),
  ('Terreno', 'Desarrollo de terrenos individuales'),
  ('Sector', 'Sector específico de un desarrollo'),
  ('Condominios', 'Desarrollo de condominios')
) AS seed(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM phase_types pt WHERE pt.name = seed.name
);

-- Phases table - Etapas/Fases por Real Estate
CREATE TABLE IF NOT EXISTS phases (
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
CREATE TABLE IF NOT EXISTS property_models (
    id SERIAL PRIMARY KEY,
    real_estate_id INTEGER REFERENCES real_estates(id) ON DELETE CASCADE,
    property_type_id INTEGER REFERENCES property_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL, -- "Casa Modelo A", "Casa Modelo B", "Apartamento Tipo 1"
    description TEXT,
    area_sqm DECIMAL(10,2),
    bedrooms INTEGER,
    bathrooms INTEGER,
    features TEXT[], -- Array de características
    floor_plan_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Locations table - Ubicaciones Físicas dentro de Phases
-- REPLACED WITH BLOCKS AND UNITS STRUCTURE BELOW

-- Blocks table - Manzanas dentro de Phases
CREATE TABLE IF NOT EXISTS blocks (
    id SERIAL PRIMARY KEY,
    phase_id INTEGER REFERENCES phases(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- "Manzana A", "Manzana B", "Bloque 1"
    description TEXT,
    coordinates_x DECIMAL(10,6), -- GPS coordinates for block center
    coordinates_y DECIMAL(10,6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phase_id, name) -- Block name unique per phase
);

-- Units table - Villas/Apartamentos/Lotes dentro de Blocks
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,
    identifier VARCHAR(100) NOT NULL, -- "Villa 1", "Apto 101", "Lote 15"
    unit_number VARCHAR(20), -- Número específico de la unidad
    area_notes TEXT, -- Notas específicas del área
    coordinates_x DECIMAL(10,6), -- GPS coordinates específicas de la unidad
    coordinates_y DECIMAL(10,6),
    property_status_id INTEGER REFERENCES property_status(id) DEFAULT 1, -- Construction status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(block_id, identifier) -- Unit identifier unique per block
);

-- Properties table - Asignación de Modelos a Unidades (ESTRUCTURA MEJORADA)
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    property_model_id INTEGER REFERENCES property_models(id) ON DELETE CASCADE,
    unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
    property_status_id INTEGER REFERENCES property_status(id) DEFAULT 1, -- Construction status
    sale_status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (sale_status IN ('available', 'reserved', 'sold')),
    land_area_sqm DECIMAL(10,2), -- Metros cuadrados del terreno
    custom_price DECIMAL(15,2), -- NULL usa el precio base del modelo
    custom_down_payment_percentage DECIMAL(5,2), -- NULL usa el del modelo
    custom_installments INTEGER, -- NULL usa los del modelo
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(unit_id) -- Una unidad solo puede tener una propiedad
);

-- Compatibility block for existing databases:
-- keeps construction status and sale lifecycle separated when schema.sql is re-run.
SELECT pg_temp.codex_add_column_if_owner(
  'properties',
  'sale_status',
  'ALTER TABLE public.properties ADD COLUMN sale_status VARCHAR(20) NOT NULL DEFAULT ''available'''
);

SELECT pg_temp.codex_add_constraint_if_owner(
  'properties',
  'properties_sale_status_check',
  'ALTER TABLE public.properties ADD CONSTRAINT properties_sale_status_check CHECK (sale_status IN (''available'', ''reserved'', ''sold'')) NOT VALID'
);

DO $$
BEGIN
  IF pg_temp.codex_public_column_exists('properties', 'sale_status') THEN
    BEGIN
      UPDATE properties p
      SET sale_status = CASE
        WHEN LOWER(TRIM(ps.name)) IN ('reservado', 'reserved') THEN 'reserved'
        WHEN LOWER(TRIM(ps.name)) IN ('vendido', 'sold', 'comprado') THEN 'sold'
        ELSE COALESCE(p.sale_status, 'available')
      END
      FROM property_status ps
      WHERE p.property_status_id = ps.id
        AND LOWER(TRIM(ps.name)) IN ('reservado', 'reserved', 'vendido', 'sold', 'comprado');

      WITH fallback_status AS (
        SELECT id
        FROM property_status
        WHERE LOWER(TRIM(name)) IN ('en construcción', 'en construccion', 'planificación', 'planificacion')
        ORDER BY CASE
          WHEN LOWER(TRIM(name)) IN ('en construcción', 'en construccion') THEN 1
          ELSE 2
        END
        LIMIT 1
      )
      UPDATE properties p
      SET property_status_id = fallback_status.id
      FROM property_status ps, fallback_status
      WHERE p.property_status_id = ps.id
        AND LOWER(TRIM(ps.name)) IN ('disponible', 'available', 'reservado', 'reserved', 'vendido', 'sold', 'comprado');
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping properties sale_status compatibility updates: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Skipping properties sale_status compatibility updates: column public.properties.sale_status does not exist.';
  END IF;
END $$;

-- Clients table (linked to users)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assigned_seller_id INTEGER REFERENCES sellers(id), -- Now references sellers table
    contract_signed BOOLEAN DEFAULT false,
    contract_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Purchases table (registro de compra de propiedades por clientes)
CREATE TABLE IF NOT EXISTS property_purchases (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES sellers(id),          -- vendedor que atendió la compra
    real_estate_id INTEGER REFERENCES real_estates(id), -- inmobiliaria a la que pertenece la compra
    final_price DECIMAL(15,2),                          -- precio final negociado para esta compra
    final_down_payment_percentage DECIMAL(5,2) NOT NULL, -- porcentaje de entrada acordado en la compra
    final_installments INTEGER NOT NULL,                 -- número de cuotas acordado en la compra
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, property_id) -- Una propiedad no puede estar duplicada para el mismo cliente
);

SELECT pg_temp.codex_add_column_if_owner(
  'property_purchases',
  'seller_id',
  'ALTER TABLE public.property_purchases ADD COLUMN seller_id INTEGER REFERENCES public.sellers(id)'
);
SELECT pg_temp.codex_add_column_if_owner(
  'property_purchases',
  'real_estate_id',
  'ALTER TABLE public.property_purchases ADD COLUMN real_estate_id INTEGER REFERENCES public.real_estates(id)'
);
SELECT pg_temp.codex_add_column_if_owner(
  'property_purchases',
  'final_price',
  'ALTER TABLE public.property_purchases ADD COLUMN final_price DECIMAL(15,2)'
);
SELECT pg_temp.codex_add_column_if_owner(
  'property_purchases',
  'notes',
  'ALTER TABLE public.property_purchases ADD COLUMN notes TEXT'
);
SELECT pg_temp.codex_add_column_if_owner(
  'property_purchases',
  'commercial_status',
  'ALTER TABLE public.property_purchases ADD COLUMN commercial_status VARCHAR(30) NOT NULL DEFAULT ''prospect'''
);
SELECT pg_temp.codex_add_column_if_owner(
  'property_purchases',
  'down_payment_percentage',
  'ALTER TABLE public.property_purchases ADD COLUMN down_payment_percentage DECIMAL(5,2)'
);
SELECT pg_temp.codex_add_column_if_owner(
  'property_purchases',
  'down_payment_amount',
  'ALTER TABLE public.property_purchases ADD COLUMN down_payment_amount DECIMAL(15,2)'
);
SELECT pg_temp.codex_add_column_if_owner(
  'property_purchases',
  'stage_paid_amount',
  'ALTER TABLE public.property_purchases ADD COLUMN stage_paid_amount DECIMAL(15,2) DEFAULT 0'
);
SELECT pg_temp.codex_add_column_if_owner(
  'property_purchases',
  'remaining_down_payment_amount',
  'ALTER TABLE public.property_purchases ADD COLUMN remaining_down_payment_amount DECIMAL(15,2)'
);

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

-- Payment Schedules table (cabecera de tabla de amortización)
-- Each property purchase has one active schedule. When an abono de capital is processed,
-- the current schedule is deactivated and a new one is created with the recalculated balance.
CREATE TABLE IF NOT EXISTS payment_schedules (
    id SERIAL PRIMARY KEY,
    property_purchase_id INTEGER NOT NULL REFERENCES property_purchases(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    total_amount DECIMAL(15,2) NOT NULL,      -- total amount financed in this schedule
    installments_count INTEGER NOT NULL,       -- number of installments in this schedule
    is_active BOOLEAN DEFAULT true,            -- only the latest schedule is active
    abono_id INTEGER,                          -- NULL for the initial schedule; set when generated by an abono
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT pg_temp.codex_add_column_if_owner(
  'payment_schedules',
  'abono_id',
  'ALTER TABLE public.payment_schedules ADD COLUMN abono_id INTEGER'
);

-- Installments table
CREATE TABLE IF NOT EXISTS installments (
    id SERIAL PRIMARY KEY,
    payment_schedule_id INTEGER REFERENCES payment_schedules(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    property_purchase_id INTEGER REFERENCES property_purchases(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, late
    installment_type VARCHAR(30) NOT NULL DEFAULT 'down_payment_balance',
    display_label VARCHAR(120),
    display_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payment_schedule_id, installment_number)
);

SELECT pg_temp.codex_add_column_if_owner(
  'installments',
  'payment_schedule_id',
  'ALTER TABLE public.installments ADD COLUMN payment_schedule_id INTEGER REFERENCES public.payment_schedules(id) ON DELETE CASCADE'
);
SELECT pg_temp.codex_add_column_if_owner(
  'installments',
  'property_purchase_id',
  'ALTER TABLE public.installments ADD COLUMN property_purchase_id INTEGER REFERENCES public.property_purchases(id) ON DELETE CASCADE'
);
SELECT pg_temp.codex_add_column_if_owner(
  'installments',
  'installment_type',
  'ALTER TABLE public.installments ADD COLUMN installment_type VARCHAR(30) NOT NULL DEFAULT ''down_payment_balance'''
);
SELECT pg_temp.codex_add_column_if_owner(
  'installments',
  'display_label',
  'ALTER TABLE public.installments ADD COLUMN display_label VARCHAR(120)'
);
SELECT pg_temp.codex_add_column_if_owner(
  'installments',
  'display_order',
  'ALTER TABLE public.installments ADD COLUMN display_order INTEGER'
);

SELECT pg_temp.codex_drop_constraint_if_owner('installments', 'installments_client_id_installment_number_key');

DO $$
BEGIN
  IF NOT pg_temp.codex_public_column_exists('installments', 'property_purchase_id') THEN
    RAISE NOTICE 'Skipping constraint installments_purchase_installment_unique: column public.installments.property_purchase_id does not exist.';
  ELSIF NOT EXISTS (
    SELECT 1
    FROM installments
    WHERE property_purchase_id IS NOT NULL
    GROUP BY property_purchase_id, installment_number
    HAVING COUNT(*) > 1
  ) THEN
    PERFORM pg_temp.codex_add_constraint_if_owner(
      'installments',
      'installments_purchase_installment_unique',
      'ALTER TABLE public.installments ADD CONSTRAINT installments_purchase_installment_unique UNIQUE (property_purchase_id, installment_number)'
    );
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'installments_purchase_installment_unique'
  ) THEN
    RAISE NOTICE 'Skipping constraint installments_purchase_installment_unique: duplicate historical installments exist for the same property_purchase_id and installment_number.';
  END IF;
END $$;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    installment_id INTEGER REFERENCES installments(id) ON DELETE CASCADE,
    purchase_stage_id INTEGER REFERENCES client_purchase_stages(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) NOT NULL, -- bank_transfer, deposit
    reference_number VARCHAR(100), -- transaction reference
    proof_file_path VARCHAR(500), -- Cloudinary URL (or local path for legacy /upload endpoint)
    proof_cloudinary_url VARCHAR(1000), -- full Cloudinary secure URL
    proof_cloudinary_public_id VARCHAR(500), -- Cloudinary public_id for deletion
    ocr_data JSONB, -- raw extracted data from OCR service
    ocr_matched_template VARCHAR(100), -- bank template matched by OCR
    payment_type VARCHAR(30) NOT NULL DEFAULT 'installment',
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by INTEGER REFERENCES users(id), -- who approved the payment
    approved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT pg_temp.codex_add_column_if_owner(
  'payments',
  'purchase_stage_id',
  'ALTER TABLE public.payments ADD COLUMN purchase_stage_id INTEGER REFERENCES public.client_purchase_stages(id) ON DELETE SET NULL'
);
SELECT pg_temp.codex_add_column_if_owner(
  'payments',
  'payment_type',
  'ALTER TABLE public.payments ADD COLUMN payment_type VARCHAR(30) NOT NULL DEFAULT ''installment'''
);

DO $$
BEGIN
  IF pg_temp.codex_can_manage_public_relation('payments') THEN
    ALTER TABLE public.payments ALTER COLUMN installment_id DROP NOT NULL;
  END IF;
EXCEPTION
  WHEN undefined_column OR undefined_table OR insufficient_privilege THEN
    RAISE NOTICE 'Skipping payments.installment_id nullable migration: %', SQLERRM;
END $$;

SELECT pg_temp.codex_add_column_if_owner(
  'payments',
  'proof_cloudinary_url',
  'ALTER TABLE public.payments ADD COLUMN proof_cloudinary_url VARCHAR(1000)'
);
SELECT pg_temp.codex_add_column_if_owner(
  'payments',
  'proof_cloudinary_public_id',
  'ALTER TABLE public.payments ADD COLUMN proof_cloudinary_public_id VARCHAR(500)'
);
SELECT pg_temp.codex_add_column_if_owner(
  'payments',
  'ocr_data',
  'ALTER TABLE public.payments ADD COLUMN ocr_data JSONB'
);
SELECT pg_temp.codex_add_column_if_owner(
  'payments',
  'ocr_matched_template',
  'ALTER TABLE public.payments ADD COLUMN ocr_matched_template VARCHAR(100)'
);

-- Payment Email Logs table
CREATE TABLE IF NOT EXISTS payment_email_logs (
    id SERIAL PRIMARY KEY,
    installment_id INTEGER REFERENCES installments(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'sent',
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
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
SELECT pg_temp.codex_create_index_if_owner('users', 'idx_users_email', 'CREATE INDEX idx_users_email ON public.users(email)');
SELECT pg_temp.codex_create_index_if_owner('users', 'idx_users_role', 'CREATE INDEX idx_users_role ON public.users(role_id)');
SELECT pg_temp.codex_create_index_if_owner('users', 'idx_users_real_estate', 'CREATE INDEX idx_users_real_estate ON public.users(real_estate_id)');
SELECT pg_temp.codex_create_index_if_owner('sellers', 'idx_sellers_user', 'CREATE INDEX idx_sellers_user ON public.sellers(user_id)');
SELECT pg_temp.codex_create_index_if_owner('phases', 'idx_phases_real_estate', 'CREATE INDEX idx_phases_real_estate ON public.phases(real_estate_id)');
SELECT pg_temp.codex_create_index_if_owner('phases', 'idx_phases_type', 'CREATE INDEX idx_phases_type ON public.phases(phase_type_id)');
SELECT pg_temp.codex_create_index_if_owner('property_models', 'idx_property_models_real_estate', 'CREATE INDEX idx_property_models_real_estate ON public.property_models(real_estate_id)');
SELECT pg_temp.codex_create_index_if_owner('property_models', 'idx_property_models_type', 'CREATE INDEX idx_property_models_type ON public.property_models(property_type_id)');
SELECT pg_temp.codex_create_index_if_owner('blocks', 'idx_blocks_phase', 'CREATE INDEX idx_blocks_phase ON public.blocks(phase_id)');
SELECT pg_temp.codex_create_index_if_owner('units', 'idx_units_block', 'CREATE INDEX idx_units_block ON public.units(block_id)');
SELECT pg_temp.codex_create_index_if_owner('units', 'idx_units_status', 'CREATE INDEX idx_units_status ON public.units(property_status_id)');
SELECT pg_temp.codex_create_index_if_owner('properties', 'idx_properties_model', 'CREATE INDEX idx_properties_model ON public.properties(property_model_id)');
SELECT pg_temp.codex_create_index_if_owner('properties', 'idx_properties_unit', 'CREATE INDEX idx_properties_unit ON public.properties(unit_id)');
SELECT pg_temp.codex_create_index_if_owner('properties', 'idx_properties_status', 'CREATE INDEX idx_properties_status ON public.properties(property_status_id)');
SELECT pg_temp.codex_create_index_if_owner('properties', 'idx_properties_sale_status', 'CREATE INDEX idx_properties_sale_status ON public.properties(sale_status)');
SELECT pg_temp.codex_create_index_if_owner('clients', 'idx_clients_user', 'CREATE INDEX idx_clients_user ON public.clients(user_id)');
SELECT pg_temp.codex_create_index_if_owner('clients', 'idx_clients_seller', 'CREATE INDEX idx_clients_seller ON public.clients(assigned_seller_id)');
SELECT pg_temp.codex_create_index_if_owner('property_purchases', 'idx_property_purchases_client', 'CREATE INDEX idx_property_purchases_client ON public.property_purchases(client_id)');
SELECT pg_temp.codex_create_index_if_owner('property_purchases', 'idx_property_purchases_property', 'CREATE INDEX idx_property_purchases_property ON public.property_purchases(property_id)');
SELECT pg_temp.codex_create_index_if_owner('property_purchases', 'idx_property_purchases_seller', 'CREATE INDEX idx_property_purchases_seller ON public.property_purchases(seller_id)');
SELECT pg_temp.codex_create_index_if_owner('property_purchases', 'idx_property_purchases_real_estate', 'CREATE INDEX idx_property_purchases_real_estate ON public.property_purchases(real_estate_id)');
SELECT pg_temp.codex_create_index_if_owner('purchase_stage_definitions', 'idx_purchase_stage_definitions_real_estate', 'CREATE INDEX idx_purchase_stage_definitions_real_estate ON public.purchase_stage_definitions(real_estate_id, sort_order)');
SELECT pg_temp.codex_create_index_if_owner('property_stage_overrides', 'idx_property_stage_overrides_property', 'CREATE INDEX idx_property_stage_overrides_property ON public.property_stage_overrides(property_id)');
SELECT pg_temp.codex_create_index_if_owner('client_purchase_stages', 'idx_client_purchase_stages_purchase', 'CREATE INDEX idx_client_purchase_stages_purchase ON public.client_purchase_stages(property_purchase_id, sort_order)');
SELECT pg_temp.codex_create_index_if_owner('client_purchase_stages', 'idx_client_purchase_stages_client', 'CREATE INDEX idx_client_purchase_stages_client ON public.client_purchase_stages(client_id)');
SELECT pg_temp.codex_create_index_if_owner('installments', 'idx_installments_client', 'CREATE INDEX idx_installments_client ON public.installments(client_id)');
SELECT pg_temp.codex_create_index_if_owner('installments', 'idx_installments_due_date', 'CREATE INDEX idx_installments_due_date ON public.installments(due_date)');
SELECT pg_temp.codex_create_index_if_owner('payments', 'idx_payments_installment', 'CREATE INDEX idx_payments_installment ON public.payments(installment_id)');
SELECT pg_temp.codex_create_index_if_owner('payments', 'idx_payments_client', 'CREATE INDEX idx_payments_client ON public.payments(client_id)');
SELECT pg_temp.codex_create_index_if_owner('payments', 'idx_payments_purchase_stage', 'CREATE INDEX idx_payments_purchase_stage ON public.payments(purchase_stage_id)');
SELECT pg_temp.codex_create_index_if_owner('payment_email_logs', 'idx_payment_email_logs_installment', 'CREATE INDEX idx_payment_email_logs_installment ON public.payment_email_logs(installment_id)');
SELECT pg_temp.codex_create_index_if_owner('payment_email_logs', 'idx_payment_email_logs_sent_by', 'CREATE INDEX idx_payment_email_logs_sent_by ON public.payment_email_logs(sent_by)');
SELECT pg_temp.codex_create_index_if_owner('notifications', 'idx_notifications_recipient', 'CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id)');
SELECT pg_temp.codex_create_index_if_owner('notifications', 'idx_notifications_created', 'CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC)');

-- ─── Abono (Capital Payment) Table ──────────────────────────────────────────
-- Records each capital lump-sum payment event. When processed, the active
-- payment_schedule is deactivated and a new one is created with the recalculated
-- remaining balance. Old installments are preserved (linked to the old schedule).

CREATE TABLE IF NOT EXISTS abonos (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    property_purchase_id INTEGER NOT NULL REFERENCES property_purchases(id),
    previous_schedule_id INTEGER REFERENCES payment_schedules(id),  -- schedule that was active before this abono
    new_schedule_id INTEGER REFERENCES payment_schedules(id),       -- schedule created by this abono
    abono_amount DECIMAL(15,2) NOT NULL,
    abono_type VARCHAR(20) NOT NULL,  -- 'reduce_amount' | 'reduce_term'
    remaining_balance_before DECIMAL(15,2),
    remaining_balance_after DECIMAL(15,2),
    installments_count_before INTEGER,
    installments_count_after INTEGER,
    proof_file_path VARCHAR(500),
    proof_cloudinary_url VARCHAR(1000),
    proof_cloudinary_public_id VARCHAR(500),
    processed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add FK from payment_schedules to abonos (deferred to avoid circular dependency)
SELECT pg_temp.codex_add_constraint_if_owner(
  'payment_schedules',
  'fk_payment_schedules_abono',
  'ALTER TABLE public.payment_schedules ADD CONSTRAINT fk_payment_schedules_abono FOREIGN KEY (abono_id) REFERENCES public.abonos(id) NOT VALID'
);

-- Indexes for abono / payment_schedules tables
SELECT pg_temp.codex_create_index_if_owner('abonos', 'idx_abonos_client', 'CREATE INDEX idx_abonos_client ON public.abonos(client_id)');
SELECT pg_temp.codex_create_index_if_owner('abonos', 'idx_abonos_purchase', 'CREATE INDEX idx_abonos_purchase ON public.abonos(property_purchase_id)');
SELECT pg_temp.codex_create_index_if_owner('payment_schedules', 'idx_payment_schedules_purchase', 'CREATE INDEX idx_payment_schedules_purchase ON public.payment_schedules(property_purchase_id)');
SELECT pg_temp.codex_create_index_if_owner('payment_schedules', 'idx_payment_schedules_active', 'CREATE INDEX idx_payment_schedules_active ON public.payment_schedules(property_purchase_id, is_active)');
SELECT pg_temp.codex_create_index_if_owner('installments', 'idx_installments_schedule', 'CREATE INDEX idx_installments_schedule ON public.installments(payment_schedule_id)');

-- Triggers for updated_at timestamps
DO $$
DECLARE
  function_exists BOOLEAN;
  can_manage_function BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    INNER JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_updated_at_column'
      AND pg_get_function_identity_arguments(p.oid) = ''
  )
  INTO function_exists;

  SELECT COALESCE(pg_has_role(p.proowner, 'USAGE'), true)
  INTO can_manage_function
  FROM pg_proc p
  INNER JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'update_updated_at_column'
    AND pg_get_function_identity_arguments(p.oid) = '';

  IF NOT function_exists OR can_manage_function THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $body$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $body$ language 'plpgsql'
    $fn$;
  ELSE
    RAISE NOTICE 'Skipping function update_updated_at_column: current user (%) is not owner of the existing function.', current_user;
  END IF;
END $$;

SELECT pg_temp.codex_recreate_trigger_if_owner('users', 'update_users_updated_at', 'CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('sellers', 'update_sellers_updated_at', 'CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('real_estates', 'update_real_estates_updated_at', 'CREATE TRIGGER update_real_estates_updated_at BEFORE UPDATE ON public.real_estates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('phases', 'update_phases_updated_at', 'CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON public.phases FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('property_models', 'update_property_models_updated_at', 'CREATE TRIGGER update_property_models_updated_at BEFORE UPDATE ON public.property_models FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('blocks', 'update_blocks_updated_at', 'CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON public.blocks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('units', 'update_units_updated_at', 'CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('properties', 'update_properties_updated_at', 'CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('clients', 'update_clients_updated_at', 'CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('purchase_stage_definitions', 'update_purchase_stage_definitions_updated_at', 'CREATE TRIGGER update_purchase_stage_definitions_updated_at BEFORE UPDATE ON public.purchase_stage_definitions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('property_stage_overrides', 'update_property_stage_overrides_updated_at', 'CREATE TRIGGER update_property_stage_overrides_updated_at BEFORE UPDATE ON public.property_stage_overrides FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('client_purchase_stages', 'update_client_purchase_stages_updated_at', 'CREATE TRIGGER update_client_purchase_stages_updated_at BEFORE UPDATE ON public.client_purchase_stages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('installments', 'update_installments_updated_at', 'CREATE TRIGGER update_installments_updated_at BEFORE UPDATE ON public.installments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('payments', 'update_payments_updated_at', 'CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');

-- Menu Options table
CREATE TABLE IF NOT EXISTS menu_options (
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

SELECT pg_temp.codex_sync_serial_sequence('menu_options');

-- Role Menu Options table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS role_menu_options (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    menu_option_id INTEGER REFERENCES menu_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, menu_option_id)
);

SELECT pg_temp.codex_sync_serial_sequence('role_menu_options');

-- Insert default menu options without touching existing rows
INSERT INTO menu_options (name, label, path, icon, sort_order)
SELECT seed.name, seed.label, seed.path, seed.icon, seed.sort_order
FROM (VALUES
  -- System Admin menus
  ('admin_dashboard', 'Dashboard', '/admin/dashboard', 'dashboard', 1),
  ('admin_real_estates', 'Inmobiliarias', '/admin/real-estates', 'building', 2),
  ('admin_users', 'Usuarios', '/admin/users', 'users', 3),
  ('admin_menu_options', 'Gestión de Menús', '/admin/menu-options', 'list', 4),
  ('admin_role_menu_options', 'Menús por Rol', '/admin/role-menu-options', 'user-cog', 5),
  ('admin_roles', 'Administración de Roles', '/admin/roles', 'shield', 6),
  ('admin_user_roles', 'Asignación de Roles', '/admin/user-roles', 'user-shield', 7),
  ('admin_permissions', 'Gestión de Permisos', '/admin/permissions', 'key', 8),
  ('admin_role_permissions', 'Permisos por Rol', '/admin/role-permissions', 'user-lock', 9),

  -- Real Estate Admin menus
  ('real_estate_dashboard', 'Dashboard', '/real-estate-admin/dashboard', 'dashboard', 1),
  ('real_estate_properties', 'Propiedades', '/real-estate-admin/properties', 'home', 2),
  ('real_estate_clients', 'Clientes', '/real-estate-admin/clients', 'users', 3),
  ('real_estate_sellers', 'Vendedores', '/real-estate-admin/sellers', 'user-check', 4),
  ('real_estate_purchase_stages', 'Fases Comerciales', '/real-estate-admin/purchase-stages', 'list', 5),
  ('real_estate_users', 'Usuarios', '/real-estate-admin/users', 'user-plus', 6),

  -- Seller menus
  ('seller_dashboard', 'Dashboard', '/seller/dashboard', 'dashboard', 1),
  ('seller_clients', 'Mis Clientes', '/seller/clients', 'users', 2),
  ('seller_payments', 'Pagos', '/seller/payments', 'credit-card', 3),

  -- Client menus
  ('client_dashboard', 'Dashboard', '/client/dashboard', 'dashboard', 1),
  ('client_payments', 'Mis Pagos', '/client/payments', 'credit-card', 2),
  ('client_installments', 'Cuotas', '/client/installments', 'calendar', 3)
) AS seed(name, label, path, icon, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM menu_options mo WHERE mo.name = seed.name
);

-- Assign menu options to roles
-- System Admin gets all admin menus
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r,
  (SELECT DISTINCT ON (name) id, name FROM menu_options ORDER BY name, id) mo
WHERE r.name = 'system_admin' AND mo.name LIKE 'admin_%'
  AND NOT EXISTS (
    SELECT 1
    FROM role_menu_options rmo
    WHERE rmo.role_id = r.id AND rmo.menu_option_id = mo.id
  );

-- Real Estate Admin gets real estate admin menus
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r,
  (SELECT DISTINCT ON (name) id, name FROM menu_options ORDER BY name, id) mo
WHERE r.name = 'real_estate_admin' AND mo.name LIKE 'real_estate_%'
  AND NOT EXISTS (
    SELECT 1
    FROM role_menu_options rmo
    WHERE rmo.role_id = r.id AND rmo.menu_option_id = mo.id
  );

-- Seller gets seller menus
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r,
  (SELECT DISTINCT ON (name) id, name FROM menu_options ORDER BY name, id) mo
WHERE r.name = 'seller' AND mo.name LIKE 'seller_%'
  AND NOT EXISTS (
    SELECT 1
    FROM role_menu_options rmo
    WHERE rmo.role_id = r.id AND rmo.menu_option_id = mo.id
  );

-- Client gets client menus
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r,
  (SELECT DISTINCT ON (name) id, name FROM menu_options ORDER BY name, id) mo
WHERE r.name = 'client' AND mo.name LIKE 'client_%'
  AND NOT EXISTS (
    SELECT 1
    FROM role_menu_options rmo
    WHERE rmo.role_id = r.id AND rmo.menu_option_id = mo.id
  );

-- Add Sellers menu option for Real Estate Admin
INSERT INTO menu_options (name, label, path, icon, sort_order)
SELECT 'real_estate_sellers_component', 'Administrar Vendedores', './real-estate-admin/sellers/sellers.component', 'user-check', 5
WHERE NOT EXISTS (
  SELECT 1 FROM menu_options WHERE name = 'real_estate_sellers_component'
);

-- Assign Sellers component to real_estate_admin role
INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r,
  (SELECT DISTINCT ON (name) id, name FROM menu_options ORDER BY name, id) mo
WHERE r.name = 'real_estate_admin' AND mo.name = 'real_estate_sellers_component'
  AND NOT EXISTS (
    SELECT 1
    FROM role_menu_options rmo
    WHERE rmo.role_id = r.id AND rmo.menu_option_id = mo.id
  );

-- Indexes for menu options
SELECT pg_temp.codex_create_index_if_owner('menu_options', 'idx_menu_options_parent', 'CREATE INDEX idx_menu_options_parent ON public.menu_options(parent_id)');
SELECT pg_temp.codex_create_index_if_owner('menu_options', 'idx_menu_options_active', 'CREATE INDEX idx_menu_options_active ON public.menu_options(is_active)');
SELECT pg_temp.codex_create_index_if_owner('role_menu_options', 'idx_role_menu_options_role', 'CREATE INDEX idx_role_menu_options_role ON public.role_menu_options(role_id)');
SELECT pg_temp.codex_create_index_if_owner('role_menu_options', 'idx_role_menu_options_menu', 'CREATE INDEX idx_role_menu_options_menu ON public.role_menu_options(menu_option_id)');

-- Trigger for menu_options updated_at
SELECT pg_temp.codex_recreate_trigger_if_owner('menu_options', 'update_menu_options_updated_at', 'CREATE TRIGGER update_menu_options_updated_at BEFORE UPDATE ON public.menu_options FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');

-- Components table (catalog)
CREATE TABLE IF NOT EXISTS components (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT pg_temp.codex_sync_serial_sequence('components');

-- Actions table (catalog)
CREATE TABLE IF NOT EXISTS actions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT pg_temp.codex_sync_serial_sequence('actions');

-- Insert default components
INSERT INTO components (name, description)
SELECT seed.name, seed.description
FROM (VALUES
  ('properties', 'Gestión de propiedades'),
  ('users', 'Gestión de usuarios'),
  ('real_estates', 'Gestión de inmobiliarias'),
  ('purchase_stages', 'Gestión de fases comerciales')
) AS seed(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM components c WHERE c.name = seed.name
);

-- Insert default actions
INSERT INTO actions (name, description)
SELECT seed.name, seed.description
FROM (VALUES
  ('view', 'Ver/Consultar registros'),
  ('create', 'Crear nuevos registros'),
  ('edit', 'Editar registros existentes'),
  ('delete', 'Eliminar registros')
) AS seed(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM actions a WHERE a.name = seed.name
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    component_id INTEGER REFERENCES components(id) ON DELETE CASCADE,
    action_id INTEGER REFERENCES actions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(component_id, action_id)
);

SELECT pg_temp.codex_sync_serial_sequence('permissions');

-- Role Permissions table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

SELECT pg_temp.codex_sync_serial_sequence('role_permissions');

-- Insert default permissions
INSERT INTO permissions (name, description, component_id, action_id)
SELECT 
    CONCAT(c.name, '_', a.name) as name,
    CONCAT('Puede ', a.description, ' en ', c.description) as description,
    c.id as component_id,
    a.id as action_id
FROM components c
CROSS JOIN actions a
WHERE c.name IN ('properties', 'users', 'purchase_stages')
  AND NOT EXISTS (
    SELECT 1
    FROM permissions p
    WHERE p.component_id = c.id AND p.action_id = a.id
  );

-- Assign permissions to roles
-- System Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'system_admin'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Real Estate Admin gets properties and commercial stage permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
INNER JOIN components c ON p.component_id = c.id
WHERE r.name = 'real_estate_admin' AND c.name IN ('properties', 'purchase_stages')
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Seller gets view-only properties permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
INNER JOIN components c ON p.component_id = c.id
INNER JOIN actions a ON p.action_id = a.id
WHERE r.name = 'seller' AND c.name = 'properties' AND a.name = 'view'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Client gets no permissions (for now)
-- No permissions assigned to client role

-- Indexes for components and actions
SELECT pg_temp.codex_create_index_if_owner('components', 'idx_components_name', 'CREATE INDEX idx_components_name ON public.components(name)');
SELECT pg_temp.codex_create_index_if_owner('components', 'idx_components_active', 'CREATE INDEX idx_components_active ON public.components(is_active)');
SELECT pg_temp.codex_create_index_if_owner('actions', 'idx_actions_name', 'CREATE INDEX idx_actions_name ON public.actions(name)');
SELECT pg_temp.codex_create_index_if_owner('actions', 'idx_actions_active', 'CREATE INDEX idx_actions_active ON public.actions(is_active)');

-- Indexes for permissions
SELECT pg_temp.codex_create_index_if_owner('permissions', 'idx_permissions_component', 'CREATE INDEX idx_permissions_component ON public.permissions(component_id)');
SELECT pg_temp.codex_create_index_if_owner('permissions', 'idx_permissions_action', 'CREATE INDEX idx_permissions_action ON public.permissions(action_id)');
SELECT pg_temp.codex_create_index_if_owner('role_permissions', 'idx_role_permissions_role', 'CREATE INDEX idx_role_permissions_role ON public.role_permissions(role_id)');
SELECT pg_temp.codex_create_index_if_owner('role_permissions', 'idx_role_permissions_permission', 'CREATE INDEX idx_role_permissions_permission ON public.role_permissions(permission_id)');

-- Triggers for updated_at
SELECT pg_temp.codex_recreate_trigger_if_owner('components', 'update_components_updated_at', 'CREATE TRIGGER update_components_updated_at BEFORE UPDATE ON public.components FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('actions', 'update_actions_updated_at', 'CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON public.actions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');
SELECT pg_temp.codex_recreate_trigger_if_owner('permissions', 'update_permissions_updated_at', 'CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');

-- Function to update phase statistics
DO $$
DECLARE
  function_exists BOOLEAN;
  can_manage_function BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    INNER JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_phase_statistics'
      AND pg_get_function_identity_arguments(p.oid) = ''
  )
  INTO function_exists;

  SELECT COALESCE(pg_has_role(p.proowner, 'USAGE'), true)
  INTO can_manage_function
  FROM pg_proc p
  INNER JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'update_phase_statistics'
    AND pg_get_function_identity_arguments(p.oid) = '';

  IF NOT function_exists OR can_manage_function THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.update_phase_statistics()
      RETURNS TRIGGER AS $body$
      DECLARE
          target_phase_id INTEGER;
          old_phase_id INTEGER;
          new_phase_id INTEGER;
      BEGIN
          old_phase_id := NULL;
          new_phase_id := NULL;

          IF TG_TABLE_NAME = 'blocks' THEN
              IF TG_OP IN ('INSERT', 'UPDATE') THEN
                  new_phase_id := NEW.phase_id;
              END IF;
              IF TG_OP IN ('UPDATE', 'DELETE') THEN
                  old_phase_id := OLD.phase_id;
              END IF;
          ELSIF TG_TABLE_NAME = 'units' THEN
              IF TG_OP IN ('INSERT', 'UPDATE') THEN
                  SELECT b.phase_id INTO new_phase_id
                  FROM public.blocks b
                  WHERE b.id = NEW.block_id;
              END IF;
              IF TG_OP IN ('UPDATE', 'DELETE') THEN
                  SELECT b.phase_id INTO old_phase_id
                  FROM public.blocks b
                  WHERE b.id = OLD.block_id;
              END IF;
          END IF;

          FOREACH target_phase_id IN ARRAY ARRAY[old_phase_id, new_phase_id]
          LOOP
              IF target_phase_id IS NULL THEN
                  CONTINUE;
              END IF;

              UPDATE public.phases ph
              SET
                  total_units = (
                      SELECT COUNT(*)
                      FROM public.units u
                      INNER JOIN public.blocks b ON b.id = u.block_id
                      WHERE b.phase_id = target_phase_id
                  ),
                  available_units = (
                      SELECT COUNT(*)
                      FROM public.units u
                      INNER JOIN public.blocks b ON b.id = u.block_id
                      LEFT JOIN public.properties p ON p.unit_id = u.id
                      WHERE b.phase_id = target_phase_id
                      AND COALESCE(p.sale_status, 'available') = 'available'
                  ),
                  sold_units = (
                      SELECT COUNT(*)
                      FROM public.units u
                      INNER JOIN public.blocks b ON b.id = u.block_id
                      LEFT JOIN public.properties p ON p.unit_id = u.id
                      WHERE b.phase_id = target_phase_id
                      AND p.sale_status = 'sold'
                  )
              WHERE ph.id = target_phase_id;
          END LOOP;

          RETURN COALESCE(NEW, OLD);
      END;
      $body$ language 'plpgsql'
    $fn$;
  ELSE
    RAISE NOTICE 'Skipping function update_phase_statistics: current user (%) is not owner of the existing function.', current_user;
  END IF;
END $$;

-- Triggers to update statistics
SELECT pg_temp.codex_recreate_trigger_if_owner(
  'units',
  'update_phase_stats_on_unit_change',
  'CREATE TRIGGER update_phase_stats_on_unit_change AFTER INSERT OR UPDATE OR DELETE ON public.units FOR EACH ROW EXECUTE PROCEDURE update_phase_statistics()'
);

SELECT pg_temp.codex_recreate_trigger_if_owner(
  'blocks',
  'update_phase_stats_on_block_change',
  'CREATE TRIGGER update_phase_stats_on_block_change AFTER INSERT OR UPDATE OR DELETE ON public.blocks FOR EACH ROW EXECUTE PROCEDURE update_phase_statistics()'
);

-- View for complete property information
SELECT pg_temp.codex_replace_view_if_owner('property_details', $view$
CREATE VIEW public.property_details AS
SELECT 
    p.id,
    p.property_status_id,
    p.sale_status,
    pm.name as model_name,
    pt.name as property_type,
    u.identifier as unit_identifier,
    u.unit_number,
    b.name as block_name,
    ph.name as phase_name,
    pht.name as phase_type,
    re.name as real_estate_name,
    ps.name as construction_status,
    ps.color as construction_status_color,
    CASE p.sale_status
        WHEN 'reserved' THEN 'Reservado'
        WHEN 'sold' THEN 'Vendido'
        ELSE 'Disponible'
    END as status,
    CASE p.sale_status
        WHEN 'reserved' THEN '#ffc107'
        WHEN 'sold' THEN '#dc3545'
        ELSE '#28a745'
    END as status_color,
    p.land_area_sqm,
    p.custom_price as final_price,
    p.custom_down_payment_percentage as final_down_payment_percentage,
    p.custom_installments as final_installments,
    CASE
        WHEN p.custom_price IS NOT NULL
            AND p.custom_down_payment_percentage IS NOT NULL
            AND p.custom_installments IS NOT NULL
            AND p.custom_installments > 0
        THEN (p.custom_price * p.custom_down_payment_percentage / 100.0) / p.custom_installments
        ELSE NULL
    END as final_installment_amount,
    pm.area_sqm,
    pm.bedrooms,
    pm.bathrooms,
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
LEFT JOIN property_status ps ON p.property_status_id = ps.id
$view$);

-- View for phase summary
SELECT pg_temp.codex_replace_view_if_owner('phase_summary', $view$
CREATE VIEW public.phase_summary AS
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
GROUP BY ph.id, pht.name, re.name
$view$);

-- View for block summary
SELECT pg_temp.codex_replace_view_if_owner('block_summary', $view$
CREATE VIEW public.block_summary AS
SELECT 
    b.id,
    b.name,
    b.description,
    ph.name as phase_name,
    pht.name as phase_type,
    re.name as real_estate_name,
    COUNT(u.id) as total_units,
    COUNT(u.id) FILTER (WHERE COALESCE(p.sale_status, 'available') = 'available') as available_units,
    COUNT(u.id) FILTER (WHERE p.sale_status = 'sold') as sold_units,
    (
        COUNT(u.id) FILTER (WHERE p.sale_status = 'sold')::decimal /
        NULLIF(COUNT(u.id), 0) * 100
    ) as sales_percentage,
    COUNT(u.id) as actual_units_count,
    b.created_at,
    b.updated_at
FROM blocks b
LEFT JOIN phases ph ON b.phase_id = ph.id
LEFT JOIN phase_types pht ON ph.phase_type_id = pht.id
LEFT JOIN real_estates re ON ph.real_estate_id = re.id
LEFT JOIN units u ON b.id = u.block_id
LEFT JOIN properties p ON p.unit_id = u.id
GROUP BY b.id, ph.name, pht.name, re.name
$view$);
