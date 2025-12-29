#!/bin/bash

# Agentrix 生产环境部署脚本
# 日期: 2025-12-29
# 修复: MCP OAuth、Transak 金额锁定、支付步骤提示器

echo "🚀 开始部署 Agentrix 到生产环境..."
echo ""

# 服务器信息
SERVER="root@129.226.152.88"
PASSWORD="zyc.2392018"
PROJECT_DIR="/var/www/agentrix-website"

echo "📋 部署清单:"
echo "  - MCP OAuth 配置修复"
echo "  - Transak 金额锁定修复"
echo "  - 支付步骤提示器修复"
echo ""

# 1. 备份数据库
echo "💾 步骤 1/6: 备份数据库..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER \
  "docker exec postgresql pg_dump -U postgres paymind > $PROJECT_DIR/backup_\$(date +%Y%m%d_%H%M%S).sql"

if [ $? -eq 0 ]; then
  echo "✅ 数据库备份成功"
else
  echo "❌ 数据库备份失败"
  exit 1
fi
echo ""

# 2. 拉取最新代码
echo "📥 步骤 2/6: 拉取最新代码..."
echo "⚠️  需要手动在服务器上执行:"
echo "    ssh root@129.226.152.88"
echo "    cd /var/www/agentrix-website"
echo "    git pull origin main"
echo ""
read -p "已完成 git pull? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 请先完成 git pull"
  exit 1
fi

# 3. 安装后端依赖
echo "📦 步骤 3/6: 安装后端依赖..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER \
  "cd $PROJECT_DIR/backend && npm install"

if [ $? -eq 0 ]; then
  echo "✅ 后端依赖安装成功"
else
  echo "❌ 后端依赖安装失败"
  exit 1
fi
echo ""

# 4. 构建后端
echo "🔨 步骤 4/6: 构建后端..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER \
  "cd $PROJECT_DIR/backend && npm run build"

if [ $? -eq 0 ]; then
  echo "✅ 后端构建成功"
else
  echo "❌ 后端构建失败"
  exit 1
fi
echo ""

# 5. 重启后端服务
echo "🔄 步骤 5/6: 重启后端服务..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER \
  "pm2 restart agentrix-backend"

if [ $? -eq 0 ]; then
  echo "✅ 后端服务重启成功"
else
  echo "❌ 后端服务重启失败"
  exit 1
fi
echo ""

# 6. 检查服务状态
echo "🔍 步骤 6/6: 检查服务状态..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER \
  "pm2 list && pm2 logs agentrix-backend --lines 20"
echo ""

# 验证健康状态
echo "🏥 验证服务健康状态..."
echo "正在访问 https://api.agentrix.io/api/health ..."
curl -s https://api.agentrix.io/api/health | jq '.' || curl -s https://api.agentrix.io/api/health
echo ""

echo "✅ 部署完成！"
echo ""
echo "🧪 验证清单："
echo ""
echo "1. MCP OAuth 验证:"
echo "   - 访问 https://api.agentrix.top/.well-known/oauth-authorization-server"
echo "   - 访问 https://api.agentrix.top/.well-known/openid-configuration"
echo "   - 在 ChatGPT 中添加 MCP Server: https://api.agentrix.top/api/mcp/sse"
echo "   - 选择"未授权"模式应该成功"
echo ""
echo "2. Transak 支付验证:"
echo "   - 选择 399 USD 商品"
echo "   - 检查锁定金额约为 411 USD (399 + 手续费)"
echo "   - 确认合约地址收到 399 USDC"
echo ""
echo "3. 步骤提示器验证:"
echo "   - 邮箱验证 → KYC（如需） → 支付 → 完成"
echo "   - 已完成 KYC 用户应直接跳到支付步骤"
echo ""

# 前端部署提示
echo "📝 注意: 前端暂未部署（有字符编码警告）"
echo "   如需部署前端，请手动执行:"
echo "   ssh root@129.226.152.88"
echo "   cd /var/www/agentrix-website/frontend"
echo "   npm run build"
echo "   pm2 restart agentrix-frontend"
echo ""
