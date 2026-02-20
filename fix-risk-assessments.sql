-- Fix risk_assessments table: add missing payment_id column
-- Root cause: RiskAssessment entity uses payment_id (via SnakeNamingStrategy) but DB only has transaction_id

DO $$
BEGIN
  -- Add payment_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'risk_assessments' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE "risk_assessments" ADD COLUMN "payment_id" uuid;
    RAISE NOTICE 'Added payment_id column';
  ELSE
    RAISE NOTICE 'payment_id column already exists';
  END IF;
END $$;

-- Create index on payment_id for performance
CREATE INDEX IF NOT EXISTS "IDX_risk_assessments_payment_id" ON "risk_assessments" ("payment_id");

-- Record migration
INSERT INTO "migrations" ("timestamp", "name")
SELECT 1776700000001, 'AddPaymentIdToRiskAssessments1776700000001'
WHERE NOT EXISTS (
  SELECT 1 FROM "migrations" WHERE name = 'AddPaymentIdToRiskAssessments1776700000001'
);
