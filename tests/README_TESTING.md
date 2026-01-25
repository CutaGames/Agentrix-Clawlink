# 测试执行快速指南

## 🚀 一键启动（推荐）

在 **WSL Ubuntu-24.04 终端** 中执行：

```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website
bash tests/run-full-test.sh
```

此命令将自动：
1. 停止旧服务 → 2. 构建后端 → 3. 启动后端 → 4. 验证路由（19 tests）
5. 启动前端 → 6. 运行 E2E 测试 → 7. 生成测试报告

---

## 📋 测试脚本说明

| 脚本 | 用途 | 执行环境 |
|:-----|:-----|:---------|
| `run-full-test.sh` | 全自动测试流程 | WSL Bash |
| `test-runner.ps1` | 半自动测试（需手动启动服务） | Windows PowerShell |
| `verify-persona-flows.sh` | 仅验证后端路由 | WSL Bash |

---

## 🎯 预期结果

### 五类画像验证 (19 tests)
```
=== 画像 1: 个人用户 ===        3/3 passed
=== 画像 2: API 提供商 ===      3/3 passed
=== 画像 3: 实物/服务商 ===     3/3 passed
=== 画像 4: 行业专家 ===        2/2 passed  ← 新增路由
=== 画像 5: 数据持有方 ===      2/2 passed  ← 新增路由
=== 核心账户系统 ===            4/4 passed
=== 导航与权限 ===              2/2 passed

总通过: 19/19 ✓
```

### E2E 测试
- 导航系统: 4 passed
- 统一账户: 3 passed
- Agent账户: 3 passed
- KYC认证: 3 passed
- 开发者账户: 3 passed
- 引导流程: 3 passed

**总计**: 19 passed

---

## 📖 详细文档

- **完整指南**: `tests/TESTING_GUIDE_6.2.md`
- **手动验证**: `tests/MANUAL_VERIFICATION_GUIDE.md`
- **测试报告**: `tests/reports/WORKBENCH_RESTRUCTURING_TEST_REPORT.md`

---

## ⚡ 快速命令

```bash
# 仅启动后端
cd backend && npm run start:dev

# 仅启动前端
cd frontend && npm run dev

# 仅验证路由
bash tests/verify-persona-flows.sh

# 仅运行E2E
npx playwright test tests/e2e/workbench-restructuring.spec.ts
```

---

**提示**: 如果遇到 WSL 代理问题，请在纯 WSL 终端（`wsl -d Ubuntu-24.04`）内执行测试。
