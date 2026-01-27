#!/bin/bash
# HQ Pilot 修复脚本

set -e

echo "======================================"
echo "开始修复 HQ Pilot 问题"
echo "======================================"

cd ~/Agentrix

# 1. 确保知识库目录存在并有内容
echo ""
echo "1. 检查并创建知识库目录..."
mkdir -p backend/knowledge
chmod 755 backend/knowledge

# 检查知识库文件数量
KNOWLEDGE_COUNT=$(ls -1 backend/knowledge/*.md 2>/dev/null | wc -l)
echo "当前知识库文件数量: $KNOWLEDGE_COUNT"

if [ $KNOWLEDGE_COUNT -lt 5 ]; then
    echo "⚠️  知识库文件较少，请确认文档已上传到 backend/knowledge/"
    echo "需要的文档类型: *.md, *.txt"
fi

# 2. 检查并修复容器挂载
echo ""
echo "2. 验证 Docker Compose 配置..."
if grep -q "backend/knowledge:/app/knowledge" docker-compose.prod.yml; then
    echo "✓ HQ Pilot 知识库挂载配置正确"
else
    echo "✗ 知识库挂载配置缺失，需要手动修复 docker-compose.prod.yml"
fi

# 3. 重启 HQ Pilot 服务
echo ""
echo "3. 重建并重启 HQ Pilot 服务..."
docker compose -f docker-compose.prod.yml build hq-pilot
docker compose -f docker-compose.prod.yml up -d hq-pilot

echo ""
echo "4. 等待服务启动（30秒）..."
sleep 30

# 5. 检查服务状态
echo ""
echo "5. 验证服务状态..."
docker ps | grep agentrix-hq-pilot

# 6. 测试健康检查
echo ""
echo "6. 测试健康检查..."
docker exec agentrix-hq-pilot wget -qO- http://localhost:3005/api/health && echo "✓ 健康检查通过" || echo "✗ 健康检查失败"

# 7. 查看启动日志
echo ""
echo "7. 查看启动日志（最近100行）..."
docker logs agentrix-hq-pilot --tail 100 | grep -E "RAG|knowledge|Nest application|port|error" || docker logs agentrix-hq-pilot --tail 50

# 8. 测试 Agent 对话
echo ""
echo "8. 测试 Agent 对话功能..."
curl -X POST http://localhost:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"ceo","messages":[{"role":"user","content":"测试连接"}]}' \
  -w "\nHTTP Status: %{http_code}\n" || echo "✗ Agent 对话测试失败"

echo ""
echo "======================================"
echo "修复完成！"
echo "======================================"
echo ""
echo "请访问 http://57.182.89.146:8080/ 验证指挥室功能"
