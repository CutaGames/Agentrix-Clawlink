#!/bin/bash
# 在SSH会话中执行的测试脚本

cd ~/Agentrix

echo "======================================"
echo "诊断 AI 引擎配置"
echo "======================================"

echo ""
echo "1. 检查 AWS Bedrock Token 配置:"
grep "AWS_BEARER_TOKEN_BEDROCK" backend/.env | sed 's/=.*/=***隐藏***/'
echo ""
echo "2. 检查 AWS Region:"
grep "AWS_REGION" backend/.env

echo ""
echo "3. 检查 AI 引擎策略配置:"
grep -E "AI_ENGINE_|AWS_MODEL_|GEMINI_MODEL_" backend/.env | tail -10

echo ""
echo "4. 测试 Gemini API (免费):"
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$(grep GEMINI_API_KEY backend/.env | cut -d'=' -f2)" | head -c 200

echo ""
echo ""
echo "5. HQ Pilot 容器状态:"
docker ps | grep hq-pilot

echo ""
echo "6. 最近50行日志 (过滤AI相关):"
docker logs agentrix-hq-pilot --tail 50 2>&1 | grep -iE "ai|engine|bedrock|gemini|claude|error|warn" | tail -20

echo ""
echo "7. 测试内部 Health Check:"
docker exec agentrix-hq-pilot wget -qO- http://localhost:3005/api/health

echo ""
echo "======================================"
echo "完成诊断"
echo "======================================"
