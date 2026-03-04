-- Complete fix for skills table - add all missing columns

-- Add value_type column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skills_valuetype_enum') THEN
        CREATE TYPE skills_valuetype_enum AS ENUM ('action', 'deliverable', 'decision', 'data');
    END IF;
END$$;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS value_type skills_valuetype_enum;

-- Add image columns
ALTER TABLE skills ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500);

-- Add UCP columns
ALTER TABLE skills ADD COLUMN IF NOT EXISTS ucp_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS ucp_checkout_endpoint VARCHAR(500);

-- Add X402 columns
ALTER TABLE skills ADD COLUMN IF NOT EXISTS x402_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS x402_service_endpoint VARCHAR(500);

-- Add AI priority column
ALTER TABLE skills ADD COLUMN IF NOT EXISTS ai_priority VARCHAR(20) DEFAULT 'normal';

-- Verify the columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'skills' 
ORDER BY ordinal_position;
