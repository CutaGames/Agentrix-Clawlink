#!/bin/bash
# 在WSL中启动后端并运行测试

set -e

cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

echo "====================================="
echo " Agentrix Backend Start & Test"
echo "====================================="
echo ""

# 1. 清理旧进程
echo "[1/4] Cleaning up old processes..."
pkill -f "ts-node-dev.*src/main.ts" || true
sleep 2
echo "✓ Cleanup complete"
echo ""

# 2. 启动后端
echo "[2/4] Starting backend..."
cd backend
nohup npm run start:dev > ../backend-wsl.log 2>&1 &
BACKEND_PID=$!
echo "✓ Backend started with PID: $BACKEND_PID"
cd ..
echo ""

# 3. 等待后端就绪
echo "[3/4] Waiting for backend..."
for i in {1..40}; do
    sleep 1
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✓ Backend is ready!"
        break
    fi
    if [ $i -eq 40 ]; then
        echo "✗ Backend startup timeout"
        echo "Last 20 lines of log:"
        tail -20 backend-wsl.log
        exit 1
    fi
    echo -n "."
done
echo ""

# 4. 运行测试
echo "[4/4] Running route tests..."
echo "==========================================="

PASSED=0
FAILED=0

# Health check
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ "$STATUS" = "200" ]; then
    echo "[PASS] Health Check: $STATUS"
    ((PASSED++))
else
    echo "[FAIL] Health Check: $STATUS (expected 200)"
    ((FAILED++))
fi

# Expert Profile routes (expect 401)
EXPERT_ROUTES=(
    "/api/expert-profiles/my"
    "/api/expert-profiles/1"
    "/api/expert-profiles/1/consultations"
    "/api/expert-profiles/1/capability-cards"
)

for route in "${EXPERT_ROUTES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001$route")
    if [ "$STATUS" = "401" ]; then
        echo "[PASS] $route: $STATUS"
        ((PASSED++))
    else
        echo "[FAIL] $route: $STATUS (expected 401)"
        ((FAILED++))
    fi
done

# Dataset routes (expect 401)
DATASET_ROUTES=(
    "/api/datasets"
    "/api/datasets/1"
    "/api/datasets/1/vectorize/progress"
    "/api/datasets/1/privacy"
)

for route in "${DATASET_ROUTES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001$route")
    if [ "$STATUS" = "401" ]; then
        echo "[PASS] $route: $STATUS"
        ((PASSED++))
    else
        echo "[FAIL] $route: $STATUS (expected 401)"
        ((FAILED++))
    fi
done

echo "==========================================="
echo "Total: $((PASSED + FAILED)) | Passed: $PASSED | Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✓ All tests passed!"
    echo ""
    echo "Next steps:"
    echo "  1. Start frontend: cd frontend && npm run dev"
    echo "  2. Run E2E tests: npx playwright test"
    echo ""
    echo "Backend is running in background (PID: $BACKEND_PID)"
    echo "To stop: pkill -f 'ts-node-dev.*src/main.ts'"
    exit 0
else
    echo "✗ Some tests failed"
    exit 1
fi
