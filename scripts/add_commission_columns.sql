-- Add commission columns to merchant_tasks table
ALTER TABLE merchant_tasks ADD COLUMN IF NOT EXISTS commission_bps integer NOT NULL DEFAULT 500;
ALTER TABLE merchant_tasks ADD COLUMN IF NOT EXISTS commission_amount numeric(15,2);
ALTER TABLE merchant_tasks ADD COLUMN IF NOT EXISTS net_payout_amount numeric(15,2);
ALTER TABLE merchant_tasks ADD COLUMN IF NOT EXISTS commission_status varchar(20) NOT NULL DEFAULT 'pending';
ALTER TABLE merchant_tasks ADD COLUMN IF NOT EXISTS commission_tx_hash varchar;
