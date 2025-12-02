@echo off
chcp 65001 >nul
echo ========================================
echo PayMind V3.0 数据库迁移和测试
echo ========================================
echo.

echo [1/3] 运行数据库迁移（创建withdrawals表）...
wsl bash -c "cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website/backend && npm run migration:run"
if %errorlevel% neq 0 (
    echo 迁移失败！
    pause
    exit /b 1
)
echo.

echo [2/3] 检查Provider API密钥配置...
wsl bash -c "cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website/backend && if [ -f .env ]; then echo '✅ .env文件存在'; grep -q 'MOONPAY\|ALCHEMY\|BINANCE' .env && echo '✅ 已配置Provider API密钥' || echo '⚠️  未配置Provider API密钥（将使用模拟模式）'; else echo '⚠️  .env文件不存在，请复制.env.example创建'; fi"
echo.

echo [3/3] 运行测试脚本...
call 测试结算功能.bat
echo.

echo ========================================
echo 完成！
echo ========================================
pause

