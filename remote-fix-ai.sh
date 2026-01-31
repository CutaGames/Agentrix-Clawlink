#!/bin/bash
# 远程修复 AI 引擎配置

set -e

cd ~/Agentrix

echo "======================================"
echo "修复 AI 引擎配置 - AWS Bedrock 主力"
echo "======================================"

# 1. 备份现有配置
echo ""
echo "1. 备份 .env 文件..."
cp backend/.env backend/.env.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ 已备份"

# 2. 更新 AI 引擎配置
echo ""
echo "2. 更新 AI 引擎策略配置..."
cat >> backend/.env << 'EOFAI'

# ========================================
# AI 引擎分层配置 (2026-01-27)
# AWS Bedrock (云创$1500) + Gemini Flash免费
# ========================================

# 架构师 (CEO/CTO): AWS Bedrock Claude Opus 4.5
AI_ENGINE_ARCHITECT=bedrock
AWS_MODEL_ARCHITECT=anthropic.claude-opus-4-5:1

# 开发者 (Coder): AWS Bedrock Claude Sonnet 4.5
AI_ENGINE_CODER=bedrock
AWS_MODEL_CODER=anthropic.claude-sonnet-4-5:1

# 增长/商务 (Growth/Sales): Gemini Flash 1.5 (免费)
AI_ENGINE_GROWTH=gemini
GEMINI_MODEL_GROWTH=gemini-1.5-flash

# Backup 引擎: AWS Bedrock Claude Haiku 4.5
AI_ENGINE_BACKUP=bedrock
AWS_MODEL_BACKUP=anthropic.claude-haiku-4-5:1

# 默认引擎 (Fallback)
DEFAULT_AI_ENGINE=bedrock
DEFAULT_AI_MODEL=anthropic.claude-sonnet-4-5:1

# 禁用 DeepSeek (余额不足)
DEEPSEEK_API_KEY=

EOFAI

echo "✓ AI 配置已添加"

# 3. 验证配置
echo ""
echo "3. 验证配置..."
grep -E "AI_ENGINE_|AWS_MODEL_|GEMINI_MODEL_|DEFAULT_AI_" backend/.env | tail -15

# 4. 重建并重启 HQ Pilot
echo ""
echo "4. 重建 HQ Pilot 服务..."
docker-compose -f docker-compose.prod.yml build hq-pilot

echo ""
echo "5. 重启 HQ Pilot..."
docker-compose -f docker-compose.prod.yml up -d hq-pilot

echo ""
echo "6. 等待服务启动 (30秒)..."
sleep 30

# 7. 检查服务状态
echo ""
echo "7. 检查容器状态..."
docker ps | grep hq-pilot

# 8. 查看启动日志
echo ""
echo "8. 查看启动日志..."
docker logs agentrix-hq-pilot --tail 100 | grep -E "Nest application|AI|engine|RAG|port|error" || docker logs agentrix-hq-pilot --tail 50

# 9. 测试健康检查
echo ""
echo "9. 测试健康检查..."
docker exec agentrix-hq-pilot wget -qO- http://localhost:3005/api/health && echo "✓ 健康检查通过"

# 10. 测试 Agent 对话
echo ""
echo "10. 测试 Agent 对话..."
curl -X POST http://localhost:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"ceo","messages":[{"role":"user","content":"你好，请简单介绍一下Agentrix平台的核心功能"}]}' \
  2>/dev/null | head -c 500
echo ""

echo ""
echo "======================================"
echo "配置完成！"
echo "======================================"
echo ""
echo "访问测试:"
echo "  官网: http://3.236.193.38/"
echo "  指挥室: http://3.236.193.38:8080/"
