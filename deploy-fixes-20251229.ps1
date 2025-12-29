# Agentrix 生产环境部署脚本（Windows PowerShell）
# 日期: 2025-12-29
# 修复: MCP OAuth、Transak 金额锁定、支付步骤提示器

Write-Host "🚀 开始部署 Agentrix 到生产环境..." -ForegroundColor Green
Write-Host ""

$SERVER = "root@129.226.152.88"
$PASSWORD = "zyc.2392018"
$PROJECT_DIR = "/var/www/agentrix-website"

Write-Host "📋 部署清单:" -ForegroundColor Cyan
Write-Host "  - MCP OAuth 配置修复"
Write-Host "  - Transak 金额锁定修复"
Write-Host "  - 支付步骤提示器修复"
Write-Host ""

# 使用 WSL 执行命令
$WSL = "wsl -e bash -c"

# 1. 拉取最新代码（需要手动完成）
Write-Host "📥 步骤 1/5: 拉取最新代码..." -ForegroundColor Yellow
Write-Host "⚠️  请在另一个终端手动执行:" -ForegroundColor Red
Write-Host "    ssh root@129.226.152.88" -ForegroundColor White
Write-Host "    输入密码: zyc.2392018" -ForegroundColor White
Write-Host "    cd /var/www/agentrix-website" -ForegroundColor White
Write-Host "    git pull origin main" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "已完成 git pull? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "❌ 请先完成 git pull" -ForegroundColor Red
    exit 1
}

# 2. 备份数据库
Write-Host "💾 步骤 2/5: 备份数据库..." -ForegroundColor Yellow
$backupCmd = "sshpass -p '$PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER 'docker exec postgresql pg_dump -U postgres paymind > $PROJECT_DIR/backup_`$(date +%Y%m%d_%H%M%S).sql'"
& $WSL $backupCmd
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 数据库备份成功" -ForegroundColor Green
} else {
    Write-Host "❌ 数据库备份失败" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. 构建后端
Write-Host "🔨 步骤 3/5: 构建后端..." -ForegroundColor Yellow
$buildCmd = "sshpass -p '$PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER 'cd $PROJECT_DIR/backend && npm install && npm run build'"
& $WSL $buildCmd
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 后端构建成功" -ForegroundColor Green
} else {
    Write-Host "❌ 后端构建失败" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. 重启后端服务
Write-Host "🔄 步骤 4/5: 重启后端服务..." -ForegroundColor Yellow
$restartCmd = "sshpass -p '$PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER 'pm2 restart agentrix-backend'"
& $WSL $restartCmd
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 后端服务重启成功" -ForegroundColor Green
} else {
    Write-Host "❌ 后端服务重启失败" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. 检查服务状态
Write-Host "🔍 步骤 5/5: 检查服务状态..." -ForegroundColor Yellow
$statusCmd = "sshpass -p '$PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER 'pm2 list'"
& $WSL $statusCmd
Write-Host ""

# 验证健康状态
Write-Host "🏥 验证服务健康状态..." -ForegroundColor Yellow
Write-Host "正在访问 https://api.agentrix.io/api/health ..."
try {
    $response = Invoke-WebRequest -Uri "https://api.agentrix.io/api/health" -UseBasicParsing
    Write-Host "✅ 健康检查通过: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "⚠️  健康检查失败: $_" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 验证清单：" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. MCP OAuth 验证:" -ForegroundColor White
Write-Host "   - 访问 https://api.agentrix.top/.well-known/oauth-authorization-server"
Write-Host "   - 访问 https://api.agentrix.top/.well-known/openid-configuration"
Write-Host "   - 在 ChatGPT 中添加 MCP Server: https://api.agentrix.top/api/mcp/sse"
Write-Host "   - 选择"未授权"模式应该成功" -ForegroundColor Green
Write-Host ""
Write-Host "2. Transak 支付验证:" -ForegroundColor White
Write-Host "   - 选择 399 USD 商品"
Write-Host "   - 检查锁定金额约为 411 USD (399 + 手续费)"
Write-Host "   - 确认合约地址收到 399 USDC" -ForegroundColor Green
Write-Host ""
Write-Host "3. 步骤提示器验证:" -ForegroundColor White
Write-Host "   - 邮箱验证 → KYC（如需） → 支付 → 完成"
Write-Host "   - 已完成 KYC 用户应直接跳到支付步骤" -ForegroundColor Green
Write-Host ""

Write-Host "📝 注意: 前端暂未部署（有字符编码警告）" -ForegroundColor Yellow
Write-Host "   如需部署前端，请手动执行:"
Write-Host "   ssh root@129.226.152.88"
Write-Host "   cd /var/www/agentrix-website/frontend"
Write-Host "   npm run build"
Write-Host "   pm2 restart agentrix-frontend"
Write-Host ""
