-- Agent 自主运行系统数据库表结构
-- 创建时间: 2025-02-05

-- 1. 任务队列表
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(50) NOT NULL,  -- Agent ID: ARCHITECT-01, DEV-01, etc.
    assigned_by VARCHAR(50) NOT NULL,  -- 谁分配的
    priority INTEGER DEFAULT 5,         -- 1-10, 10最高
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, failed
    estimated_cost DECIMAL(10,4),       -- 预估API成本
    actual_cost DECIMAL(10,4),          -- 实际API成本
    result TEXT,                        -- 任务结果
    error_message TEXT,                 -- 错误信息
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP
);

-- 2. Agent 状态表
CREATE TABLE IF NOT EXISTS agent_status (
    agent_id VARCHAR(50) PRIMARY KEY,
    agent_name VARCHAR(100) NOT NULL,
    role VARCHAR(100),
    model VARCHAR(50),                  -- claude-opus, claude-sonnet, etc.
    status VARCHAR(20) DEFAULT 'idle',  -- idle, working, offline, error
    current_task_id UUID REFERENCES agent_tasks(id),
    last_active_at TIMESTAMP,
    daily_budget DECIMAL(10,4),         -- 每日预算
    daily_spent DECIMAL(10,4) DEFAULT 0, -- 今日已花费
    total_tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 系统 Tick 日志表
CREATE TABLE IF NOT EXISTS system_ticks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tick_time TIMESTAMP DEFAULT NOW(),
    triggered_by VARCHAR(50),           -- cron, manual, api
    actions_taken JSONB,                -- 本次tick执行的动作
    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    total_cost DECIMAL(10,4),
    notes TEXT
);

-- 4. 每日预算表
CREATE TABLE IF NOT EXISTS daily_budget (
    date DATE PRIMARY KEY,
    total_budget DECIMAL(10,4) DEFAULT 20.00,
    total_spent DECIMAL(10,4) DEFAULT 0,
    architect_budget DECIMAL(10,4) DEFAULT 10.00,
    architect_spent DECIMAL(10,4) DEFAULT 0,
    dev_budget DECIMAL(10,4) DEFAULT 4.00,
    dev_spent DECIMAL(10,4) DEFAULT 0,
    market_budget DECIMAL(10,4) DEFAULT 3.00,
    market_spent DECIMAL(10,4) DEFAULT 0,
    ops_budget DECIMAL(10,4) DEFAULT 2.00,
    ops_spent DECIMAL(10,4) DEFAULT 0,
    reserve_budget DECIMAL(10,4) DEFAULT 1.00,
    reserve_spent DECIMAL(10,4) DEFAULT 0
);

-- 5. 免费资源追踪表
CREATE TABLE IF NOT EXISTS free_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50),          -- api, cloud_credit, grant, tool
    provider VARCHAR(100),
    value_estimate DECIMAL(10,2),       -- 估算价值
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, applied, approved, expired
    application_url TEXT,
    notes TEXT,
    discovered_at TIMESTAMP DEFAULT NOW(),
    discovered_by VARCHAR(50)           -- 哪个Agent发现的
);

-- 6. 战略目标表
CREATE TABLE IF NOT EXISTS strategic_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),               -- revenue, growth, infrastructure
    priority INTEGER DEFAULT 5,
    progress INTEGER DEFAULT 0,         -- 0-100
    target_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. 里程碑表
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES strategic_goals(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
    due_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 初始化 Agent 状态数据
INSERT INTO agent_status (agent_id, agent_name, role, model, daily_budget) VALUES
('ARCHITECT-01', 'ARCHITECT-01', '首席架构师 / Agent CEO / CFO', 'claude-opus', 10.00),
('DEV-01', 'DEV-01', '高级开发者', 'claude-sonnet', 2.00),
('DEV-02', 'DEV-02', '前端开发者', 'claude-sonnet', 2.00),
('MARKET-01', 'MARKET-01', '营销专员', 'claude-haiku', 3.00),
('OPS-01', 'OPS-01', '运维工程师', 'claude-sonnet', 2.00),
('RESOURCE-01', 'RESOURCE-01', '资源猎手', 'claude-haiku', 1.00)
ON CONFLICT (agent_id) DO NOTHING;

-- 初始化今日预算
INSERT INTO daily_budget (date) VALUES (CURRENT_DATE)
ON CONFLICT (date) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON agent_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON agent_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_ticks_time ON system_ticks(tick_time);
