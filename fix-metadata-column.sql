ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS metadata jsonb;
SELECT 'metadata column OK' AS status;
