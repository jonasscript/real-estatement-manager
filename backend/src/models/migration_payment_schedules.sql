-- ─── Migration: Add payment_schedules (cabecera) table ────────────────────────
-- Run this on an existing database to migrate to the new schedule-based structure.
-- After this migration, each property purchase will have one active payment_schedule
-- and all its installments will reference it.

-- 1. Create payment_schedules table
CREATE TABLE IF NOT EXISTS payment_schedules (
    id SERIAL PRIMARY KEY,
    property_purchase_id INTEGER NOT NULL REFERENCES property_purchases(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    total_amount DECIMAL(15,2) NOT NULL,
    installments_count INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    abono_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add payment_schedule_id column to installments (nullable initially)
ALTER TABLE installments ADD COLUMN IF NOT EXISTS payment_schedule_id INTEGER REFERENCES payment_schedules(id) ON DELETE CASCADE;

-- 3. Create a payment_schedule for each existing property_purchase that has installments
INSERT INTO payment_schedules (property_purchase_id, client_id, total_amount, installments_count, is_active, created_at)
SELECT
    i.property_purchase_id,
    i.client_id,
    SUM(i.amount) AS total_amount,
    COUNT(*) AS installments_count,
    true,
    MIN(i.created_at)
FROM installments i
WHERE i.property_purchase_id IS NOT NULL
  AND i.status != 'archived'
GROUP BY i.property_purchase_id, i.client_id;

-- 4. Link existing installments to their new schedule
UPDATE installments i
SET payment_schedule_id = ps.id
FROM payment_schedules ps
WHERE ps.property_purchase_id = i.property_purchase_id
  AND ps.client_id = i.client_id
  AND ps.is_active = true
  AND i.payment_schedule_id IS NULL;

-- 5. Drop old unique constraint and add new one
ALTER TABLE installments DROP CONSTRAINT IF EXISTS installments_property_purchase_id_installment_number_key;
ALTER TABLE installments ADD CONSTRAINT installments_schedule_number_key UNIQUE (payment_schedule_id, installment_number);

-- 6. Add columns to abonos table for schedule references (if abonos table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'abonos') THEN
        ALTER TABLE abonos ADD COLUMN IF NOT EXISTS previous_schedule_id INTEGER REFERENCES payment_schedules(id);
        ALTER TABLE abonos ADD COLUMN IF NOT EXISTS new_schedule_id INTEGER REFERENCES payment_schedules(id);
    END IF;
END $$;

-- 7. Add FK from payment_schedules.abono_id to abonos (if abonos table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'abonos') THEN
        ALTER TABLE payment_schedules ADD CONSTRAINT fk_payment_schedules_abono
            FOREIGN KEY (abono_id) REFERENCES abonos(id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL; -- constraint already exists
END $$;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_payment_schedules_purchase ON payment_schedules(property_purchase_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_active ON payment_schedules(property_purchase_id, is_active);
CREATE INDEX IF NOT EXISTS idx_installments_schedule ON installments(payment_schedule_id);

-- 9. Grant permissions (adjust user name to match your environment)
-- GRANT ALL PRIVILEGES ON TABLE payment_schedules TO ladesvww_jona;
-- GRANT USAGE, SELECT ON SEQUENCE payment_schedules_id_seq TO ladesvww_jona;

-- 10. Drop history tables if they exist (no longer needed)
-- DROP TABLE IF EXISTS payments_history;
-- DROP TABLE IF EXISTS installments_history;
