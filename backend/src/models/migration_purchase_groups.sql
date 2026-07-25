-- Dynamic purchase grouping: unified or individual commercial flow.

CREATE TABLE IF NOT EXISTS purchase_groups (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    real_estate_id INTEGER REFERENCES real_estates(id),
    seller_id INTEGER REFERENCES sellers(id),
    mode VARCHAR(20) NOT NULL DEFAULT 'individual'
        CHECK (mode IN ('individual', 'unified')),
    total_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    final_down_payment_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    final_installments INTEGER NOT NULL DEFAULT 1,
    commercial_status VARCHAR(30) NOT NULL DEFAULT 'reserved',
    down_payment_amount DECIMAL(15,2),
    stage_paid_amount DECIMAL(15,2) DEFAULT 0,
    remaining_down_payment_amount DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE property_purchases ADD COLUMN IF NOT EXISTS purchase_group_id INTEGER REFERENCES purchase_groups(id) ON DELETE CASCADE;
ALTER TABLE client_purchase_stages ADD COLUMN IF NOT EXISTS purchase_group_id INTEGER REFERENCES purchase_groups(id) ON DELETE CASCADE;
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS purchase_group_id INTEGER REFERENCES purchase_groups(id) ON DELETE CASCADE;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS purchase_group_id INTEGER REFERENCES purchase_groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_purchase_groups_client ON purchase_groups(client_id);
CREATE INDEX IF NOT EXISTS idx_purchase_groups_real_estate ON purchase_groups(real_estate_id);
CREATE INDEX IF NOT EXISTS idx_property_purchases_group ON property_purchases(purchase_group_id);
CREATE INDEX IF NOT EXISTS idx_client_purchase_stages_group ON client_purchase_stages(purchase_group_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_group ON payment_schedules(purchase_group_id);
CREATE INDEX IF NOT EXISTS idx_installments_group ON installments(purchase_group_id);

DO $$
DECLARE
  purchase_record RECORD;
  new_group_id INTEGER;
BEGIN
  FOR purchase_record IN
    SELECT pp.*
    FROM property_purchases pp
    WHERE pp.purchase_group_id IS NULL
    ORDER BY pp.id
  LOOP
    INSERT INTO purchase_groups (
      client_id, real_estate_id, seller_id, mode, total_price,
      final_down_payment_percentage, final_installments, commercial_status,
      down_payment_amount, stage_paid_amount, remaining_down_payment_amount, created_at
    )
    VALUES (
      purchase_record.client_id,
      purchase_record.real_estate_id,
      purchase_record.seller_id,
      'individual',
      COALESCE(purchase_record.final_price, 0),
      COALESCE(purchase_record.down_payment_percentage, purchase_record.final_down_payment_percentage, 0),
      COALESCE(purchase_record.final_installments, 1),
      COALESCE(purchase_record.commercial_status, 'reserved'),
      purchase_record.down_payment_amount,
      COALESCE(purchase_record.stage_paid_amount, 0),
      purchase_record.remaining_down_payment_amount,
      purchase_record.created_at
    )
    RETURNING id INTO new_group_id;

    UPDATE property_purchases
    SET purchase_group_id = new_group_id
    WHERE id = purchase_record.id;

    UPDATE client_purchase_stages
    SET purchase_group_id = new_group_id
    WHERE property_purchase_id = purchase_record.id
      AND purchase_group_id IS NULL;

    UPDATE payment_schedules
    SET purchase_group_id = new_group_id
    WHERE property_purchase_id = purchase_record.id
      AND purchase_group_id IS NULL;

    UPDATE installments
    SET purchase_group_id = new_group_id
    WHERE property_purchase_id = purchase_record.id
      AND purchase_group_id IS NULL;
  END LOOP;
END $$;
