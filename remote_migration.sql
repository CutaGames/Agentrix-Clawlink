DO $$
BEGIN
    -- products
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'lastSyncAt') THEN
        ALTER TABLE products RENAME COLUMN "lastSyncAt" TO last_sync_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'reviewNote') THEN
        ALTER TABLE products RENAME COLUMN "reviewNote" TO review_note;
    END IF;

    -- skills
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'imageUrl') THEN
        ALTER TABLE skills RENAME COLUMN "imageUrl" TO image_url;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'thumbnailUrl') THEN
        ALTER TABLE skills RENAME COLUMN "thumbnailUrl" TO thumbnail_url;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'ucpCheckoutEndpoint') THEN
        ALTER TABLE skills RENAME COLUMN "ucpCheckoutEndpoint" TO ucp_checkout_endpoint;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'ucpEnabled') THEN
        ALTER TABLE skills RENAME COLUMN "ucpEnabled" TO ucp_enabled;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'x402Enabled') THEN
        ALTER TABLE skills RENAME COLUMN "x402Enabled" TO x402_enabled;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'skills' AND column_name = 'x402ServiceEndpoint') THEN
        ALTER TABLE skills RENAME COLUMN "x402ServiceEndpoint" TO x402_service_endpoint;
    END IF;

    -- users
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'agentrixId') THEN
        ALTER TABLE users RENAME COLUMN "agentrixId" TO agentrix_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'appleId') THEN
        ALTER TABLE users RENAME COLUMN "appleId" TO apple_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatarUrl') THEN
        ALTER TABLE users RENAME COLUMN "avatarUrl" TO avatar_url;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt') THEN
        ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'googleId') THEN
        ALTER TABLE users RENAME COLUMN "googleId" TO google_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'kycLevel') THEN
        ALTER TABLE users RENAME COLUMN "kycLevel" TO kyc_level;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'kycStatus') THEN
        ALTER TABLE users RENAME COLUMN "kycStatus" TO kyc_status;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'passwordHash') THEN
        ALTER TABLE users RENAME COLUMN "passwordHash" TO password_hash;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'paymindId') THEN
        ALTER TABLE users RENAME COLUMN "paymindId" TO paymind_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'twitterId') THEN
        ALTER TABLE users RENAME COLUMN "twitterId" TO twitter_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedAt') THEN
        ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at;
    END IF;

    -- Special cases for users where both exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'defaultAccountId') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'default_account_id') THEN
            UPDATE users SET default_account_id = "defaultAccountId" WHERE default_account_id IS NULL AND "defaultAccountId" IS NOT NULL;
            ALTER TABLE users DROP COLUMN "defaultAccountId";
        ELSE
            ALTER TABLE users RENAME COLUMN "defaultAccountId" TO default_account_id;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastActiveAt') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_active_at') THEN
            UPDATE users SET last_active_at = "lastActiveAt" WHERE last_active_at IS NULL AND "lastActiveAt" IS NOT NULL;
            ALTER TABLE users DROP COLUMN "lastActiveAt";
        ELSE
            ALTER TABLE users RENAME COLUMN "lastActiveAt" TO last_active_at;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'statusReason') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status_reason') THEN
            UPDATE users SET status_reason = "statusReason" WHERE status_reason IS NULL AND "statusReason" IS NOT NULL;
            ALTER TABLE users DROP COLUMN "statusReason";
        ELSE
            ALTER TABLE users RENAME COLUMN "statusReason" TO status_reason;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'statusUpdatedAt') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status_updated_at') THEN
            UPDATE users SET status_updated_at = "statusUpdatedAt" WHERE status_updated_at IS NULL AND "statusUpdatedAt" IS NOT NULL;
            ALTER TABLE users DROP COLUMN "statusUpdatedAt";
        ELSE
            ALTER TABLE users RENAME COLUMN "statusUpdatedAt" TO status_updated_at;
        END IF;
    END IF;

END $$;
