# Agentrix P0 & UI 功能测试报告
# 测试日期: 2026-01-15

$baseUrl = "http://localhost:3001"
$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "`n[测试] $Name" -ForegroundColor Yellow
    Write-Host "  URL: $Url"
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -ErrorAction Stop
        $status = $response.StatusCode
        $content = $response.Content
        
        if ($status -eq $ExpectedStatus) {
            Write-Host "  ✓ 通过 (HTTP $status)" -ForegroundColor Green
            $result = @{
                Name = $Name
                Status = "通过"
                HttpCode = $status
                Preview = $content.Substring(0, [Math]::Min(100, $content.Length))
            }
        } else {
            Write-Host "  ✗ 失败 (期望 $ExpectedStatus, 实际 $status)" -ForegroundColor Red
            $result = @{
                Name = $Name
                Status = "失败"
                HttpCode = $status
                Preview = ""
            }
        }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($null -eq $status) { $status = "连接失败" }
        
        if ($status -eq $ExpectedStatus) {
            Write-Host "  ✓ 通过 (HTTP $status)" -ForegroundColor Green
            $result = @{
                Name = $Name
                Status = "通过"
                HttpCode = $status
                Preview = ""
            }
        } else {
            Write-Host "  ✗ 失败 ($status)" -ForegroundColor Red
            $result = @{
                Name = $Name
                Status = "失败"
                HttpCode = $status
                Preview = $_.Exception.Message
            }
        }
    }
    
    $script:testResults += $result
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Agentrix P0 功能测试" -ForegroundColor Cyan
Write-Host "测试时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`n[P0.1] 支付系统统一" -ForegroundColor Magenta
Test-Endpoint "健康检查" "$baseUrl/api/health"

Write-Host "`n[P0.2] 跨协议自动注册" -ForegroundColor Magenta
Test-Endpoint "X402 Discovery" "$baseUrl/.well-known/x402"
Test-Endpoint "UCP 产品目录" "$baseUrl/ucp/v1/products"
Test-Endpoint "UCP Skills 目录" "$baseUrl/ucp/v1/skills"
Test-Endpoint "OAuth Discovery" "$baseUrl/.well-known/oauth-authorization-server"
Test-Endpoint "OpenID Configuration" "$baseUrl/.well-known/openid-configuration"

Write-Host "`n[P0.3] 开发者收益 (需认证)" -ForegroundColor Magenta
Test-Endpoint "开发者仪表盘" "$baseUrl/api/developer/dashboard" 401
Test-Endpoint "开发者收益汇总" "$baseUrl/api/developer/revenue/summary" 401

Write-Host "`n[MCP 集成]" -ForegroundColor Magenta
Test-Endpoint "MCP OpenAPI" "$baseUrl/api/mcp/openapi.json"

Write-Host "`n[Marketplace]" -ForegroundColor Magenta
Test-Endpoint "Marketplace 搜索" "$baseUrl/api/marketplace/search"

# 统计结果
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "测试总结" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Status -eq "通过" }).Count
$failedTests = $totalTests - $passedTests

Write-Host "`n总测试数: $totalTests"
Write-Host "通过: $passedTests" -ForegroundColor Green
Write-Host "失败: $failedTests" -ForegroundColor Red

if ($failedTests -eq 0) {
    Write-Host "`n✓ 所有测试通过！" -ForegroundColor Green
} 
else {
    Write-Host "`n✗ 部分测试失败" -ForegroundColor Red
    Write-Host "`n失败的测试:" -ForegroundColor Yellow
    $testResults | Where-Object { $_.Status -eq "失败" } | ForEach-Object {
        Write-Host "  - $($_.Name) (HTTP $($_.HttpCode))"
    }
}

Write-Host "`n=========================================="
