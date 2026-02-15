-- 优化任务管理API性能的数据库索引

-- 1. agent_tasks表索引
CREATE INDEX IF NOT EXISTS idx_agent_tasks_assigned_to_id
  ON agent_tasks(assigned_to_id);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status
  ON agent_tasks(status);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at
  ON agent_tasks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_assigned_status
  ON agent_tasks(assigned_to_id, status);

-- 2. tick_executions表索引
CREATE INDEX IF NOT EXISTS idx_tick_executions_agent_id
  ON tick_executions(agent_id);

CREATE INDEX IF NOT EXISTS idx_tick_executions_created_at
  ON tick_executions(created_at DESC);

-- 验证索引
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('agent_tasks', 'tick_executions')
ORDER BY tablename, indexname;
