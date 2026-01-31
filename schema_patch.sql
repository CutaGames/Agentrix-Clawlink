ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE agent_messages ADD COLUMN IF NOT EXISTS sequence_number INTEGER;
ALTER TABLE "commission" ADD COLUMN IF NOT EXISTS commission_base decimal(18,8);
UPDATE skills SET status = 'published' WHERE status != 'published';
UPDATE products SET status = 'active' WHERE status != 'active';
