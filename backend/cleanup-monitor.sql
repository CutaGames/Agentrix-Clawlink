-- Clean up market_monitors table by removing snake_case columns
ALTER TABLE market_monitors DROP COLUMN IF EXISTS strategy_graph_id;
ALTER TABLE market_monitors DROP COLUMN IF EXISTS token_pair;
ALTER TABLE market_monitors DROP COLUMN IF EXISTS monitor_type;
ALTER TABLE market_monitors DROP COLUMN IF EXISTS last_price;
ALTER TABLE market_monitors DROP COLUMN IF EXISTS last_checked_at;
ALTER TABLE market_monitors DROP COLUMN IF EXISTS is_active;
ALTER TABLE market_monitors DROP COLUMN IF EXISTS created_at;
ALTER TABLE market_monitors DROP COLUMN IF EXISTS updated_at;
