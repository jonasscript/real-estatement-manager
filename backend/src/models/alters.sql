-- ─── Add property_purchase_id to installments ────────────────────────────────
-- Allows multiple properties per client to each have their own installment series

ALTER TABLE installments
  ADD COLUMN IF NOT EXISTS property_purchase_id INTEGER REFERENCES property_purchases(id) ON DELETE CASCADE;

-- Drop old unique constraint (client_id + installment_number no longer makes sense
-- when a single client can have multiple property purchases)
ALTER TABLE installments
  DROP CONSTRAINT IF EXISTS installments_client_id_installment_number_key;

-- New constraint: each purchase has its own numbered installment sequence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'installments_purchase_installment_unique'
  ) THEN
    ALTER TABLE installments
      ADD CONSTRAINT installments_purchase_installment_unique
      UNIQUE (property_purchase_id, installment_number);
  END IF;
END $$;

-- ─── Payment proof: Cloudinary storage + OCR extracted data ──────────────────
-- Must run as the table owner (ladesvww). SET ROLE switches to the owner for
-- just this block, then resets back to the logged-in user.
SET ROLE ladesvww;
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS proof_cloudinary_url       VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS proof_cloudinary_public_id VARCHAR(500),
  ADD COLUMN IF NOT EXISTS ocr_data                   JSONB,
  ADD COLUMN IF NOT EXISTS ocr_matched_template       VARCHAR(100);
RESET ROLE;
