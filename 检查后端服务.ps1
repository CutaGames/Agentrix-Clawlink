# PayMind 后端服务诊断脚本

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔍 PayMind 后端服务诊断" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查端口占用
Write-Host "[1/5] 检查端口占用..." -ForegroundColor Yellow
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "✅ 端口 3001 已被占用" -ForegroundColor Green
    Write-Host "   进程ID: $($port3001.OwningProcess)" -ForegroundColor Gray
    $process = Get-Process -Id $port3001.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   进程名: $($process.ProcessName)" -ForegroundColor Gray
        Write-Host "   命令行: $($process.Path)" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ 端口 3001 未被占用 - 后端服务未运行" -ForegroundColor Red
}
Write-Host ""

# 2. 检查Node.js进程
Write-Host "[2/5] 检查Node.js进程..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "✅ 找到 $($nodeProcesses.Count) 个Node.js进程" -ForegroundColor Green
    foreach ($proc in $nodeProcesses) {
        Write-Host "   PID: $($proc.Id) | 内存: $([math]::Round($proc.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ 未找到Node.js进程" -ForegroundColor Red
}
Write-Host ""

# 3. 检查后端日志
Write-Host "[3/5] 检查后端日志..." -ForegroundColor Yellow
$logFiles = @(
    "logs\backend.log",
    "backend\logs\app.log",
    "backend.log"
)

$foundLog = $false
foreach ($logFile in $logFiles) {
    if (Test-Path $logFile) {
        Write-Host "✅ 找到日志文件: $logFile" -ForegroundColor Green
        Write-Host "   最后50行:" -ForegroundColor Gray
        Get-Content $logFile -Tail 50 | ForEach-Object {
            Write-Host "   $_" -ForegroundColor Gray
        }
        $foundLog = $true
        break
    }
}

if (-not $foundLog) {
    Write-Host "⚠️  未找到日志文件" -ForegroundColor Yellow
}
Write-Host ""

# 4. 测试API连接
Write-Host "[4/5] 测试API连接..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ API健康检查成功" -ForegroundColor Green
    Write-Host "   状态码: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "   响应: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ API连接失败" -ForegroundColor Red
    Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

# 5. 检查环境变量
Write-Host "[5/5] 检查环境配置..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    Write-Host "✅ 找到 .env 文件" -ForegroundColor Green
    $envContent = Get-Content "backend\.env" | Where-Object { $_ -notmatch "^#" -and $_ -match "=" }
    foreach ($line in $envContent) {
        $key = ($line -split "=")[0]
        if ($key -match "PASSWORD|SECRET|KEY") {
            Write-Host "   $key = ***" -ForegroundColor Gray
        } else {
            Write-Host "   $line" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "❌ 未找到 .env 文件" -ForegroundColor Red
    Write-Host "   请从 .env.example 复制并配置" -ForegroundColor Yellow
}
Write-Host ""

# 总结
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📋 诊断总结" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($port3001) {
    Write-Host "✅ 后端服务似乎正在运行" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 如果无法访问，请尝试:" -ForegroundColor Yellow
    Write-Host "   1. 检查防火墙设置" -ForegroundColor Gray
    Write-Host "   2. 查看后端日志: Get-Content logs\backend.log -Tail 50" -ForegroundColor Gray
    Write-Host "   3. 重启服务: cd backend && npm run start:dev" -ForegroundColor Gray
} else {
    Write-Host "❌ 后端服务未运行" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 启动服务:" -ForegroundColor Yellow
    Write-Host "   cd backend" -ForegroundColor Gray
    Write-Host "   npm run start:dev" -ForegroundColor Gray
}

Write-Host ""

