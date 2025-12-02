#!/bin/bash

# PayMind 完整服务启动脚本
# 启动前端、后端、SDK文档服务器

echo "🚀 启动 PayMind 所有服务..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Node.js，请先安装 Node.js (v18+)${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ 错误: Node.js 版本过低，需要 v18+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"

# 检查依赖
echo ""
echo "📦 检查依赖..."

if [ ! -d "backend/node_modules" ]; then
    echo "📥 安装后端依赖..."
    cd backend && npm install && cd ..
fi

if [ ! -d "paymindfrontend/node_modules" ]; then
    echo "📥 安装前端依赖..."
    cd paymindfrontend && npm install && cd ..
fi

# 检查环境变量
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  警告: backend/.env 不存在${NC}"
    echo "   运行: cd backend && cp .env.example .env"
fi

if [ ! -f "paymindfrontend/.env.local" ]; then
    echo -e "${YELLOW}⚠️  警告: paymindfrontend/.env.local 不存在${NC}"
    echo "   运行: cd paymindfrontend && cp .env.local.example .env.local"
fi

echo ""
echo "🎯 启动服务..."
echo ""

# 创建日志目录
mkdir -p logs

# 启动后端
echo -e "${GREEN}🔧 启动后端服务 (http://localhost:3001)...${NC}"
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "后端 PID: $BACKEND_PID"

# 等待后端启动
echo "等待后端启动..."
sleep 8

# 启动前端
echo -e "${GREEN}🎨 启动前端服务 (http://localhost:3000)...${NC}"
cd paymindfrontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "前端 PID: $FRONTEND_PID"

# 检查是否有 http-server (用于SDK文档)
SDK_SERVER_PID=""
if command -v http-server &> /dev/null || command -v npx &> /dev/null; then
    echo -e "${GREEN}📚 启动SDK文档服务器 (http://localhost:8080)...${NC}"
    cd sdk-js/docs
    if command -v http-server &> /dev/null; then
        http-server -p 8080 > ../../../logs/sdk-docs.log 2>&1 &
    else
        npx http-server -p 8080 > ../../../logs/sdk-docs.log 2>&1 &
    fi
    SDK_SERVER_PID=$!
    cd ../../..
    echo "SDK文档服务器 PID: $SDK_SERVER_PID"
else
    echo -e "${YELLOW}⚠️  http-server 未安装，SDK文档服务器未启动${NC}"
    echo "   安装: npm install -g http-server"
    echo "   或使用Python: cd sdk-js/docs && python -m http.server 8080"
fi

# 保存PID到文件
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid
[ ! -z "$SDK_SERVER_PID" ] && echo $SDK_SERVER_PID > .sdk-docs.pid

echo ""
echo -e "${GREEN}✅ 所有服务已启动！${NC}"
echo ""
echo "📊 访问地址:"
echo "   🌐 前端应用:    http://localhost:3000"
echo "   🔧 后端API:     http://localhost:3001/api"
echo "   📖 API文档:     http://localhost:3001/api/docs"
echo "   📚 SDK文档:     http://localhost:8080"
echo ""
echo "📋 查看日志:"
echo "   后端: tail -f logs/backend.log"
echo "   前端: tail -f logs/frontend.log"
echo "   SDK:  tail -f logs/sdk-docs.log"
echo ""
echo -e "${YELLOW}🛑 停止服务: ./stop-all-services.sh 或按 Ctrl+C${NC}"
echo ""

# 创建停止脚本
cat > stop-all-services.sh << 'EOF'
#!/bin/bash
echo "🛑 正在停止所有服务..."

if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo "✅ 后端服务已停止 (PID: $BACKEND_PID)"
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo "✅ 前端服务已停止 (PID: $FRONTEND_PID)"
    rm .frontend.pid
fi

if [ -f .sdk-docs.pid ]; then
    SDK_PID=$(cat .sdk-docs.pid)
    kill $SDK_PID 2>/dev/null && echo "✅ SDK文档服务器已停止 (PID: $SDK_PID)"
    rm .sdk-docs.pid
fi

echo "✅ 所有服务已停止"
EOF

chmod +x stop-all-services.sh

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; \
      [ -f .backend.pid ] && kill \$(cat .backend.pid) 2>/dev/null; \
      [ -f .frontend.pid ] && kill \$(cat .frontend.pid) 2>/dev/null; \
      [ -f .sdk-docs.pid ] && kill \$(cat .sdk-docs.pid) 2>/dev/null; \
      rm -f .backend.pid .frontend.pid .sdk-docs.pid; \
      echo '✅ 所有服务已停止'; exit" INT TERM

wait

