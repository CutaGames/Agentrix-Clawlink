# Agentrix P0 & UI 功能测试
$baseUrl = "http://localhost:3001"
$passed = 0
$failed = 0

function Test-API {
    param([string]$Name, [string]$Url, [int]$Expected = 200)
    Write-Host "`n[$Name]" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq $Expected) {
            Write-Host "  ✓ 通过 (HTTP $($response.StatusCode))" -ForegroundColor Green
            $script:passed++
        }
        else {
            Write-Host "  ✗ 失败 (期望 $Expected, 实际 $($response.StatusCode))" -ForegroundColor Red
            $script:failed++
        }
    }
    catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq $Expected) {
            Write-Host "  ✓ 通过 (HTTP $status)" -ForegroundColor Green
            $script:passed++
        }
        else {
            Write-Host "  ✗ 失败: $status" -ForegroundColor Red
            $script:failed++
        }
    }
}

Write-Host "==========================================`n" -ForegroundColor Cyan
Write-Host "Agentrix 功能测试报告" -ForegroundColor Cyan
Write-Host "时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "`n==========================================" -ForegroundColor Cyan

Write-Host "`n[P0.1 支付系统统一]" -ForegroundColor Magenta
Test-API "健康检查" "$baseUrl/api/health"

Write-Host "`n[P0.2 跨协议自动注册]" -ForegroundColor Magenta
Test-API "X402 Discovery" "$baseUrl/.well-known/x402"
Test-API "UCP产品目录" "$baseUrl/ucp/v1/products"
Test-API "UCP Skills目录" "$baseUrl/ucp/v1/skills"
Test-API "OAuth Discovery" "$baseUrl/.well-known/oauth-authorization-server"
Test-API "OpenID配置" "$baseUrl/.well-known/openid-configuration"

Write-Host "`n[P0.3 开发者收益 - 需认证]" -ForegroundColor Magenta
Test-API "开发者仪表盘" "$baseUrl/api/developer/dashboard" 401
Test-API "收益汇总" "$baseUrl/api/developer/revenue/summary" 401

Write-Host "`n[MCP集成]" -ForegroundColor Magenta
Test-API "MCP OpenAPI" "$baseUrl/api/mcp/openapi.json"

Write-Host "`n[Marketplace]" -ForegroundColor Magenta
Test-API "搜索API" "$baseUrl/api/marketplace/search"

Write-Host "`n==========================================`n" -ForegroundColor Cyan
Write-Host "测试总结:" -ForegroundColor Cyan
Write-Host "总数: $($passed + $failed)"
Write-Host "通过: $passed" -ForegroundColor Green
Write-Host "失败: $failed" -ForegroundColor Red

if ($failed -eq 0) {
    Write-Host "`n✓ 所有测试通过！`n" -ForegroundColor Green
}
else {
    Write-Host "`n✗ 部分测试失败`n" -ForegroundColor Red
}
