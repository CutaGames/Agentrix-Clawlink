# Agentrix Full Test Runner (PowerShell Native)
# 解决WSL localhost代理问题的完整测试脚本

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Agentrix Backend Test Runner      " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$BackendDir = "D:\wsl\Ubuntu-24.04\Code\Agentrix\Agentrix-website\backend"
$TestDir = "D:\wsl\Ubuntu-24.04\Code\Agentrix\Agentrix-website\tests"

# Step 1: Kill existing processes
Write-Host "[1/5] Cleaning up old processes..." -ForegroundColor Yellow
$processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*Agentrix*" }
if ($processes) {
    $processes | Stop-Process -Force
    Write-Host "✓ Killed $($processes.Count) existing processes" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "✓ No existing processes found" -ForegroundColor Green
}

# Step 2: Start backend in background
Write-Host "[2/5] Starting backend service..." -ForegroundColor Yellow
Set-Location $BackendDir

# Create a new PowerShell window to run backend
$job = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run start:dev 2>&1 | Out-File -FilePath "backend-powershell.log" -Encoding UTF8
} -ArgumentList $BackendDir

Write-Host "✓ Backend started (Job ID: $($job.Id))" -ForegroundColor Green

# Step 3: Wait for backend to be ready
Write-Host "[3/5] Waiting for backend to start..." -ForegroundColor Yellow
$maxWait = 60
$waited = 0
$ready = $false

while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
    Write-Host "." -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        # Still waiting
    }
}

Write-Host ""
if ($ready) {
    Write-Host "✓ Backend is ready!" -ForegroundColor Green
} else {
    Write-Host "✗ Backend failed to start within ${maxWait}s" -ForegroundColor Red
    Write-Host "Checking logs..." -ForegroundColor Yellow
    Get-Content "$BackendDir\backend-powershell.log" -Tail 30
    exit 1
}

# Step 4: Run API tests
Write-Host "[4/5] Running API route tests..." -ForegroundColor Yellow
Set-Location $TestDir

$testResults = @()

# Test health endpoint
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing
    $testResults += @{ Name = "Health Check"; Status = $response.StatusCode; Expected = 200 }
} catch {
    $testResults += @{ Name = "Health Check"; Status = $_.Exception.Response.StatusCode.value__; Expected = 200 }
}

# Test Expert Profile endpoints (should return 401 without auth)
$expertEndpoints = @(
    "/api/expert-profiles/my",
    "/api/expert-profiles/1",
    "/api/expert-profiles/1/consultations"
)

foreach ($endpoint in $expertEndpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001$endpoint" -UseBasicParsing
        $testResults += @{ Name = $endpoint; Status = $response.StatusCode; Expected = 401 }
    } catch {
        $status = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        $testResults += @{ Name = $endpoint; Status = $status; Expected = 401 }
    }
}

# Test Dataset endpoints (should return 401 without auth)
$datasetEndpoints = @(
    "/api/datasets",
    "/api/datasets/1",
    "/api/datasets/1/vectorize/progress"
)

foreach ($endpoint in $datasetEndpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001$endpoint" -UseBasicParsing
        $testResults += @{ Name = $endpoint; Status = $response.StatusCode; Expected = 401 }
    } catch {
        $status = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        $testResults += @{ Name = $endpoint; Status = $status; Expected = 401 }
    }
}

# Step 5: Display results
Write-Host ""
Write-Host "[5/5] Test Results:" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan

$passed = 0
$failed = 0

foreach ($test in $testResults) {
    $statusColor = if ($test.Status -eq $test.Expected) { "Green" } else { "Red" }
    $symbol = if ($test.Status -eq $test.Expected) { "[PASS]" } else { "[FAIL]" }
    
    Write-Host "$symbol $($test.Name): $($test.Status) (expected $($test.Expected))" -ForegroundColor $statusColor
    
    if ($test.Status -eq $test.Expected) {
        $passed++
    } else {
        $failed++
    }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Total: $($testResults.Count) | Passed: $passed | Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "✓ All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Start frontend: cd ..\frontend && npm run dev" -ForegroundColor White
    Write-Host "  2. Run E2E tests: npx playwright test" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "✗ Some tests failed. Check backend logs:" -ForegroundColor Red
    Write-Host "  $BackendDir\backend-powershell.log" -ForegroundColor White
}

Write-Host ""
Write-Host "Backend is still running. To stop:" -ForegroundColor Yellow
Write-Host "  Stop-Job -Id $($job.Id); Remove-Job -Id $($job.Id)" -ForegroundColor White
Write-Host "  Or: Get-Process -Name node | Where-Object { `$_.Path -like '*Agentrix*' } | Stop-Process" -ForegroundColor White
