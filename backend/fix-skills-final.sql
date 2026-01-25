-- Complete fix for skills table - rename all camelCase to snake_case

-- Rename imageUrl to image_url
ALTER TABLE skills RENAME COLUMN "imageUrl" TO image_url;

-- Rename thumbnailUrl to thumbnail_url  
ALTER TABLE skills RENAME COLUMN "thumbnailUrl" TO thumbnail_url;

-- Rename ucpEnabled to ucp_enabled
ALTER TABLE skills RENAME COLUMN "ucpEnabled" TO ucp_enabled;

-- Rename ucpCheckoutEndpoint to ucp_checkout_endpoint
ALTER TABLE skills RENAME COLUMN "ucpCheckoutEndpoint" TO ucp_checkout_endpoint;

-- Rename x402Enabled to x402_enabled
ALTER TABLE skills RENAME COLUMN "x402Enabled" TO x402_enabled;

-- Rename x402ServiceEndpoint to x402_service_endpoint
ALTER TABLE skills RENAME COLUMN "x402ServiceEndpoint" TO x402_service_endpoint;

-- Rename valueType to value_type (drop old one if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'valueType') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'value_type') THEN
            ALTER TABLE skills DROP COLUMN "valueType";
        ELSE
            ALTER TABLE skills RENAME COLUMN "valueType" TO value_type;
        END IF;
    END IF;
END $$;

-- Add ai_priority if not exists
ALTER TABLE skills ADD COLUMN IF NOT EXISTS ai_priority VARCHAR(20) DEFAULT 'normal';

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'skills' ORDER BY ordinal_position;
