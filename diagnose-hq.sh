#!/bin/bash
# HQ Pilot 诊断脚本

echo "======================================"
echo "1. 检查容器状态"
echo "======================================"
docker ps -a | grep -E "agentrix-hq|agentrix-backend|agentrix-postgres|agentrix-nginx"

echo ""
echo "======================================"
echo "2. 检查 HQ Pilot 健康状态"
echo "======================================"
docker exec agentrix-hq-pilot wget -qO- http://localhost:3005/api/health || echo "健康检查失败"

echo ""
echo "======================================"
echo "3. 检查知识库目录"
echo "======================================"
echo "Host 知识库文件:"
ls -lah ~/Agentrix/backend/knowledge/ 2>/dev/null || echo "知识库目录不存在"

echo ""
echo "Container 知识库文件:"
docker exec agentrix-hq-pilot ls -lah /app/knowledge/ 2>/dev/null || echo "容器内知识库不可访问"

echo ""
echo "======================================"
echo "4. 检查 HQ Pilot 日志（最近50行）"
echo "======================================"
docker logs agentrix-hq-pilot --tail 50

echo ""
echo "======================================"
echo "5. 检查环境变量配置"
echo "======================================"
docker exec agentrix-hq-pilot env | grep -E "DB_|HQ_|GEMINI|OPENAI|DEEPSEEK" | head -20

echo ""
echo "======================================"
echo "6. 测试数据库连接"
echo "======================================"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT COUNT(*) as skill_count FROM skills WHERE status='published';" 2>&1

echo ""
echo "======================================"
echo "7. 检查 Nginx 配置"
echo "======================================"
docker exec agentrix-nginx cat /etc/nginx/conf.d/default.conf | grep -A 10 "location /api/hq"

echo ""
echo "完成诊断！"
