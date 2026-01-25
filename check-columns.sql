-- 检查多个表的列
SELECT 'audit_logs' as table_name, column_name FROM information_schema.columns WHERE table_name = 'audit_logs' ORDER BY ordinal_position;
SELECT 'agent_sessions' as table_name, column_name FROM information_schema.columns WHERE table_name = 'agent_sessions' ORDER BY ordinal_position;
SELECT 'agent_stats' as table_name, column_name FROM information_schema.columns WHERE table_name = 'agent_stats' ORDER BY ordinal_position;
SELECT 'commissions' as table_name, column_name FROM information_schema.columns WHERE table_name = 'commissions' ORDER BY ordinal_position;
SELECT 'market_monitors' as table_name, column_name FROM information_schema.columns WHERE table_name = 'market_monitors' ORDER BY ordinal_position;
