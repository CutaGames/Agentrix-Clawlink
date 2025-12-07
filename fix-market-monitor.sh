#!/bin/bash
# 修复 MarketMonitor.strategyGraphId 列缺失问题

echo "=== 修复 MarketMonitor.strategyGraphId 列缺失 ==="
echo ""
echo "在服务器上执行以下命令："
echo ""

cat << 'EOF'
cd /var/www/agentrix-website/backend

# 1. 检查 MarketMonitor 表结构
docker exec postgresql psql -U agentrix -d paymind -c "\d market_monitor" 2>&1 | head -30

# 2. 检查是否有 strategyGraphId 列
docker exec postgresql psql -U agentrix -d paymind -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'market_monitor' 
AND column_name LIKE '%strategy%' OR column_name LIKE '%graph%';
" 2>&1

# 3. 如果列不存在，添加列（临时修复）
docker exec postgresql psql -U agentrix -d paymind << 'SQL'
-- 检查表是否存在
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'market_monitor'
);

-- 如果表存在但列不存在，添加列
DO \$\$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'market_monitor'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'market_monitor' 
        AND column_name = 'strategyGraphId'
    ) THEN
        ALTER TABLE market_monitor ADD COLUMN "strategyGraphId" uuid;
        RAISE NOTICE '已添加 strategyGraphId 列';
    ELSE
        RAISE NOTICE '表不存在或列已存在';
    END IF;
END \$\$;
SQL

# 4. 或者，如果这个功能不需要，可以修改代码跳过这个字段
# 查找使用 strategyGraphId 的代码
grep -r "strategyGraphId" src/ --include="*.ts" | head -10
EOF

