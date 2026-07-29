-- Microsoft OAuth fields for existing users.
ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_account_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_token_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_scopes TEXT;

-- Audit trail for installment reminder emails.
CREATE TABLE IF NOT EXISTS payment_email_logs (
    id SERIAL PRIMARY KEY,
    installment_id INTEGER REFERENCES installments(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'ses',
    sender_email VARCHAR(255),
    sender_domain VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'sent',
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE payment_email_logs ADD COLUMN IF NOT EXISTS provider VARCHAR(30) NOT NULL DEFAULT 'ses';
ALTER TABLE payment_email_logs ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);
ALTER TABLE payment_email_logs ADD COLUMN IF NOT EXISTS sender_domain VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_payment_email_logs_installment
  ON payment_email_logs(installment_id);

CREATE INDEX IF NOT EXISTS idx_payment_email_logs_sent_by
  ON payment_email_logs(sent_by);
