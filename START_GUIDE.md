# Agentrix 服务启动与测试指南

## ⚠️ 当前状态
- ❌ 后端服务未运行 (端口 3001)
- ❌ 前端服务未运行 (端口 3000)

## 🚀 启动步骤

### 方式1：使用两个独立的 WSL 终端（推荐）

#### 终端 1 - 启动后端
```bash
# 打开 WSL
wsl -d Ubuntu-24.04

# 进入后端目录
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend

# 启动开发服务器
npm run start:dev
```

#### 终端 2 - 启动前端
```bash
# 打开另一个 WSL 终端
wsl -d Ubuntu-24.04

# 进入前端目录
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend

# 启动开发服务器
npm run dev
```

### 方式2：使用 start-all.sh 脚本
```bash
wsl -d Ubuntu-24.04

cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

chmod +x start-all.sh
./start-all.sh
```

## 📊 验证服务状态

### 1. 检查后端
```bash
# 在 WSL 中
curl http://localhost:3001/api/health
```

### 2. 检查前端
访问浏览器：http://localhost:3000

### 3. 访问 Skill Registry
访问浏览器：http://localhost:3000/agent-enhanced

## 🧪 测试修复效果

### 测试 1：角色注册
1. 登录系统
2. 点击用户头像 → 切换到"开发者"模式
3. 填写开发者信息并注册
4. **预期结果**：✅ 注册成功，不再报 `developer` 枚举错误

### 测试 2：Skill 创建
1. 进入工作台 → Skill Registry
2. 点击"新建 Skill"
3. 填写基本信息：
   - Skill 名称: `test_skill`
   - 显示名称: `测试技能`
   - 功能描述: `这是一个测试技能`
4. 保持默认的 JSON Schema
5. 点击"创建 Skill"
6. **预期结果**：✅ 创建成功，无 `Cannot read properties of undefined` 错误

### 测试 3：JSON 格式修复
1. 进入 Skill Registry
2. 点击"新建 Skill"
3. 故意修改 Input Schema 为错误格式
4. 点击"重置默认格式"按钮
5. **预期结果**：✅ JSON 恢复为正确格式

### 测试 4：MPC 钱包
1. 使用社交账号登录（Google/Twitter）
2. 如果显示创建 MPC 钱包提示，点击创建
3. **预期结果**：✅ 钱包创建成功

## 🗂️ 修复文件清单

### 已修复的问题
✅ 1. `users_roles_enum` 缺少 `developer` 值
✅ 2. `user.roles.push is not a function` (roles 数组兼容性)
✅ 3. `CommissionSettlement.orderId does not exist` (字段映射)
✅ 4. Skill 创建时的 undefined 访问错误
✅ 5. JSON 格式验证和重置功能

### 修改的文件
- `backend/src/migrations/1774000000000-AddDeveloperRoleToEnum.ts`
- `backend/src/entities/commission-settlement.entity.ts`
- `backend/src/modules/user/user.service.ts`
- `backend/src/modules/merchant/merchant-profile.service.ts`
- `backend/src/modules/admin/services/user-management.service.ts`
- `frontend/components/workspace/SkillRegistry.tsx`
- `frontend/lib/api/skill.api.ts`

## 📚 相关文档
- 详细修复说明: [FIXES_2026_01_16.md](FIXES_2026_01_16.md)
- Skill 创建修复: [SKILL_CREATION_FIX.md](SKILL_CREATION_FIX.md)

## ❓ 常见问题

### Q: 后端启动失败
A: 检查数据库是否运行：
```bash
sudo systemctl status postgresql
# 或
sudo service postgresql status
```

### Q: 前端启动失败
A: 清理缓存并重新安装依赖：
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

### Q: 端口被占用
A: 查找并终止占用端口的进程：
```bash
# 查找占用 3001 的进程
lsof -i:3001
# 终止进程
kill -9 <PID>
```

---
**更新时间**: 2026年1月16日 21:45
