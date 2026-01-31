#!/bin/bash
# 远程诊断和修复 HQ Pilot

echo "连接服务器: 3.236.193.38"
echo "=================================="

# 检查 Docker 容器
echo ""
echo "1. 检查容器状态..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker 命令未找到或无权限"

# 进入项目目录
cd ~/Agentrix 2>/dev/null || cd /home/ubuntu/Agentrix 2>/dev/null || {
    echo "错误: 未找到 Agentrix 目录"
    echo "当前目录: $(pwd)"
    echo "用户: $(whoami)"
    exit 1
}

echo ""
echo "2. 当前位置: $(pwd)"

# 检查知识库
echo ""
echo "3. 检查知识库目录..."
ls -lh backend/knowledge/ 2>/dev/null | head -10 || echo "知识库目录不存在"

# 检查 HQ Pilot 日志
echo ""
echo "4. HQ Pilot 最近日志..."
docker logs agentrix-hq-pilot --tail 30 2>/dev/null | grep -E "Nest|error|AI|RAG|knowledge|引擎" || echo "无法获取日志"

# 检查环境变量
echo ""
echo "5. 检查 AI 引擎配置..."
grep -E "AI_ENGINE|AWS_|GEMINI_|DEEPSEEK_" backend/.env 2>/dev/null | head -15 || echo "无法读取 .env"

# 测试健康检查
echo ""
echo "6. 测试健康检查..."
docker exec agentrix-hq-pilot wget -qO- http://localhost:3005/api/health 2>/dev/null || echo "健康检查失败"

echo ""
echo "诊断完成！"
