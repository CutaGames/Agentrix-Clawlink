# Agentrix Agent V3.0 测试脚本 (PowerShell版本)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Agentrix Agent V3.0 功能测试" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$API_URL = "http://localhost:3001/api"
$TOKEN = $env:AGENTRIX_TOKEN  # 需要先设置token

if (-not $TOKEN) {
    Write-Host "警告: 未设置 AGENTRIX_TOKEN 环境变量" -ForegroundColor Yellow
    Write-Host "请先登录获取token，然后设置: `$env:AGENTRIX_TOKEN='your-token'" -ForegroundColor Yellow
}

$PASSED = 0
$FAILED = 0

function Test-Api {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [string]$Data = $null,
        [int]$ExpectedStatus = 200
    )

    Write-Host "`n测试: $Name" -ForegroundColor Yellow

    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }

    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri "$API_URL$Endpoint" -Method Get -Headers $headers -ErrorAction Stop
            $httpCode = 200
        } else {
            $body = if ($Data) { $Data | ConvertTo-Json -Depth 10 } else { "{}" }
            $response = Invoke-RestMethod -Uri "$API_URL$Endpoint" -Method $Method -Headers $headers -Body $body -ErrorAction Stop
            $httpCode = 200
        }

        Write-Host "✓ 通过 (HTTP $httpCode)" -ForegroundColor Green
        $script:PASSED++
        return $response
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        Write-Host "✗ 失败 (期望: HTTP $ExpectedStatus, 实际: HTTP $httpCode)" -ForegroundColor Red
        Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
        $script:FAILED++
        return $null
    }
}

# 1. 测试Agent对话
Write-Host "`n=== 1. Agent对话测试 ===" -ForegroundColor Cyan
$chatResponse = Test-Api "创建会话并发送消息" POST "/agent/chat" '{"message":"帮我找一把游戏剑，预算20美元"}'
$SESSION_ID = $chatResponse.sessionId
Write-Host "会话ID: $SESSION_ID" -ForegroundColor Gray

if ($SESSION_ID) {
    Test-Api "多轮对话上下文保持" POST "/agent/chat" "{\"message\":\"把刚才那把加入购物车\",\"sessionId\":\"$SESSION_ID\"}"
}

# 2. 测试商品搜索
Write-Host "`n=== 2. 商品搜索/比价测试 ===" -ForegroundColor Cyan
Test-Api "商品搜索" POST "/agent/search-products" '{"query":"游戏剑","filters":{"priceMax":20,"currency":"USD"}}'

# 3. 测试推荐
Write-Host "`n=== 3. 情景感知推荐测试 ===" -ForegroundColor Cyan
if ($SESSION_ID) {
    Test-Api "获取推荐" POST "/agent/recommendations" "{\"sessionId\":\"$SESSION_ID\",\"query\":\"游戏装备\"}"
}

# 4. 测试PayIntent
Write-Host "`n=== 4. PayIntent测试 ===" -ForegroundColor Cyan
$payIntentResponse = Test-Api "创建PayIntent" POST "/pay-intents" '{"type":"order_payment","amount":100,"currency":"CNY","description":"测试支付"}'
$PAY_INTENT_ID = $payIntentResponse.id
Write-Host "PayIntent ID: $PAY_INTENT_ID" -ForegroundColor Gray

if ($PAY_INTENT_ID) {
    Test-Api "授权PayIntent" POST "/pay-intents/$PAY_INTENT_ID/authorize" '{"authorizationType":"user"}'
}

# 5. 测试QuickPay授权
Write-Host "`n=== 5. QuickPay授权测试 ===" -ForegroundColor Cyan
Test-Api "创建QuickPay授权" POST "/quick-pay-grants" '{"paymentMethod":{"type":"stripe"},"permissions":{"maxAmount":1000,"maxDailyAmount":5000}}'

# 6. 测试会话管理
Write-Host "`n=== 6. 会话管理测试 ===" -ForegroundColor Cyan
Test-Api "获取会话列表" GET "/agent/sessions" $null

if ($SESSION_ID) {
    Test-Api "获取会话详情" GET "/agent/sessions/$SESSION_ID" $null
}

# 7. 测试沙箱执行
Write-Host "`n=== 7. 沙箱执行测试 ===" -ForegroundColor Cyan
Test-Api "执行沙箱代码" POST "/sandbox/execute" '{"code":"const payment = await agentrix.payments.create({amount: 100, currency: \"CNY\"});","language":"typescript"}'

# 总结
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "测试完成" -ForegroundColor Cyan
Write-Host "通过: $PASSED" -ForegroundColor Green
Write-Host "失败: $FAILED" -ForegroundColor $(if ($FAILED -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================" -ForegroundColor Cyan

if ($FAILED -eq 0) {
    exit 0
} else {
    exit 1
}

