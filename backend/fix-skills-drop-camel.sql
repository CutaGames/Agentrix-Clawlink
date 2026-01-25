-- Drop duplicate camelCase columns from skills table
ALTER TABLE skills DROP COLUMN IF EXISTS "imageUrl";
ALTER TABLE skills DROP COLUMN IF EXISTS "thumbnailUrl";
ALTER TABLE skills DROP COLUMN IF EXISTS "ucpEnabled";
ALTER TABLE skills DROP COLUMN IF EXISTS "ucpCheckoutEndpoint";
ALTER TABLE skills DROP COLUMN IF EXISTS "x402Enabled";
ALTER TABLE skills DROP COLUMN IF EXISTS "x402ServiceEndpoint";
ALTER TABLE skills DROP COLUMN IF EXISTS "aiPriority";

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'skills' ORDER BY ordinal_position;
