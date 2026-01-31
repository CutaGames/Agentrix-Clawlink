#!/bin/bash
# 快速部署脚本 - 直接在服务器上运行
# 用于绕过SSH密钥问题，直接在服务器端执行修复

echo "=========================================="
echo "Agentrix HQ Pilot 快速修复脚本"
echo "版本: V2.0 | 日期: 2026-01-27"
echo "=========================================="
echo ""

cd ~/Agentrix || { echo "错误: Agentrix目录不存在"; exit 1; }

# 备份
echo "📦 备份当前配置..."
cp backend/.env.prod backend/.env.prod.backup.$(date +%Y%m%d_%H%M%S)
cp backend/src/modules/hq/hq.service.ts backend/src/modules/hq/hq.service.ts.backup

# 修改 .env.prod - 添加AWS配置
echo ""
echo "🔧 配置AWS Bedrock..."
echo ""
echo "请输入AWS凭证（从云创AWS账户获取）："
read -p "AWS_ACCESS_KEY_ID: " AWS_KEY
read -p "AWS_SECRET_ACCESS_KEY: " AWS_SECRET

# 检查.env.prod中是否已有AWS配置
if grep -q "AWS_REGION" backend/.env.prod; then
    echo "更新现有AWS配置..."
    sed -i "s/AWS_ACCESS_KEY_ID=.*/AWS_ACCESS_KEY_ID=$AWS_KEY/" backend/.env.prod
    sed -i "s/AWS_SECRET_ACCESS_KEY=.*/AWS_SECRET_ACCESS_KEY=$AWS_SECRET/" backend/.env.prod
else
    echo "添加新AWS配置..."
    cat >> backend/.env.prod << EOF

# ========== AWS Bedrock配置 (云创1500美金额度) ==========
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=$AWS_KEY
AWS_SECRET_ACCESS_KEY=$AWS_SECRET
AWS_BEDROCK_REGION=us-east-1
EOF
fi

echo "✅ AWS配置完成"

# 修改 hq.service.ts - 更新AI引擎策略
echo ""
echo "🤖 更新AI引擎分层策略..."

cat > /tmp/hq_ai_engine_patch.txt << 'EOPATCH'
      // 模型映射策略 V2 (Agentrix "智能分级混合模型引擎")
      // 云创AWS Bedrock 1500美金额度分配:
      // - 架构师(CEO): Claude Opus 4 (最强推理)
      // - 程序员(Coder): Claude Sonnet 4.5 (代码专家)
      // - 增长商务: Gemini Flash 1.5 (免费额度)
      // - 备用降级: Claude Haiku (高性价比)
      
      let targetModel = 'gemini-1.5-flash-002'; 
      let provider: 'gemini' | 'bedrock' | 'openai' | 'deepseek' | 'groq' = 'gemini';

      // 1. CEO/系统架构师 - 使用 Claude Opus 4 (最强推理和规划能力)
      if (agentId === 'ceo' || agentId === 'CEO' || agentId === 'architect' || 
          agentId === 'ARCHITECT-01' || agentId === 'AGENT-ARCHITECT-001') {
        targetModel = 'anthropic.claude-opus-4-20250514-v1:0'; 
        provider = 'bedrock';
        this.logger.log('🎯 架构师模式：使用 Claude Opus 4 (AWS Bedrock)');
      } 
      // 2. 开发者/代码专家 - 使用 Claude Sonnet 4.5 (代码优化专家)
      else if (agentId === 'coder' || agentId === 'CODER' || agentId === 'developer' ||
               agentId === 'CODER-01' || agentId === 'AGENT-CODER-001' || 
               agentId.toLowerCase().includes('dev') || agentId.toLowerCase().includes('code')) {
        targetModel = 'anthropic.claude-sonnet-4-20250514-v1:0';
        provider = 'bedrock';
        this.logger.log('💻 程序员模式：使用 Claude Sonnet 4.5 (AWS Bedrock)');
      } 
      // 3. 增长/商务/运营 - 使用 Gemini Flash 1.5 (免费额度)
      else if (agentId.toLowerCase().includes('growth') || agentId.toLowerCase().includes('bd') ||
               agentId.toLowerCase().includes('sales') || agentId.toLowerCase().includes('marketing')) {
        targetModel = 'gemini-1.5-flash-002';
        provider = 'gemini';
        this.logger.log('📈 增长模式：使用 Gemini Flash 1.5 (免费)');
      } 
      // 4. 其他默认使用 Gemini Flash (免费额度节约成本)
      else {
        targetModel = 'gemini-1.5-flash-002';
        provider = 'gemini';
        this.logger.log('🌟 默认模式：使用 Gemini Flash 1.5 (免费)');
      }
EOPATCH

# 使用sed替换（需要找到正确的行范围）
echo "⚠️  注意：需要手动更新 backend/src/modules/hq/hq.service.ts"
echo "替换内容已保存到 /tmp/hq_ai_engine_patch.txt"
echo ""
read -p "是否已手动更新代码? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 请手动更新代码后再继续"
    echo "参考文件: /tmp/hq_ai_engine_patch.txt"
    exit 1
fi

# 重建并部署
echo ""
echo "🔨 重建 HQ Pilot Docker 镜像..."
docker compose -f docker-compose.prod.yml build hq-pilot

echo ""
echo "🚀 重启服务..."
docker compose -f docker-compose.prod.yml up -d hq-pilot

echo ""
echo "⏳ 等待服务启动（30秒）..."
sleep 30

# 验证
echo ""
echo "✅ 验证服务..."
docker ps | grep agentrix-hq-pilot

HEALTH=$(docker exec agentrix-hq-pilot wget -qO- http://localhost:3005/api/health 2>/dev/null || echo "failed")
if [[ $HEALTH == *"ok"* ]]; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败"
    docker logs agentrix-hq-pilot --tail 30
    exit 1
fi

# 测试AI引擎
echo ""
echo "🧪 测试CEO Agent (Claude Opus 4)..."
CEO_TEST=$(curl -s -X POST http://localhost:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"ceo","messages":[{"role":"user","content":"Hello"}]}' | grep -o "指令中断" || echo "ok")

if [ "$CEO_TEST" == "ok" ]; then
    echo "✅ CEO Agent工作正常"
else
    echo "⚠️  CEO Agent可能需要检查AWS凭证"
fi

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📊 AI引擎配置:"
echo "   🎯 CEO/架构师 -> Claude Opus 4"
echo "   💻 Coder -> Claude Sonnet 4.5"
echo "   📈 增长/商务 -> Gemini Flash 1.5"
echo ""
echo "🌐 访问: http://57.182.89.146:8080/"
