# Agentrix Feature Test Script
$base = "http://localhost:3001"
$pass = 0
$fail = 0

function Test-Endpoint($name, $url, $expect = 200) {
    Write-Host "`n[$name]" -ForegroundColor Yellow
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq $expect) {
            Write-Host "  PASS (HTTP $($r.StatusCode))" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  FAIL (expected $expect, got $($r.StatusCode))" -ForegroundColor Red
            $script:fail++
        }
    }
    catch {
        $s = $_.Exception.Response.StatusCode.value__
        if ($s -eq $expect) {
            Write-Host "  PASS (HTTP $s)" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  FAIL (HTTP $s)" -ForegroundColor Red
            $script:fail++
        }
    }
}

Write-Host "`n========== Agentrix Feature Tests ==========" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "[P0.1 Payment System]" -ForegroundColor Magenta
Test-Endpoint "Health Check" "$base/api/health"

Write-Host "`n[P0.2 Cross-Protocol Registration]" -ForegroundColor Magenta
Test-Endpoint "X402 Discovery" "$base/.well-known/x402"
Test-Endpoint "UCP Products" "$base/ucp/v1/products"
Test-Endpoint "UCP Skills" "$base/ucp/v1/skills"
Test-Endpoint "OAuth Discovery" "$base/.well-known/oauth-authorization-server"
Test-Endpoint "OpenID Config" "$base/.well-known/openid-configuration"

Write-Host "`n[P0.3 Developer Revenue - Auth Required]" -ForegroundColor Magenta
Test-Endpoint "Developer Dashboard" "$base/api/developer/dashboard" 401
Test-Endpoint "Revenue Summary" "$base/api/developer/revenue/summary" 401

Write-Host "`n[MCP Integration]" -ForegroundColor Magenta
Test-Endpoint "MCP OpenAPI" "$base/api/mcp/openapi.json"

Write-Host "`n[Marketplace]" -ForegroundColor Magenta
Test-Endpoint "Search API" "$base/api/marketplace/search"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Total: $($pass + $fail)"
Write-Host "Passed: $pass" -ForegroundColor Green
Write-Host "Failed: $fail" -ForegroundColor Red

if ($fail -eq 0) {
    Write-Host "`nALL TESTS PASSED`n" -ForegroundColor Green
} else {
    Write-Host "`nSOME TESTS FAILED`n" -ForegroundColor Red
}
