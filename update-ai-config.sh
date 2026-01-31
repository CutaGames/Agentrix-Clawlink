#!/bin/bash
# 更新 HQ Pilot AI 引擎配置 (Opus 4.5 版本)

set -e

echo "======================================"
echo "更新 AI 引擎配置到 AWS Bedrock"
echo "======================================"

cd ~/Agentrix

# 1. 备份当前配置
echo ""
echo "1. 备份现有配置..."
if [ -f backend/.env ]; then
    cp backend/.env backend/.env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ 已备份到 backend/.env.backup.*"
fi

# 2. 更新环境变量
echo ""
echo "2. 更新 AI 引擎配置..."
cat > backend/.env.ai-update << 'EOF'

# ========================================
# AI 引擎配置更新 (2026-01-27)
# ========================================

# AWS Bedrock 配置 (云创 $1500 额度)
AWS_REGION=us-east-1
AWS_BEARER_TOKEN_BEDROCK=${AWS_BEARER_TOKEN_BEDROCK}

# Google Gemini 配置 (免费额度)
GEMINI_API_KEY=${GEMINI_API_KEY}

# 禁用 DeepSeek (余额不足)
DEEPSEEK_API_KEY=

# AI 引擎路由策略
# 架构师 (CEO/CTO/等): AWS Bedrock Claude Opus 4.5
AI_ENGINE_ARCHITECT=bedrock
AWS_MODEL_ARCHITECT=anthropic.claude-opus-4-5:1

# 开发者 (Coder): AWS Bedrock Claude Sonnet 4.5
AI_ENGINE_CODER=bedrock
AWS_MODEL_CODER=anthropic.claude-sonnet-4-5:1

# 增长/商务: Gemini Flash 1.5 (免费)
AI_ENGINE_GROWTH=gemini
GEMINI_MODEL_GROWTH=gemini-1.5-flash

# Backup 引擎: AWS Bedrock Haiku
AI_ENGINE_BACKUP=bedrock
AWS_MODEL_BACKUP=anthropic.claude-haiku-4:1

# 默认引擎
DEFAULT_AI_ENGINE=bedrock
DEFAULT_AI_MODEL=anthropic.claude-sonnet-4-5:1
EOF

echo "✓ AI 配置文件已生成"

# 3. 检查现有环境变量
echo ""
echo "3. 检查必要的 API Keys..."
if grep -q "AWS_BEARER_TOKEN_BEDROCK=your_" backend/.env 2>/dev/null || ! grep -q "AWS_BEARER_TOKEN_BEDROCK" backend/.env 2>/dev/null; then
    echo "⚠️  需要配置 AWS_BEARER_TOKEN_BEDROCK"
    echo "   请在 backend/.env 中添加有效的 AWS Bedrock Token"
fi

if grep -q "GEMINI_API_KEY=your_" backend/.env 2>/dev/null || ! grep -q "GEMINI_API_KEY" backend/.env 2>/dev/null; then
    echo "⚠️  需要配置 GEMINI_API_KEY"
    echo "   请在 backend/.env 中添加有效的 Gemini API Key"
fi

# 4. 合并配置（需要手动确认）
echo ""
echo "4. 准备合并配置..."
echo "   配置已生成在 backend/.env.ai-update"
echo "   请手动检查并合并到 backend/.env"
echo ""
echo "   或运行: cat backend/.env.ai-update >> backend/.env"

# 5. 重建并重启服务
echo ""
read -p "是否现在重建并重启 HQ Pilot 服务? (y/N): " confirm
if [[ $confirm == [yY] ]]; then
    echo ""
    echo "5. 重建 HQ Pilot 服务..."
    docker compose -f docker-compose.prod.yml build hq-pilot
    
    echo ""
    echo "6. 重启 HQ Pilot..."
    docker compose -f docker-compose.prod.yml up -d hq-pilot
    
    echo ""
    echo "7. 等待服务启动 (30秒)..."
    sleep 30
    
    echo ""
    echo "8. 检查服务状态..."
    docker ps | grep agentrix-hq-pilot
    
    echo ""
    echo "9. 查看启动日志..."
    docker logs agentrix-hq-pilot --tail 50 | grep -E "Nest application|AI|engine|error" || docker logs agentrix-hq-pilot --tail 30
    
    echo ""
    echo "✓ 服务已重启"
else
    echo ""
    echo "取消重启。请手动执行："
    echo "  docker compose -f docker-compose.prod.yml up -d --build hq-pilot"
fi

echo ""
echo "======================================"
echo "配置更新完成！"
echo "======================================"
echo ""
echo "下一步："
echo "1. 确认 AWS Bedrock Token 和 Gemini API Key 已配置"
echo "2. 测试 Agent 对话: curl -X POST http://localhost:8080/api/hq/chat ..."
echo "3. 查看日志确认 AI 引擎连接成功"
