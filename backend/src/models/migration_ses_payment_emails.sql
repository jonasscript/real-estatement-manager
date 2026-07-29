-- Amazon SES sender identity per real estate.
ALTER TABLE real_estates ADD COLUMN IF NOT EXISTS ses_sender_email VARCHAR(255);
ALTER TABLE real_estates ADD COLUMN IF NOT EXISTS ses_sender_domain VARCHAR(255);

-- Audit trail metadata for SES payment reminder emails.
ALTER TABLE payment_email_logs ADD COLUMN IF NOT EXISTS provider VARCHAR(30) NOT NULL DEFAULT 'ses';
ALTER TABLE payment_email_logs ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);
ALTER TABLE payment_email_logs ADD COLUMN IF NOT EXISTS sender_domain VARCHAR(255);
