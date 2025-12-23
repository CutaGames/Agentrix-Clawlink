SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_sessions'
ORDER BY column_name;
