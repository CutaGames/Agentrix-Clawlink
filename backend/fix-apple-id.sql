-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "appleId" VARCHAR;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twitterId" VARCHAR;

-- Create unique indexes for the new columns
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_appleId" ON "users" ("appleId") WHERE "appleId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_twitterId" ON "users" ("twitterId") WHERE "twitterId" IS NOT NULL;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('appleId', 'twitterId', 'googleId', 'paymindId');
