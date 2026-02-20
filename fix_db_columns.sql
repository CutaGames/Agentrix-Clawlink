-- Fix pay_intents missing attribution column
ALTER TABLE pay_intents ADD COLUMN IF NOT EXISTS attribution JSONB;

-- Fix budget_pools missing onchain_pool_id and fund_tx_hash columns
ALTER TABLE budget_pools ADD COLUMN IF NOT EXISTS onchain_pool_id INTEGER;
ALTER TABLE budget_pools ADD COLUMN IF NOT EXISTS fund_tx_hash VARCHAR;
