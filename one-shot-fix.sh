#!/bin/bash
# 完整的AI引擎配置修复脚本 - 一次性执行

ssh -i ~/.ssh/agentrix-us.pem ubuntu@3.236.193.38 << 'ENDSSH'
cd ~/Agentrix

echo "=== 开始修复 AI 引擎配置 ==="

# 备份
cp backend/.env backend/.env.backup-final-$(date +%H%M%S)

# 删除所有AI相关配置
sed -i '/^AI_ENGINE_/d' backend/.env
sed -i '/^AWS_MODEL_/d' backend/.env
sed -i '/^GEMINI_MODEL_/d' backend/.env
sed -i '/^DEFAULT_AI_ENGINE=/d' backend/.env
sed -i '/^DEFAULT_AI_MODEL=/d' backend/.env

# 追加新配置
cat >> backend/.env << 'EOF'

# AI引擎配置 (2026-01-27)
AI_ENGINE_ARCHITECT=bedrock
AWS_MODEL_ARCHITECT=us.anthropic.claude-opus-4-20250514-v1:0
AI_ENGINE_CODER=bedrock
AWS_MODEL_CODER=us.anthropic.claude-sonnet-4-20250514-v1:0
AI_ENGINE_GROWTH=gemini
GEMINI_MODEL_GROWTH=gemini-1.5-flash
AI_ENGINE_BACKUP=bedrock
AWS_MODEL_BACKUP=us.anthropic.claude-3-5-haiku-20241022-v1:0
DEFAULT_AI_ENGINE=bedrock
DEFAULT_AI_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
EOF

echo "✓ 配置已更新"
echo ""
echo "新配置:"
grep -E "AI_ENGINE_|AWS_MODEL_|GEMINI_MODEL_|DEFAULT_AI" backend/.env

# 重启HQ Pilot
echo ""
echo "=== 重启 HQ Pilot ==="
docker-compose -f docker-compose.prod.yml restart hq-pilot

echo "等待40秒..."
sleep 40

echo ""
echo "=== 服务状态 ==="
docker ps | grep hq-pilot

echo ""
echo "=== 完成！ ==="
ENDSSH
