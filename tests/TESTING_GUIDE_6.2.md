# Agentrix Workbench 6.2 测试执行指南

## ⚠️ 重要说明
由于 WSL 环境的 localhost 代理配置问题，需要在 **WSL Ubuntu 终端内** 手动执行测试步骤。

---

## 快速开始

### 方式一：全自动测试（推荐）

在 **WSL Ubuntu-24.04 终端** 中执行：

```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website
bash tests/run-full-test.sh
```

此脚本将自动完成：
1. 停止旧服务
2. 构建并启动后端
3. 运行五类画像验证
4. 启动前端
5. 运行 E2E 测试

---

### 方式二：分步手动测试

#### 终端 1: 启动后端

```bash
# 打开 WSL Ubuntu-24.04 终端
wsl -d Ubuntu-24.04

# 进入后端目录
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend

# 停止旧进程（如有）
pkill -f "ts-node.*main" || pkill -f "node.*dist/main"

# 构建后端
npm run build

# 启动后端服务
npm run start:dev
```

**预期输出**:
```
[Nest] 12345  - 2026/01/18 14:00:00     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 2026/01/18 14:00:00     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - 2026/01/18 14:00:00     LOG [InstanceLoader] ExpertProfileModule dependencies initialized
[Nest] 12345  - 2026/01/18 14:00:00     LOG [InstanceLoader] DatasetModule dependencies initialized
[Nest] 12345  - 2026/01/18 14:00:01     LOG [NestApplication] Nest application successfully started
```

保持此终端运行！

#### 终端 2: 验证后端路由

```bash
# 打开新的 WSL 终端
wsl -d Ubuntu-24.04

# 进入项目根目录
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

# 测试健康端点
curl http://localhost:3001/api/health

# 运行完整验证
bash tests/verify-persona-flows.sh
```

**期望结果**:
```
=== Agentrix 五类画像用户流程验证 ===

=== 画像 1: 个人用户 ===
Testing: 健康检查 ... ✓ PASSED (HTTP 200)
Testing: 获取用户账户 ... ✓ PASSED (HTTP 401)
Testing: 获取Agent列表 ... ✓ PASSED (HTTP 401)

=== 画像 4: 行业专家 ===
Testing: 获取专家档案 ... ✓ PASSED (HTTP 401)
Testing: 咨询列表(无授权) ... ✓ PASSED (HTTP 401)

=== 画像 5: 数据持有方 ===
Testing: 数据集列表(无授权) ... ✓ PASSED (HTTP 401)
Testing: 创建数据集(无授权) ... ✓ PASSED (HTTP 401)

======================================
总测试数: 19
通过: 19  ← 目标
失败: 0
======================================
✓ 所有测试通过！
```

#### 终端 3: 启动前端

```bash
# 打开新的 WSL 终端
wsl -d Ubuntu-24.04

# 进入前端目录
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend

# 启动前端开发服务器
npm run dev
```

**预期输出**:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

保持此终端运行！

#### 终端 4: 运行 E2E 测试

```bash
# 打开新的 WSL 终端（或在 Windows PowerShell）
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

# 运行 Playwright E2E 测试
npx playwright test tests/e2e/workbench-restructuring.spec.ts --reporter=html

# 查看报告
npx playwright show-report
```

---

## 验证清单

### ✅ 后端路由验证

| 端点 | 无Auth期望 | 验证命令 |
|:-----|:---------:|:---------|
| 健康检查 | 200 | `curl http://localhost:3001/api/health` |
| 专家档案 | 401 | `curl -I http://localhost:3001/api/expert-profiles/my` |
| 数据集列表 | 401 | `curl -I http://localhost:3001/api/datasets` |
| 统一账户 | 401 | `curl -I http://localhost:3001/api/accounts/my` |
| Agent账户 | 401 | `curl -I http://localhost:3001/api/agent-accounts` |
| KYC状态 | 401 | `curl -I http://localhost:3001/api/kyc/my` |

### ✅ 前端页面验证

访问以下URL，确认页面正常加载：

- http://localhost:3000 - 首页
- http://localhost:3000/workbench - 工作台主页
- http://localhost:3000/workbench?tab=unified-account - 统一账户
- http://localhost:3000/workbench?tab=agent-accounts - Agent账户
- http://localhost:3000/workbench?tab=kyc - KYC中心

### ✅ 组件渲染验证

在浏览器开发者工具中，确认以下组件无报错：

- `<UnifiedAccountPanel />`
- `<AgentAccountPanel />`
- `<KYCCenterPanel />`
- `<ExpertProfilePanel />` (P1 新增)
- `<DatasetPanel />` (P2 新增)

---

## 故障排除

### 问题 1: 端口被占用

**症状**: `Error: listen EADDRINUSE: address already in use :::3001`

**解决**:
```bash
# 查找占用进程
lsof -i :3001
# 或
netstat -tlnp | grep 3001

# 杀死进程
kill -9 <PID>
```

### 问题 2: 路由返回 404

**症状**: 验证脚本显示 404 而非 401

**原因**: 
1. 模块未正确注册到 `app.module.ts`
2. 服务未完全重启

**解决**:
```bash
# 检查模块导入
grep -n "ExpertProfileModule\|DatasetModule" backend/src/app.module.ts

# 强制重新构建
cd backend
rm -rf dist
npm run build

# 重启服务
pkill -9 -f "ts-node"
npm run start:dev
```

### 问题 3: 数据库连接失败

**症状**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**解决**:
```bash
# 检查 PostgreSQL 状态
sudo service postgresql status

# 启动 PostgreSQL
sudo service postgresql start

# 测试连接
psql -U agentrix -h localhost -d paymind -c '\l'
```

### 问题 4: TypeScript 编译错误

**症状**: `Error: Cannot find module ...`

**解决**:
```bash
# 重新安装依赖
cd backend
rm -rf node_modules package-lock.json
npm install

# 或在前端
cd frontend
rm -rf node_modules .next
npm install
```

---

## 成功指标

所有以下条件满足即表示 6.2 测试通过：

- [ ] 后端服务启动成功，健康检查返回 200
- [ ] 五类画像验证: **19/19 通过**
- [ ] 前端服务启动成功，页面无 console 错误
- [ ] E2E 测试: **全部通过** 或 **80%+ 通过率**
- [ ] 新增路由正确返回 401（需认证）

---

## 下一步

测试通过后：

1. **更新测试报告**: `tests/reports/WORKBENCH_RESTRUCTURING_TEST_REPORT.md`
2. **提交代码**: Git commit 新增的 P1/P2 组件和后端模块
3. **部署准备**: 检查生产环境配置

---

**文档创建时间**: 2026-01-18  
**WSL 环境**: Ubuntu-24.04  
**项目路径**: `/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website`
