-- Fix market_monitors table - add missing columns
ALTER TABLE market_monitors ADD COLUMN IF NOT EXISTS token_pair VARCHAR(100);
ALTER TABLE market_monitors ADD COLUMN IF NOT EXISTS monitor_type VARCHAR(50);
ALTER TABLE market_monitors ADD COLUMN IF NOT EXISTS last_price DECIMAL(18,6);
ALTER TABLE market_monitors ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP;
ALTER TABLE market_monitors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE market_monitors ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE market_monitors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_market_monitors_token_pair_chain ON market_monitors(token_pair, chain);
