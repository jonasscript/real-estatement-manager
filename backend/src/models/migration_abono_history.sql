-- ─── Abono (Capital Payment) History Tables ──────────────────────────────────
-- When a capital abono is processed, old installments and payments are archived
-- here before being replaced with a recalculated schedule.

-- Historical installments (archived before recalculation)
CREATE TABLE IF NOT EXISTS installments_history (
    id SERIAL PRIMARY KEY,
    original_installment_id INTEGER NOT NULL,  -- original installments.id
    property_purchase_id INTEGER,
    client_id INTEGER,
    installment_number INTEGER,
    amount DECIMAL(15,2),
    due_date DATE,
    status VARCHAR(20),
    created_at_original TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    abono_id INTEGER  -- links to the abono that triggered this archival
);

-- Historical payments (archived before recalculation)
CREATE TABLE IF NOT EXISTS payments_history (
    id SERIAL PRIMARY KEY,
    original_payment_id INTEGER NOT NULL,  -- original payments.id
    installment_id INTEGER,                -- original installment id
    client_id INTEGER,
    amount DECIMAL(15,2),
    payment_date TIMESTAMP,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    proof_file_path VARCHAR(500),
    proof_cloudinary_url VARCHAR(1000),
    proof_cloudinary_public_id VARCHAR(500),
    status VARCHAR(20),
    notes TEXT,
    created_at_original TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    abono_id INTEGER  -- links to the abono that triggered this archival
);

-- Abonos table — records each capital payment event
CREATE TABLE IF NOT EXISTS abonos (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    property_purchase_id INTEGER NOT NULL REFERENCES property_purchases(id),
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_installments_history_purchase ON installments_history(property_purchase_id);
CREATE INDEX IF NOT EXISTS idx_installments_history_client ON installments_history(client_id);
CREATE INDEX IF NOT EXISTS idx_installments_history_abono ON installments_history(abono_id);
CREATE INDEX IF NOT EXISTS idx_payments_history_abono ON payments_history(abono_id);
CREATE INDEX IF NOT EXISTS idx_abonos_client ON abonos(client_id);
CREATE INDEX IF NOT EXISTS idx_abonos_purchase ON abonos(property_purchase_id);
