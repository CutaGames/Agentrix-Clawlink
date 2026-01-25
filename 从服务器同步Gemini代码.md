# 从服务器同步 Gemini 代码到本地

## 🎯 问题

**本地测试端点没有反应，因为代码修改在服务器上，本地还没有同步。**

---

## ✅ 解决方案

### 方案 1: 在服务器上直接测试（推荐，快速）

**SSH 到服务器后执行：**

```bash
# 1. SSH 到服务器
ssh root@129.226.152.88

# 2. 进入后端目录
cd /var/www/agentrix-website/backend

# 3. 测试端点
curl http://localhost:3001/api/gemini/functions

# 4. 或者通过公网测试
curl https://api.agentrix.top/api/gemini/functions
```

**如果服务器上能正常工作，说明代码没问题，只是本地需要同步。**

---

### 方案 2: 从服务器同步代码到本地

#### 方法 A: 使用 rsync（推荐）

```bash
# 在本地执行
rsync -avz --progress \
  root@129.226.152.88:/var/www/agentrix-website/backend/src/modules/ai-integration/gemini/ \
  backend/src/modules/ai-integration/gemini/ \
  --exclude="*.js" \
  --exclude="*.js.map" \
  --exclude="*.d.ts"
```

#### 方法 B: 使用 scp

```bash
# 在本地执行
# 1. 创建目录（如果不存在）
mkdir -p backend/src/modules/ai-integration/gemini

# 2. 下载文件
scp root@129.226.152.88:/var/www/agentrix-website/backend/src/modules/ai-integration/gemini/*.ts \
  backend/src/modules/ai-integration/gemini/
```

#### 方法 C: 使用同步脚本

```bash
# 使用现有的同步脚本
./sync-from-server.sh
```

---

### 方案 3: 直接测试服务器端点（最简单）

**不需要同步代码，直接在服务器上测试：**

```bash
# SSH 到服务器
ssh root@129.226.152.88

# 测试端点
curl http://localhost:3001/api/gemini/functions
curl -X POST http://localhost:3001/api/gemini/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "我要买 iPhone 15"}
    ],
    "geminiApiKey": "你的-Gemini-API-Key",
    "context": {
      "sessionId": "test-123"
    }
  }'
```

**或者通过公网测试：**

```bash
# 在本地执行
curl https://api.agentrix.top/api/gemini/functions
```

---

## 📋 检查清单

### 在服务器上检查：

- [ ] SSH 到服务器
- [ ] 检查 Gemini 集成文件是否存在
  ```bash
  ls -la /var/www/agentrix-website/backend/src/modules/ai-integration/gemini/
  ```
- [ ] 检查服务是否运行
  ```bash
  pm2 list
  pm2 logs agentrix-backend --lines 20
  ```
- [ ] 测试端点
  ```bash
  curl http://localhost:3001/api/gemini/functions
  ```

### 如果需要同步到本地：

- [ ] 使用 rsync 或 scp 下载文件
- [ ] 检查本地文件是否正确
- [ ] 重新构建本地项目（如果需要）

---

## 🚀 快速测试步骤

### 1. 在服务器上测试（最快）

```bash
ssh root@129.226.152.88
cd /var/www/agentrix-website/backend
curl http://localhost:3001/api/gemini/functions
```

### 2. 通过公网测试（无需 SSH）

```bash
# 在本地执行
curl https://api.agentrix.top/api/gemini/functions
```

### 3. 如果服务器上正常，再同步到本地

```bash
# 使用 rsync 同步
rsync -avz root@129.226.152.88:/var/www/agentrix-website/backend/src/modules/ai-integration/gemini/ \
  backend/src/modules/ai-integration/gemini/
```

---

## 🎯 推荐流程

1. **先在服务器上测试** - 确认代码是否正常工作
2. **如果正常，再同步到本地** - 用于本地开发
3. **如果服务器上也不正常** - 检查服务器上的代码和配置

---

## 📝 下一步

1. **SSH 到服务器测试端点**
2. **如果正常，说明代码没问题，只是本地需要同步**
3. **使用 rsync 或 scp 同步代码到本地**
4. **继续本地开发**

