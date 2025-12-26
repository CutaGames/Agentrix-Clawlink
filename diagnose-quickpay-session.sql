-- QuickPay Session 诊断脚本

-- 1. 检查 agent_sessions 表结构
\echo '========== 1. agent_sessions 表结构 =========='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'agent_sessions'
AND column_name IN ('session_id', 'user_id', 'signer_address', 'owner_address', 'single_limit', 'daily_limit')
ORDER BY column_name;

-- 2. 检查最近的 session 记录
\echo '\n========== 2. 最近的 session 记录 =========='
SELECT 
    id,
    session_id,
    user_id,
    signer_address,
    owner_address,
    single_limit,
    daily_limit,
    status,
    "createdAt"
FROM agent_sessions
ORDER BY "createdAt" DESC
LIMIT 5;

-- 3. 检查用户和钱包关联
\echo '\n========== 3. 用户和钱包关联 =========='
SELECT 
    u.id as user_id,
    u."paymindId",
    wc."walletAddress",
    wc."isDefault",
    wc."connectedAt"
FROM users u
LEFT JOIN wallet_connections wc ON u.id = wc."userId"
ORDER BY u."createdAt" DESC
LIMIT 5;

-- 4. 检查没有默认钱包的用户
\echo '\n========== 4. 没有默认钱包的用户 =========='
SELECT 
    u.id,
    u."paymindId",
    COUNT(wc.id) as wallet_count,
    COUNT(CASE WHEN wc."isDefault" = true THEN 1 END) as default_wallet_count
FROM users u
LEFT JOIN wallet_connections wc ON u.id = wc."userId"
GROUP BY u.id, u."paymindId"
HAVING COUNT(CASE WHEN wc."isDefault" = true THEN 1 END) = 0
   AND COUNT(wc.id) > 0
LIMIT 5;

-- 5. 统计信息
\echo '\n========== 5. 统计信息 =========='
SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM users
UNION ALL
SELECT 
    'Users with Wallets',
    COUNT(DISTINCT "userId")
FROM wallet_connections
UNION ALL
SELECT 
    'Total Sessions',
    COUNT(*)
FROM agent_sessions
UNION ALL
SELECT 
    'Active Sessions',
    COUNT(*)
FROM agent_sessions
WHERE status = 'active' AND (expiry IS NULL OR expiry > NOW());
