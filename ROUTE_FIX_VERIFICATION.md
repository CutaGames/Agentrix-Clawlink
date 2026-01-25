# Backend 路由修复验证指南

## 问题描述
原来的控制器路由配置错误：
- `@Controller('api/expert-profiles')` + 全局前缀 `api/` = `/api/api/expert-profiles` ❌
- `@Controller('api/datasets')` + 全局前缀 `api/` = `/api/api/datasets` ❌

## 已修复
- `@Controller('expert-profiles')` + 全局前缀 `api/` = `/api/expert-profiles` ✅
- `@Controller('datasets')` + 全局前缀 `api/` = `/api/datasets` ✅

## 验证编译结果
已确认 `dist/` 文件已更新：
- `dist/modules/expert-profile/expert-profile.controller.js:189` → `Controller)('expert-profiles')`
- `dist/modules/dataset/dataset.controller.js:208` → `Controller)('datasets')`

## 手动测试步骤

### 1. 打开 WSL 终端
```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend
```

### 2. 启动后端服务
```bash
npm run start:dev
# 或者使用编译后的JS：
# node dist/main.js
```

### 3. 等待启动完成（看到 "Nest application successfully started" 或 "listening on port 3001"）

### 4. 在另一个终端测试路由
```bash
# 健康检查
curl http://localhost:3001/api/health

# 专家档案路由（应返回 401 Unauthorized，不是 404）
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/expert-profiles/my
# 期望: 401

# 数据集路由（应返回 401 Unauthorized，不是 404）
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/datasets
# 期望: 401

# 验证旧路由不再工作
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/api/expert-profiles/my
# 期望: 404 (路由不存在)
```

### 5. 运行完整测试
```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website
bash tests/start-and-test.sh
```

## 期望结果
- `/api/expert-profiles/my` → 401 (需要认证)
- `/api/datasets` → 401 (需要认证)
- `/api/api/expert-profiles/my` → 404 (路由不存在)
- 测试套件应通过更多路由测试
