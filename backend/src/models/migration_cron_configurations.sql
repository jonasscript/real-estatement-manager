-- Cron configuration per real estate (ciudadela)

CREATE TABLE IF NOT EXISTS cron_configurations (
    id SERIAL PRIMARY KEY,
    real_estate_id INTEGER NOT NULL REFERENCES real_estates(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    job_type VARCHAR(50) NOT NULL DEFAULT 'PAYMENT_REMINDER'
        CHECK (job_type IN ('PAYMENT_REMINDER', 'OVERDUE_PAYMENT', 'CLIENT_BIRTHDAY')),
    frequency VARCHAR(20) NOT NULL DEFAULT 'daily'
        CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    day_of_week SMALLINT
        CHECK (day_of_week BETWEEN 0 AND 6),
    day_of_month SMALLINT
        CHECK (day_of_month BETWEEN 1 AND 31),
    time_of_day TIME NOT NULL DEFAULT '08:00:00',
    is_active BOOLEAN DEFAULT true,
    notify_email BOOLEAN NOT NULL DEFAULT false,
    notify_whatsapp BOOLEAN NOT NULL DEFAULT false,
    last_execution_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING'
        CHECK (status IN ('WAITING', 'RUNNING', 'SUCCESS', 'FAILED')),
    last_result TEXT,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(real_estate_id, name)
);

ALTER TABLE cron_configurations ADD COLUMN IF NOT EXISTS last_execution_at TIMESTAMP;
ALTER TABLE cron_configurations ADD COLUMN IF NOT EXISTS next_execution_at TIMESTAMP;
ALTER TABLE cron_configurations ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'WAITING'
  CHECK (status IN ('WAITING', 'RUNNING', 'SUCCESS', 'FAILED'));

-- Fix up databases that already ran this migration with the old lowercase status values
ALTER TABLE cron_configurations DROP CONSTRAINT IF EXISTS cron_configurations_status_check;

UPDATE cron_configurations SET status = 'WAITING' WHERE status = 'idle';
UPDATE cron_configurations SET status = 'RUNNING' WHERE status = 'running';
UPDATE cron_configurations SET status = 'SUCCESS' WHERE status = 'success';
UPDATE cron_configurations SET status = 'FAILED' WHERE status = 'failed';

ALTER TABLE cron_configurations ALTER COLUMN status SET DEFAULT 'WAITING';
ALTER TABLE cron_configurations ADD CONSTRAINT cron_configurations_status_check
  CHECK (status IN ('WAITING', 'RUNNING', 'SUCCESS', 'FAILED'));
ALTER TABLE cron_configurations ADD COLUMN IF NOT EXISTS last_result TEXT;
ALTER TABLE cron_configurations ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE cron_configurations ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cron_configurations ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN NOT NULL DEFAULT false;

-- Fix up databases that already ran this migration with a free-text job_type
ALTER TABLE cron_configurations DROP CONSTRAINT IF EXISTS cron_configurations_job_type_check;

UPDATE cron_configurations SET job_type = 'PAYMENT_REMINDER'
  WHERE job_type NOT IN ('PAYMENT_REMINDER', 'OVERDUE_PAYMENT', 'CLIENT_BIRTHDAY');

ALTER TABLE cron_configurations ALTER COLUMN job_type SET DEFAULT 'PAYMENT_REMINDER';
ALTER TABLE cron_configurations ADD CONSTRAINT cron_configurations_job_type_check
  CHECK (job_type IN ('PAYMENT_REMINDER', 'OVERDUE_PAYMENT', 'CLIENT_BIRTHDAY'));

CREATE INDEX IF NOT EXISTS idx_cron_configurations_real_estate ON cron_configurations(real_estate_id);
CREATE INDEX IF NOT EXISTS idx_cron_configurations_active ON cron_configurations(is_active);

INSERT INTO menu_options (name, label, path, icon, sort_order)
SELECT 'real_estate_cron_configurations', 'Configuración de Cron', '/real-estate-admin/cron-configurations', 'clock', 7
WHERE NOT EXISTS (
  SELECT 1 FROM menu_options WHERE name = 'real_estate_cron_configurations'
);

INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r,
  (SELECT DISTINCT ON (name) id, name FROM menu_options ORDER BY name, id) mo
WHERE r.name = 'real_estate_admin' AND mo.name = 'real_estate_cron_configurations'
  AND NOT EXISTS (
    SELECT 1
    FROM role_menu_options rmo
    WHERE rmo.role_id = r.id AND rmo.menu_option_id = mo.id
  );

INSERT INTO menu_options (name, label, path, icon, sort_order)
SELECT 'admin_cron_configurations', 'Configuración de Cron', '/admin/cron-configurations', 'clock', 10
WHERE NOT EXISTS (
  SELECT 1 FROM menu_options WHERE name = 'admin_cron_configurations'
);

INSERT INTO role_menu_options (role_id, menu_option_id)
SELECT r.id, mo.id
FROM roles r,
  (SELECT DISTINCT ON (name) id, name FROM menu_options ORDER BY name, id) mo
WHERE r.name = 'system_admin' AND mo.name = 'admin_cron_configurations'
  AND NOT EXISTS (
    SELECT 1
    FROM role_menu_options rmo
    WHERE rmo.role_id = r.id AND rmo.menu_option_id = mo.id
  );
