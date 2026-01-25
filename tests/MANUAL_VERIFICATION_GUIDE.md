# 五类画像路由验证与E2E测试指南

## 当前状态 (2026-01-18)

### ✅ 已完成
1. **后端模块创建**:
   - `backend/src/modules/expert-profile/` (3 files: module, controller, service)
   - `backend/src/modules/dataset/` (3 files: module, controller, service)
   - 已注册到 `app.module.ts`

2. **前端组件完成**:
   - P1: ExpertProfilePanel (298行), WorkspacePanel (334行), SLAProgressCircle (107行)
   - P2: DatasetPanel (385行), VectorizationMonitor (185行), PrivacyFunnelSlider (218行)
   - API客户端: expert-profile.api.ts, dataset.api.ts

3. **编译验证**:
   - 后端: `npm run build` ✅ 成功
   - 前端: `npm run build` ✅ 成功

### ⏳ 待验证
服务启动与API路由测试需要在WSL环境下手动执行。

---

## 手动验证步骤

### Step 1: 启动后端服务

```bash
# 在 WSL Ubuntu-24.04 中执行
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend

# 方法 A: 开发模式（推荐）
npm run start:dev

# 方法 B: 生产模式
npm run start:prod

# 检查服务状态
curl http://localhost:3001/api/health
```

**预期输出**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-18T..."
}
```

### Step 2: 验证新API路由

```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

# 运行五类画像验证脚本
bash tests/verify-persona-flows.sh
```

**新增路由检查清单**:
| 端点 | 无Auth期望状态 | 说明 |
|:-----|:-------------:|:-----|
| `GET /api/expert-profiles/my` | 401 | 专家档案（需认证） |
| `GET /api/datasets` | 401 | 数据集列表（需认证） |
| `POST /api/datasets` | 401 | 创建数据集（需认证） |
| `GET /api/accounts/my` | 401 | 统一账户（需认证） |
| `GET /api/agent-accounts` | 401 | Agent账户列表（需认证） |
| `GET /api/kyc/my` | 401 | KYC状态（需认证） |
| `GET /api/kyc/level-benefits` | 200 | KYC等级权益（公开） |

### Step 3: 启动前端服务

```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend

# 开发模式
npm run dev
```

访问: `http://localhost:3000/workbench`

### Step 4: 执行E2E测试

```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

# 确保服务运行：
# - 前端: http://localhost:3000
# - 后端: http://localhost:3001

# 运行Playwright E2E测试
npx playwright test tests/e2e/workbench-restructuring.spec.ts --project=chromium

# 查看报告
npx playwright show-report tests/reports/e2e-html
```

---

## 预期结果

### 画像验证脚本期望结果

```bash
=== 画像 4: 行业专家 (Expert) ===
Testing: 获取专家档案 ... ✓ PASSED (HTTP 401)  # 修正：由404改为401
Testing: 咨询列表(无授权) ... ✓ PASSED (HTTP 401)

=== 画像 5: 数据持有方 (Data Provider) ===
Testing: 数据集列表(无授权) ... ✓ PASSED (HTTP 401)
Testing: 创建数据集(无授权) ... ✓ PASSED (HTTP 401)

总测试数: 19
通过: 19  # 目标：全部通过
失败: 0
```

### E2E测试覆盖

- [x] **导航系统**: L1/L2联动、模式切换
- [x] **统一账户**: 余额显示、交易历史
- [x] **Agent账户**: 列表、创建、限额设置
- [x] **KYC认证**: 状态、升级流程
- [x] **开发者账户**: API Key管理
- [x] **引导流程**: 画像选择、步骤导航

---

## 故障排除

### 问题 1: 路由返回 404 而非 401

**原因**: 模块未正确注册或服务未重启

**解决方案**:
```bash
# 1. 验证模块已导入
grep -n "ExpertProfileModule\|DatasetModule" backend/src/app.module.ts

# 2. 重新构建
cd backend && npm run build

# 3. 强制重启
pkill -f "node.*dist/main"
pkill -f "ts-node"
npm run start:dev
```

### 问题 2: 编译错误

**检查 TypeScript 类型**:
```bash
cd frontend
npx tsc --noEmit
```

### 问题 3: E2E测试超时

**检查服务健康**:
```bash
curl http://localhost:3000  # 前端
curl http://localhost:3001/api/health  # 后端
```

---

## 文件清单

### 新建后端文件 (6个)
- `backend/src/modules/expert-profile/expert-profile.module.ts`
- `backend/src/modules/expert-profile/expert-profile.controller.ts` (175行)
- `backend/src/modules/expert-profile/expert-profile.service.ts` (156行)
- `backend/src/modules/dataset/dataset.module.ts`
- `backend/src/modules/dataset/dataset.controller.ts` (166行)
- `backend/src/modules/dataset/dataset.service.ts` (208行)

### 修改文件 (1个)
- `backend/src/app.module.ts` (+4行: imports and modules)

### 新建前端文件 (8个)
- `frontend/components/expert/ExpertProfilePanel.tsx` (298行)
- `frontend/components/expert/SLAProgressCircle.tsx` (107行)
- `frontend/lib/api/expert-profile.api.ts` (206行)
- `frontend/components/workspace/WorkspacePanel.tsx` (334行)
- `frontend/components/dataset/DatasetPanel.tsx` (385行)
- `frontend/components/dataset/VectorizationMonitor.tsx` (185行)
- `frontend/components/dataset/PrivacyFunnelSlider.tsx` (218行)
- `frontend/lib/api/dataset.api.ts` (183行)

---

## 下一步行动

1. **立即执行**: 在WSL环境中运行 `bash start-backend.sh` 和 `bash start-frontend.sh`
2. **验证路由**: 执行 `bash tests/verify-persona-flows.sh` 确保19/19通过
3. **E2E测试**: 执行 `npx playwright test` 验证UI交互
4. **更新报告**: 将测试结果更新到 `WORKBENCH_RESTRUCTURING_TEST_REPORT.md`

---

**文档创建时间**: 2026-01-18  
**下次验证**: 服务启动后立即执行
