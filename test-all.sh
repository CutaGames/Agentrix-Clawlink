#!/bin/bash

# Agentrix 一键自动化测试脚本
# 测试所有功能：网页、API、SDK、交付物

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试结果目录
REPORT_DIR="tests/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FINAL_REPORT="${REPORT_DIR}/test-report-${TIMESTAMP}.html"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Agentrix 自动化测试套件${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 创建报告目录
mkdir -p "${REPORT_DIR}"/{e2e-html,api-html,sdk-html,screenshots}

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 函数：运行测试并收集结果
run_test() {
  local test_name=$1
  local test_command=$2
  
  echo -e "${YELLOW}运行测试: ${test_name}${NC}"
  
  if eval "$test_command"; then
    echo -e "${GREEN}✅ ${test_name} 通过${NC}"
    ((PASSED_TESTS++))
  else
    echo -e "${RED}❌ ${test_name} 失败${NC}"
    ((FAILED_TESTS++))
  fi
  ((TOTAL_TESTS++))
  echo ""
}

# 1. 检查依赖
echo -e "${BLUE}步骤 1: 检查依赖...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}错误: Node.js 未安装${NC}"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}错误: npm 未安装${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 依赖检查通过${NC}"
echo ""

# 2. 安装测试依赖
echo -e "${BLUE}步骤 2: 安装测试依赖...${NC}"
if [ ! -d "node_modules" ]; then
  npm install --silent
fi
if [ ! -d "agentrixfrontend/node_modules" ]; then
  cd agentrixfrontend && npm install --silent && cd ..
fi
if [ ! -d "sdk-js/node_modules" ]; then
  cd sdk-js && npm install --silent && cd ..
fi
# 安装Playwright浏览器
npx playwright install --with-deps chromium || true
echo -e "${GREEN}✅ 依赖安装完成${NC}"
echo ""

# 3. 启动后端服务（如果未运行）
echo -e "${BLUE}步骤 3: 检查后端服务...${NC}"
if ! curl -s http://localhost:3001/api/health > /dev/null; then
  echo -e "${YELLOW}⚠️  后端服务未运行，请先启动后端服务${NC}"
  echo -e "${YELLOW}   运行: cd backend && npm run start:dev${NC}"
  read -p "按回车键继续（假设后端已启动）..."
fi
echo ""

# 4. E2E测试
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}步骤 4: 运行 E2E 测试${NC}"
echo -e "${BLUE}========================================${NC}"

run_test "E2E测试 - 认证流程" "npx playwright test tests/e2e/auth.spec.ts --reporter=html,json"
run_test "E2E测试 - 支付流程" "npx playwright test tests/e2e/payment.spec.ts --reporter=html,json"
run_test "E2E测试 - 新功能页面" "npx playwright test tests/e2e/new-features.spec.ts --reporter=html,json"

# 5. API测试
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}步骤 5: 运行 API 测试${NC}"
echo -e "${BLUE}========================================${NC}"

run_test "API测试 - 支付API" "cd tests/api && npx jest payment.api.test.ts --config=jest.config.js"

# 6. SDK测试
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}步骤 6: 运行 SDK 测试${NC}"
echo -e "${BLUE}========================================${NC}"

run_test "SDK测试 - JavaScript SDK" "cd tests/sdk && npx jest js-sdk.test.ts"

# 7. 交付物测试
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}步骤 7: 检查交付物${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查文档
if [ -f "README.md" ]; then
  echo -e "${GREEN}✅ README.md 存在${NC}"
else
  echo -e "${RED}❌ README.md 不存在${NC}"
  ((FAILED_TESTS++))
fi

# 检查SDK构建
if [ -d "sdk-js/dist" ]; then
  echo -e "${GREEN}✅ JavaScript SDK 已构建${NC}"
else
  echo -e "${YELLOW}⚠️  JavaScript SDK 未构建${NC}"
fi

# 检查示例代码
if [ -d "sdk-js/examples" ]; then
  echo -e "${GREEN}✅ SDK示例代码存在${NC}"
else
  echo -e "${RED}❌ SDK示例代码不存在${NC}"
  ((FAILED_TESTS++))
fi

echo ""

# 8. 生成统一测试报告
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}步骤 8: 生成测试报告${NC}"
echo -e "${BLUE}========================================${NC}"

cat > "${FINAL_REPORT}" << EOF
<!DOCTYPE html>
<html>
<head>
  <title>Agentrix 测试报告 - ${TIMESTAMP}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; border-radius: 5px; }
    .summary { margin: 20px 0; }
    .test-item { padding: 10px; margin: 5px 0; border-left: 4px solid #4CAF50; background: #f9f9f9; }
    .failed { border-left-color: #f44336; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-box { padding: 15px; background: #f0f0f0; border-radius: 5px; }
    .links { margin: 20px 0; }
    .links a { display: block; margin: 5px 0; color: #2196F3; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Agentrix 自动化测试报告</h1>
    <p>生成时间: $(date)</p>
  </div>
  
  <div class="summary">
    <h2>测试概览</h2>
    <div class="stats">
      <div class="stat-box">
        <strong>总测试数:</strong> ${TOTAL_TESTS}
      </div>
      <div class="stat-box" style="background: #c8e6c9;">
        <strong>通过:</strong> ${PASSED_TESTS}
      </div>
      <div class="stat-box" style="background: #ffcdd2;">
        <strong>失败:</strong> ${FAILED_TESTS}
      </div>
      <div class="stat-box">
        <strong>通过率:</strong> $(( PASSED_TESTS * 100 / TOTAL_TESTS ))% 
      </div>
    </div>
  </div>
  
  <div class="links">
    <h2>详细报告链接</h2>
    <a href="e2e-html/index.html">E2E测试报告 (Playwright)</a>
    <a href="api-html/report.html">API测试报告 (Jest)</a>
    <a href="sdk-html/report.html">SDK测试报告 (Jest)</a>
  </div>
  
  <div class="summary">
    <h2>测试结果</h2>
    <div class="test-item">
      <strong>E2E测试:</strong> $([ ${FAILED_TESTS} -eq 0 ] && echo "✅ 通过" || echo "❌ 部分失败")
    </div>
    <div class="test-item">
      <strong>API测试:</strong> $([ ${FAILED_TESTS} -eq 0 ] && echo "✅ 通过" || echo "❌ 部分失败")
    </div>
    <div class="test-item">
      <strong>SDK测试:</strong> $([ ${FAILED_TESTS} -eq 0 ] && echo "✅ 通过" || echo "❌ 部分失败")
    </div>
  </div>
</body>
</html>
EOF

echo -e "${GREEN}✅ 测试报告已生成: ${FINAL_REPORT}${NC}"
echo ""

# 9. 测试总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}测试总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "总测试数: ${TOTAL_TESTS}"
echo -e "${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "${RED}失败: ${FAILED_TESTS}${NC}"
echo -e "通过率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo ""
echo -e "${BLUE}测试报告位置:${NC}"
echo -e "  - 统一报告: ${FINAL_REPORT}"
echo -e "  - E2E报告: ${REPORT_DIR}/e2e-html/index.html"
echo -e "  - API报告: ${REPORT_DIR}/api-html/report.html"
echo ""

if [ ${FAILED_TESTS} -eq 0 ]; then
  echo -e "${GREEN}🎉 所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}⚠️  有测试失败，请查看详细报告${NC}"
  exit 1
fi

