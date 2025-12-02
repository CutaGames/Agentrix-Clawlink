@echo off
chcp 65001 >nul
echo ========================================
echo Agentrix V3.0 结算功能测试
echo ========================================
echo.

echo [1/4] 检查服务状态...
wsl bash -c "curl -s http://localhost:3001/api/health > /dev/null && echo '后端服务运行正常' || echo '后端服务未运行'"
wsl bash -c "curl -s -o /dev/null -w '%%{http_code}' http://localhost:3000 | grep -q '200' && echo '前端服务运行正常' || echo '前端服务未运行'"
echo.

echo [2/4] 测试NFT/虚拟资产即时结算...
echo 创建NFT订单...
wsl bash -c "curl -X POST http://localhost:3001/api/payments/process -H 'Content-Type: application/json' -d '{\"amount\":100,\"currency\":\"USDC\",\"paymentMethod\":\"wallet\",\"merchantId\":\"test-merchant\",\"metadata\":{\"orderType\":\"nft\"}}' 2>/dev/null | head -20"
echo.

echo [3/4] 测试服务类订单结算...
echo 创建服务订单...
wsl bash -c "curl -X POST http://localhost:3001/api/payments/process -H 'Content-Type: application/json' -d '{\"amount\":100,\"currency\":\"USDC\",\"paymentMethod\":\"wallet\",\"merchantId\":\"test-merchant\",\"metadata\":{\"orderType\":\"service\"}}' 2>/dev/null | head -20"
echo.

echo [4/4] 测试实体商品订单结算...
echo 创建实体商品订单...
wsl bash -c "curl -X POST http://localhost:3001/api/payments/process -H 'Content-Type: application/json' -d '{\"amount\":100,\"currency\":\"USDC\",\"paymentMethod\":\"wallet\",\"merchantId\":\"test-merchant\",\"metadata\":{\"orderType\":\"product\"}}' 2>/dev/null | head -20"
echo.

echo ========================================
echo 测试完成！请查看详细测试指南：
echo 测试结算功能-所有场景.md
echo ========================================
pause

