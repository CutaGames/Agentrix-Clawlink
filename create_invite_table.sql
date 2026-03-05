DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_code_status_enum') THEN
    CREATE TYPE invitation_code_status_enum AS ENUM ('available', 'used', 'expired', 'disabled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(12) NOT NULL,
  batch VARCHAR(50) NOT NULL,
  status invitation_code_status_enum NOT NULL DEFAULT 'available',
  "maxUses" INTEGER NOT NULL DEFAULT 1,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "usedByUserId" UUID,
  "usedAt" TIMESTAMP,
  channel VARCHAR(50),
  "expiresAt" TIMESTAMP,
  "createdBy" VARCHAR(50) NOT NULL DEFAULT 'system',
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invitation_codes_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
SELECT 'invitation_codes table ready';
