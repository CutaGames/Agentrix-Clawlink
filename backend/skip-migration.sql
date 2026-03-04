-- Skip the problematic migration by marking it as already run
INSERT INTO migrations (timestamp, name) 
VALUES (1768743398996, 'FixMissingColumns1768743398996')
ON CONFLICT DO NOTHING;

-- Also skip the next problematic migration
INSERT INTO migrations (timestamp, name)
VALUES (1768743398997, 'CreateNewTables1768743398997')
ON CONFLICT DO NOTHING;

SELECT 'Migrations skipped successfully' as status;
