# HQ Console 完整修复步骤

## 问题状态
1. ✅ **前端代码已修复** - Shield组件已导入，文件树渲染已修复
2. ⚠️ **后端HQ服务启动困难** - ts-node卡住，需要特殊启动方式
3. ⚠️ **前端需要重启**才能加载新代码

## 立即执行的修复步骤

### 步骤1: 重启前端服务（让修复生效）

```powershell
# 1. 停止前端进程
Get-Process | Where-Object {$_.CommandLine -like "*next dev*" -or $_.Id -eq 19612} | Stop-Process -Force

# 2. 重新启动前端
cd d:\wsl\Ubuntu-24.04\Code\Agentrix\Agentrix-website\hq-console
npm run dev
```

**等待提示**："✓ Ready in Xms" 后再测试

### 步骤2: 启动HQ后端服务（Gemini/AWS模式）

由于ts-node有问题，使用编译后的代码：

```bash
# 在WSL终端中执行：
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend

# 停止所有node进程
pkill -9 node
sleep 2

# 无代理环境启动
unset HTTP_PROXY
unset HTTPS_PROXY  
unset http_proxy
unset https_proxy
export NO_PROXY='*'

# 前台运行查看输出（推荐用于调试）
node dist/main-hq.js

# 或后台运行
# nohup node dist/main-hq.js > hq.log 2>&1 &
```

**预期输出**: 
```
[Nest] INFO  [HQStandaloneModule] HQ Standalone Server 启动
[Nest] INFO  Application is running on: http://[::]:3005
```

如果卡住超过30秒，按Ctrl+C终止，然后尝试：

```bash
# 使用ts-node-dev（更稳定）
npm run start:hq:dev
```

### 步骤3: 验证服务

```powershell
# 测试后端健康检查
Invoke-WebRequest -Uri "http://localhost:3005/api/hq/knowledge-base" -UseBasicParsing | Select-Object StatusCode

# 测试Agent对话
$body = @{
    agentId = "AGENT-GROWTH-001"
    messages = @(@{ role = "user"; content = "你好" })
} | ConvertTo-Json -Depth 3

Invoke-WebRequest -Uri "http://localhost:3005/api/hq/chat" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing | Select-Object @{Name="Reply";Expression={($_.Content | ConvertFrom-Json).content}}
```

**预期结果**: 
- StatusCode 200 或 201
- Reply 字段有AI回复（不是"所有引擎不可用"错误）

### 步骤4: 测试前端功能

访问 http://localhost:4000

#### 测试知识库（问题1）
1. 点击顶部 "全员知识库(潜意识)" 标签
2. **预期**: 正常显示编辑器，无 "Shield is not defined" 错误

#### 测试Workshop IDE（问题2）
1. 点击顶部 "Workshop IDE" 标签  
2. 点击 "🔍 打开工作区" 按钮
3. **预期**: 左侧显示项目信息和文件树（前20个文件），无React渲染错误

#### 测试Agent对话（问题3）
1. 返回 "指挥中心" 标签
2. 点击任意Agent（如"全球增长负责人"）
3. 发送消息："你好，请介绍自己"
4. **预期**: 收到AI回复（不是"所有AI引擎不可用"错误）

---

## 如果HQ服务仍然启动失败

### 方案A: 检查TypeORM连接

HQ服务可能卡在数据库连接。检查 `backend/.env` 中的数据库配置：

```bash
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=yourpassword
DB_DATABASE=paymind_db
```

### 方案B: 跳过数据库初始化

临时修改 `backend/src/main-hq.ts`:

```typescript
// 注释掉 TypeORM 连接
// await app.init();

// 直接启动服务
await app.listen(3005);
```

### 方案C: 使用已有的backend服务

如果主backend服务（3001端口）在运行：

```bash
# 检查
curl http://localhost:3001/api/hq/knowledge-base

# 如果可用，修改前端配置
# hq-console/.env.local:
NEXT_PUBLIC_HQ_URL=http://localhost:3001
```

---

## 已修复的文件

### 前端修复
- ✅ [hq-console/src/app/page.tsx](hq-console/src/app/page.tsx#L6) - 添加 `Shield` 导入
- ✅ [hq-console/src/app/page.tsx](hq-console/src/app/page.tsx#L91-94) - 添加workspace状态
- ✅ [hq-console/src/app/page.tsx](hq-console/src/app/page.tsx#L530-534) - 修复文件树渲染

### 后端修复
- ✅ [backend/src/modules/hq/hq.service.ts](backend/src/modules/hq/hq.service.ts#L308-316) - 保持Gemini/AWS配置
- ✅ [backend/start-hq-no-proxy.sh](backend/start-hq-no-proxy.sh) - 无代理启动脚本

---

## 快速测试命令（复制粘贴）

```powershell
# 1. 重启前端
taskkill /F /PID 19612 2>$null; cd d:\wsl\Ubuntu-24.04\Code\Agentrix\Agentrix-website\hq-console; Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# 2. 等待15秒
Start-Sleep -Seconds 15

# 3. 测试前端
Start-Process "http://localhost:4000"

# 4. 在新的WSL终端启动HQ服务
wt wsl bash -c "cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend && unset HTTP_PROXY && unset HTTPS_PROXY && export NO_PROXY='*' && npm run start:hq:dev"
```

---

## 总结

**根本原因**:
- 问题1&2: 前端代码已修复，但**需要重启dev服务**才能生效
- 问题3: HQ服务的**ts-node初始化卡住**，需要用编译文件或ts-node-dev启动

**关键操作**:
1. 杀掉旧的前端进程并重启
2. 用 `npm run start:hq:dev` 或 `node dist/main-hq.js` 启动HQ服务
3. 确保**无代理环境**（unset HTTP_PROXY）以连接Gemini/AWS

**验证成功标志**:
- ✅ 知识库标签可正常打开
- ✅ Workshop IDE显示文件树
- ✅ Agent回复正常文本（不是"引擎不可用"）
