ALTER TABLE users ADD COLUMN IF NOT EXISTS "agentrixId" character varying;
ALTER TABLE users ADD CONSTRAINT "UQ_agentrixId" UNIQUE ("agentrixId");
UPDATE users SET "agentrixId" = "paymindId" WHERE "agentrixId" IS NULL;
