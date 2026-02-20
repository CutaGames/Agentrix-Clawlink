-- Check risk_assessments columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'risk_assessments'
ORDER BY ordinal_position;
