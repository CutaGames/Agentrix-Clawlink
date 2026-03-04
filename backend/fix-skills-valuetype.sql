-- First check if the enum type exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skills_valuetype_enum') THEN
        CREATE TYPE skills_valuetype_enum AS ENUM ('action', 'deliverable', 'decision', 'data');
    END IF;
END$$;

-- Add value_type column to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS value_type skills_valuetype_enum;

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'value_type';
