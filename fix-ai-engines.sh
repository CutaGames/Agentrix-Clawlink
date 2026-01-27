#!/bin/bash
# AWS生产环境 - HQ Pilot AI引擎配置修复脚本
# 版本: V2.0 - 分层AI引擎架构
# 日期: 2026-01-27

set -e

echo "=========================================="
echo "Agentrix HQ Pilot AI引擎配置修复"
echo "=========================================="
echo ""

cd ~/Agentrix

# 1. 备份当前配置
echo "1️⃣  备份当前配置..."
cp backend/.env.prod backend/.env.prod.backup.$(date +%Y%m%d_%H%M%S)

# 2. 更新环境变量（AWS Bedrock配置）
echo ""
echo "2️⃣  配置AWS Bedrock凭证..."
echo "⚠️  请手动编辑 backend/.env.prod 文件："
echo "   AWS_ACCESS_KEY_ID=YOUR_AWS_KEY"
echo "   AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET"
echo ""
read -p "是否已配置AWS凭证? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 请先配置AWS凭证后再运行此脚本"
    exit 1
fi

# 3. 检查知识库目录
echo ""
echo "3️⃣  检查知识库目录..."
mkdir -p backend/knowledge
chmod 755 backend/knowledge

KNOWLEDGE_COUNT=$(ls -1 backend/knowledge/*.{md,txt} 2>/dev/null | wc -l)
echo "📚 当前知识库文件数量: $KNOWLEDGE_COUNT"

if [ $KNOWLEDGE_COUNT -lt 5 ]; then
    echo "⚠️  知识库文件较少，建议上传更多文档到 backend/knowledge/"
    echo "   推荐文档类型: PRD, 技术设计, 运维指南, API文档等"
fi

# 4. 重新构建并部署
echo ""
echo "4️⃣  重建 HQ Pilot 服务..."
docker compose -f docker-compose.prod.yml build hq-pilot

echo ""
echo "5️⃣  重启服务..."
docker compose -f docker-compose.prod.yml up -d hq-pilot

echo ""
echo "6️⃣  等待服务启动（30秒）..."
sleep 30

# 7. 健康检查
echo ""
echo "7️⃣  验证服务健康..."
HEALTH_STATUS=$(docker exec agentrix-hq-pilot wget -qO- http://localhost:3005/api/health 2>/dev/null || echo "failed")

if [[ $HEALTH_STATUS == *"ok"* ]]; then
    echo "✅ HQ Pilot 健康检查通过"
else
    echo "❌ 健康检查失败，查看日志..."
    docker logs agentrix-hq-pilot --tail 50
    exit 1
fi

# 8. 测试AI引擎（多层模型）
echo ""
echo "8️⃣  测试分层AI引擎..."

echo ""
echo "测试 CEO (Claude Opus 4)..."
CEO_RESPONSE=$(curl -s -X POST http://localhost:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"ceo","messages":[{"role":"user","content":"简单介绍Agentrix平台"}]}' \
  | jq -r '.content' 2>/dev/null || echo "failed")

if [[ $CEO_RESPONSE == *"指令中断"* ]] || [[ $CEO_RESPONSE == "failed" ]]; then
    echo "❌ CEO Agent 测试失败"
    echo "Response: $CEO_RESPONSE"
else
    echo "✅ CEO Agent (Claude Opus 4) 工作正常"
fi

echo ""
echo "测试 Coder (Claude Sonnet 4.5)..."
CODER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"coder","messages":[{"role":"user","content":"Hello"}]}' \
  | jq -r '.content' 2>/dev/null || echo "failed")

if [[ $CODER_RESPONSE == *"指令中断"* ]] || [[ $CODER_RESPONSE == "failed" ]]; then
    echo "⚠️  Coder Agent 可能需要更多配置"
else
    echo "✅ Coder Agent (Claude Sonnet 4.5) 工作正常"
fi

# 9. 显示容器状态
echo ""
echo "9️⃣  最终容器状态..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep agentrix

echo ""
echo "=========================================="
echo "✅ 修复完成！"
echo "=========================================="
echo ""
echo "📊 AI引擎分层策略:"
echo "   🎯 CEO/架构师    -> Claude Opus 4 (AWS Bedrock)"
echo "   💻 程序员/Coder  -> Claude Sonnet 4.5 (AWS Bedrock)"
echo "   📈 增长/商务     -> Gemini Flash 1.5 (免费)"
echo "   🔄 备用降级      -> Claude Haiku (AWS Bedrock)"
echo ""
echo "🌐 访问地址:"
echo "   主站: http://57.182.89.146/"
echo "   指挥室: http://57.182.89.146:8080/"
echo ""
echo "📝 查看日志: docker logs agentrix-hq-pilot -f"
echo "📊 容器状态: docker ps | grep agentrix"
