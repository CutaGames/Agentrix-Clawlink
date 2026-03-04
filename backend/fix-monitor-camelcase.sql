-- Fix MarketMonitor table to use camelCase columns as expected by TypeORM
ALTER TABLE market_monitors RENAME COLUMN strategy_graph_id TO "strategyGraphId";
ALTER TABLE market_monitors RENAME COLUMN token_pair TO "tokenPair";
ALTER TABLE market_monitors RENAME COLUMN monitor_type TO "monitorType";
ALTER TABLE market_monitors RENAME COLUMN last_price TO "lastPrice";
ALTER TABLE market_monitors RENAME COLUMN last_checked_at TO "lastCheckedAt";
ALTER TABLE market_monitors RENAME COLUMN is_active TO "isActive";
ALTER TABLE market_monitors RENAME COLUMN created_at TO "createdAt";
ALTER TABLE market_monitors RENAME COLUMN updated_at TO "updatedAt";
