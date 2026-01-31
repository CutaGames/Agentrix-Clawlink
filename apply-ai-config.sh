#!/bin/bash
# 应用AI配置

cd ~/Agentrix

# 1. 备份
cp backend/.env backend/.env.backup-final

# 2. 删除所有AI配置行
sed -i '/^AI_ENGINE_/d' backend/.env
sed -i '/^AWS_MODEL_/d' backend/.env  
sed -i '/^GEMINI_MODEL_/d' backend/.env
sed -i '/^DEFAULT_AI_ENGINE=/d' backend/.env
sed -i '/^DEFAULT_AI_MODEL=/d' backend/.env

# 3. 追加新配置
cat ~/ai-config-append.txt >> backend/.env

# 4. 验证
echo "✓ AI配置已更新"
echo ""
grep -E "AI_ENGINE_|AWS_MODEL_|GEMINI_MODEL_|DEFAULT_AI" backend/.env

# 5. 重启HQ Pilot
echo ""
echo "重启 HQ Pilot..."
docker-compose -f docker-compose.prod.yml restart hq-pilot

echo ""
echo "等待30秒..."
sleep 30

echo ""
echo "查看启动状态..."
docker ps | grep hq-pilot

echo ""
echo "完成！"
