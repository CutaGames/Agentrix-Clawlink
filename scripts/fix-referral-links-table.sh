#!/bin/bash
# Recreate referral_links table with correct schema matching ReferralLinkEntity

# Create enum types if not exist
psql -U agentrix -d paymind <<'EOF'

-- Create enum types
DO $$ BEGIN
  CREATE TYPE referral_link_type_enum AS ENUM ('general', 'product', 'skill', 'campaign');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE referral_link_status_enum AS ENUM ('active', 'paused', 'expired', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backup old data (if any meaningful data exists)
CREATE TABLE IF NOT EXISTS referral_links_backup AS SELECT * FROM referral_links;

-- Drop old table
DROP TABLE IF EXISTS referral_links CASCADE;

-- Create new table matching entity
CREATE TABLE referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id VARCHAR NOT NULL,
  short_code VARCHAR(16) NOT NULL,
  type referral_link_type_enum NOT NULL DEFAULT 'general',
  status referral_link_status_enum NOT NULL DEFAULT 'active',
  title VARCHAR,
  target_id VARCHAR,
  target_type VARCHAR,
  target_name VARCHAR,
  full_url TEXT,
  channel VARCHAR,
  clicks INT NOT NULL DEFAULT 0,
  unique_clicks INT NOT NULL DEFAULT 0,
  conversions INT NOT NULL DEFAULT 0,
  total_commission DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_gmv DECIMAL(15,2) NOT NULL DEFAULT 0,
  split_plan_id VARCHAR,
  expires_at TIMESTAMP,
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes
CREATE UNIQUE INDEX "IDX_referral_links_short_code" ON referral_links (short_code);
CREATE INDEX "IDX_referral_links_owner_id" ON referral_links (owner_id);
CREATE INDEX "IDX_referral_links_owner_type" ON referral_links (owner_id, type);

SELECT 'referral_links table recreated successfully' AS result;
\d referral_links

EOF
