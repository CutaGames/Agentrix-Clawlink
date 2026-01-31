ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS workspace_id character varying;
ALTER TABLE agent_messages ADD COLUMN IF NOT EXISTS sequence_number integer;
UPDATE products SET status = 'active' WHERE status IS NULL OR status = 'pending';
UPDATE skills SET status = 'published' WHERE status IS NULL;
