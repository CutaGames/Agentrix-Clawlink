@echo off
chcp 65001 >nul
echo ==========================================
echo PayMind V3.0 支付流程测试
echo ==========================================
echo.

echo 1. 检查服务状态...
echo.

REM 检查后端服务
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 后端服务运行正常 (http://localhost:3001)
) else (
    echo ❌ 后端服务未运行，请先启动后端服务
    echo    命令: cd backend ^&^& npm run start:dev
    pause
    exit /b 1
)

REM 检查前端服务
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 前端服务运行正常 (http://localhost:3000)
) else (
    echo ❌ 前端服务未运行，请先启动前端服务
    echo    命令: cd paymindfrontend ^&^& npm run dev
    pause
    exit /b 1
)

echo.
echo 2. 测试场景...
echo.

echo 场景1: 法币支付 → 数字货币结算（实体商品，无Agent）
echo   预期总手续费: 3.5%%
echo   预期汇率显示: 1 CNY = 0.142 USDC
echo.

echo 场景2: 法币支付 → 数字货币结算（服务/数字资产，有Agent）
echo   预期总手续费: 7%%
echo   预期汇率显示: 1 CNY = 0.142 USDC
echo.

echo 场景3: 数字货币直接支付（实体商品，无Agent）
echo   预期总手续费: 0.5%%
echo   预期无汇率显示
echo.

echo 场景4: 数字货币直接支付（服务/数字资产，有Agent）
echo   预期总手续费: 4%%
echo   预期无汇率显示
echo.

echo.
echo 3. 前端测试...
echo.

echo 请在浏览器中访问以下页面进行测试：
echo.
echo   - 首页: http://localhost:3000
echo   - 支付演示: http://localhost:3000/payment-demo
echo   - Agent页面: http://localhost:3000/agent
echo.

echo 测试步骤：
echo   1. 访问 http://localhost:3000/payment-demo
echo   2. 点击"体验统一支付流程"按钮
echo   3. 查看支付选项列表
echo   4. 验证总手续费显示（百分比）
echo   5. 验证汇率显示（如果涉及转换）
echo   6. 验证KYC要求显示
echo   7. 验证QuickPay授权状态显示
echo.

echo ==========================================
echo 测试完成
echo ==========================================
pause

