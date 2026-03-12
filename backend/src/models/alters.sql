-- Migration for existing databases
-- Adds land_area_sqm to properties and refreshes property_details view

BEGIN;

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS land_area_sqm DECIMAL(10,2);

ALTER TABLE properties
DROP COLUMN IF EXISTS custom_installment_amount;

DROP VIEW IF EXISTS property_details;

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
LEFT JOIN property_status ps ON p.property_status_id = ps.id;

COMMIT;
