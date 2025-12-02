# PayMind 项目依赖安装脚本 (Windows PowerShell)
# 自动安装 Node.js 和项目依赖

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 PayMind 项目依赖安装脚本 (Windows)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Host "⚠️  检测到管理员权限，某些操作可能需要管理员权限" -ForegroundColor Yellow
}

# 保存当前目录
$ROOT_DIR = $PWD

# 1. 检查并安装 Node.js
Write-Host "[1/5] 检查 Node.js..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node -v
    Write-Host "✅ Node.js 已安装: $nodeVersion" -ForegroundColor Green
    
    # 检查版本
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 18) {
        Write-Host "⚠️  Node.js 版本过低 ($nodeVersion)，需要 v18+" -ForegroundColor Yellow
        Write-Host "   请访问 https://nodejs.org/ 下载最新版本" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Node.js 未安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "请按以下步骤安装 Node.js:" -ForegroundColor Yellow
    Write-Host "1. 访问 https://nodejs.org/" -ForegroundColor White
    Write-Host "2. 下载 Windows 版本（推荐 LTS）" -ForegroundColor White
    Write-Host "3. 安装时选择 'Add to PATH'" -ForegroundColor White
    Write-Host "4. 安装完成后重启终端并重新运行此脚本" -ForegroundColor White
    Write-Host ""
    $install = Read-Host "是否要打开 Node.js 下载页面? (y/n)"
    if ($install -eq 'y' -or $install -eq 'Y') {
        Start-Process "https://nodejs.org/"
    }
    exit 1
}

# 检查 npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "✅ npm 已安装: $(npm -v)" -ForegroundColor Green
} else {
    Write-Host "❌ npm 未安装，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. 安装全局工具
Write-Host "[2/5] 安装全局工具..." -ForegroundColor Yellow
if (-not (Get-Command http-server -ErrorAction SilentlyContinue)) {
    Write-Host "正在安装 http-server..." -ForegroundColor Blue
    npm install -g http-server
    Write-Host "✅ http-server 安装完成" -ForegroundColor Green
} else {
    Write-Host "✅ http-server 已安装" -ForegroundColor Green
}

Write-Host ""

# 3. 安装项目依赖
Write-Host "[3/5] 安装项目依赖..." -ForegroundColor Yellow
Write-Host ""

# 根目录依赖
if (Test-Path "package.json") {
    Write-Host "安装根目录依赖..." -ForegroundColor Blue
    npm install
    Write-Host "✅ 根目录依赖安装完成" -ForegroundColor Green
}

# 后端依赖
if (Test-Path "backend") {
    Write-Host "安装后端依赖..." -ForegroundColor Blue
    Set-Location backend
    npm install
    Set-Location $ROOT_DIR
    Write-Host "✅ 后端依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "❌ backend 目录不存在" -ForegroundColor Red
}

# 前端依赖
if (Test-Path "paymindfrontend") {
    Write-Host "安装前端依赖..." -ForegroundColor Blue
    Set-Location paymindfrontend
    npm install
    Set-Location $ROOT_DIR
    Write-Host "✅ 前端依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "❌ paymindfrontend 目录不存在" -ForegroundColor Red
}

# SDK依赖
if (Test-Path "sdk-js") {
    Write-Host "安装 SDK 依赖..." -ForegroundColor Blue
    Set-Location sdk-js
    npm install
    Set-Location $ROOT_DIR
    Write-Host "✅ SDK 依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "⚠️  sdk-js 目录不存在（可选）" -ForegroundColor Yellow
}

Write-Host ""

# 4. 配置环境变量
Write-Host "[4/5] 配置环境变量..." -ForegroundColor Yellow

# 后端环境变量
if (Test-Path "backend" -and -not (Test-Path "backend\.env")) {
    if (Test-Path "backend\.env.example") {
        Write-Host "创建后端环境变量文件..." -ForegroundColor Blue
        Copy-Item "backend\.env.example" "backend\.env"
        
        # 生成JWT密钥（使用PowerShell）
        $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
        $jwtSecret = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($jwtSecret))
        
        # 更新.env文件
        $envContent = Get-Content "backend\.env" -Raw
        if ($envContent -match "JWT_SECRET=") {
            $envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$jwtSecret"
        } else {
            $envContent += "`nJWT_SECRET=$jwtSecret"
        }
        Set-Content "backend\.env" $envContent
        
        Write-Host "✅ 后端环境变量文件已创建" -ForegroundColor Green
        Write-Host "   文件位置: backend\.env" -ForegroundColor Blue
        Write-Host "   ⚠️  请检查并更新配置" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  backend\.env.example 不存在，跳过" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ 后端环境变量文件已存在" -ForegroundColor Green
}

# 前端环境变量
if (Test-Path "paymindfrontend" -and -not (Test-Path "paymindfrontend\.env.local")) {
    if (Test-Path "paymindfrontend\.env.local.example") {
        Write-Host "创建前端环境变量文件..." -ForegroundColor Blue
        Copy-Item "paymindfrontend\.env.local.example" "paymindfrontend\.env.local"
        Write-Host "✅ 前端环境变量文件已创建" -ForegroundColor Green
    } else {
        Write-Host "⚠️  paymindfrontend\.env.local.example 不存在，跳过" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ 前端环境变量文件已存在" -ForegroundColor Green
}

Write-Host ""

# 5. PostgreSQL 提示
Write-Host "[5/5] 数据库配置..." -ForegroundColor Yellow
Write-Host "⚠️  PostgreSQL 需要单独安装" -ForegroundColor Yellow
Write-Host ""
Write-Host "Windows 安装 PostgreSQL:" -ForegroundColor Blue
Write-Host "1. 访问 https://www.postgresql.org/download/windows/" -ForegroundColor White
Write-Host "2. 下载并安装 PostgreSQL" -ForegroundColor White
Write-Host "3. 安装时记住设置的密码" -ForegroundColor White
Write-Host "4. 创建数据库和用户后更新 backend\.env" -ForegroundColor White
Write-Host ""
Write-Host "或者使用 Docker:" -ForegroundColor Blue
Write-Host "docker run --name paymind-postgres -e POSTGRES_PASSWORD=paymind123 -e POSTGRES_USER=paymind -e POSTGRES_DB=paymind -p 5432:5432 -d postgres" -ForegroundColor White

Write-Host ""

# 完成
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ 安装完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 安装总结:" -ForegroundColor Blue
Write-Host "  ✅ Node.js: $(node -v)"
Write-Host "  ✅ npm: $(npm -v)"
Write-Host ""
Write-Host "📝 下一步:" -ForegroundColor Yellow
Write-Host "  1. 安装 PostgreSQL（如果还没有）" -ForegroundColor White
Write-Host "  2. 检查环境变量配置: backend\.env 和 paymindfrontend\.env.local" -ForegroundColor White
Write-Host "  3. 运行数据库迁移: cd backend; npm run migration:run" -ForegroundColor White
Write-Host "  4. 启动服务: .\启动服务-简单版.bat" -ForegroundColor White
Write-Host ""

