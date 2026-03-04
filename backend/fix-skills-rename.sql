-- Fix skills table - rename camelCase columns to snake_case

-- Rename camelCase columns to snake_case
DO $$ 
BEGIN
    -- imageUrl -> image_url
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'imageUrl') THEN
        -- Check if snake_case column already exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'image_url') THEN
            ALTER TABLE skills RENAME COLUMN "imageUrl" TO image_url;
        ELSE
            -- Drop the camelCase column if snake_case exists
            ALTER TABLE skills DROP COLUMN IF EXISTS "imageUrl";
        END IF;
    END IF;
    
    -- thumbnailUrl -> thumbnail_url
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'thumbnailUrl') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'thumbnail_url') THEN
            ALTER TABLE skills RENAME COLUMN "thumbnailUrl" TO thumbnail_url;
        ELSE
            ALTER TABLE skills DROP COLUMN IF EXISTS "thumbnailUrl";
        END IF;
    END IF;
    
    -- ucpEnabled -> ucp_enabled
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'ucpEnabled') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'ucp_enabled') THEN
            ALTER TABLE skills RENAME COLUMN "ucpEnabled" TO ucp_enabled;
        ELSE
            ALTER TABLE skills DROP COLUMN IF EXISTS "ucpEnabled";
        END IF;
    END IF;
    
    -- ucpCheckoutEndpoint -> ucp_checkout_endpoint
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'ucpCheckoutEndpoint') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'ucp_checkout_endpoint') THEN
            ALTER TABLE skills RENAME COLUMN "ucpCheckoutEndpoint" TO ucp_checkout_endpoint;
        ELSE
            ALTER TABLE skills DROP COLUMN IF EXISTS "ucpCheckoutEndpoint";
        END IF;
    END IF;
    
    -- x402Enabled -> x402_enabled
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'x402Enabled') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'x402_enabled') THEN
            ALTER TABLE skills RENAME COLUMN "x402Enabled" TO x402_enabled;
        ELSE
            ALTER TABLE skills DROP COLUMN IF EXISTS "x402Enabled";
        END IF;
    END IF;
    
    -- x402ServiceEndpoint -> x402_service_endpoint
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'x402ServiceEndpoint') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'x402_service_endpoint') THEN
            ALTER TABLE skills RENAME COLUMN "x402ServiceEndpoint" TO x402_service_endpoint;
        ELSE
            ALTER TABLE skills DROP COLUMN IF EXISTS "x402ServiceEndpoint";
        END IF;
    END IF;
    
    -- valueType -> value_type
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'valueType') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'value_type') THEN
            ALTER TABLE skills RENAME COLUMN "valueType" TO value_type;
        ELSE
            ALTER TABLE skills DROP COLUMN IF EXISTS "valueType";
        END IF;
    END IF;
    
    -- aiPriority -> ai_priority
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'aiPriority') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'ai_priority') THEN
            ALTER TABLE skills RENAME COLUMN "aiPriority" TO ai_priority;
        ELSE
            ALTER TABLE skills DROP COLUMN IF EXISTS "aiPriority";
        END IF;
    END IF;
END $$;

-- Verify the result
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'skills' 
ORDER BY ordinal_position;
