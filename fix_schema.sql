ALTER TABLE users ADD COLUMN IF NOT EXISTS "agentrixId" character varying;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "axId" character varying;
-- Also check for social_accounts table if needed
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS "agentrixId" character varying;
