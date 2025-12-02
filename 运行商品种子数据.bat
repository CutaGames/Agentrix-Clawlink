@echo off
chcp 65001 >nul
echo ==========================================
echo 🌱 导入PayMind Agent V3.0商品种子数据
echo ==========================================
echo.

cd backend

echo 正在导入商品数据...
echo 这将添加不同场景和品类的模拟商品，用于体验V3.0功能
echo.

call npm run seed:products

echo.
echo ✅ 商品数据导入完成！
echo.
echo 📊 现在可以体验以下功能：
echo    • 商品搜索和比价
echo    • 情景感知推荐
echo    • 自动下单
echo    • 服务类商品
echo    • 链上资产
echo.
pause

