#!/bin/bash
# Agentrix All-in-One Startup Script

# Kill existing processes on ports 3000, 3001, 3002
echo "🧹 Cleaning up existing processes..."
fuser -k 3000/tcp 2>/dev/null
fuser -k 3001/tcp 2>/dev/null
fuser -k 3002/tcp 2>/dev/null

# Get the script directory
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting Backend (Port 3001)..."
cd "$ROOT_DIR/backend"
npm run start:dev > "$ROOT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!

echo "🚀 Starting Frontend (Port 3000)..."
cd "$ROOT_DIR/frontend"
npm run dev > "$ROOT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo "📚 Generating SDK Docs..."
cd "$ROOT_DIR/sdk-js"
npm run docs:generate > /dev/null 2>&1
echo "🚀 Serving SDK Docs (Port 3002)..."
npx serve docs -p 3002 > "$ROOT_DIR/logs/sdk-docs.log" 2>&1 &
SDK_PID=$!

echo "✅ All services started!"
echo "   - Backend:  http://localhost:3001"
echo "   - Frontend: http://localhost:3000"
echo "   - SDK Docs: http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all services."

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID $SDK_PID; exit" INT TERM
wait
