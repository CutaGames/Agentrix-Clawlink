@echo off
chcp 65001 >nul
echo ==========================================
echo 🔧 修复数据库迁移问题
echo ==========================================
echo.

echo 此脚本将：
echo 1. 检查迁移状态
echo 2. 修复迁移记录
echo 3. 运行V3.0新迁移
echo.

cd backend

echo [1/3] 检查迁移状态...
call npm run migration:check
echo.

echo [2/3] 修复迁移记录...
call npm run migration:fix
echo.

echo [3/3] 运行V3.0新迁移...
call npm run migration:v3-only
echo.

echo ✅ 迁移修复完成！
echo.
echo 现在可以重新启动服务：
echo   启动所有服务-V3.bat
echo.
pause

