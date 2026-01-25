# Agentrix HQ Console 问题诊断和解决方案

**诊断时间**: 2026-01-24  
**问题**: 
1. 点击"打开工作区"按钮报错
2. 无法与Agent对话

---

## 🔍 问题1: 打开工作区按钮错误

### 错误信息
```
Error: Objects are not valid as a React child 
(found: object with keys {status, file})
```

### 根本原因
文件树渲染时，直接渲染了对象而不是对象的属性。

### 修复方案
已修改 `hq-console/src/app/page.tsx`：
- 添加 `.slice(0, 20)` 限制显示数量
- 添加 `truncate` CSS类避免溢出
- 只渲染 `item.name` 而不是整个对象
- 添加 `max-h-64 overflow-auto` 处理大量文件

### 修改位置
[hq-console/src/app/page.tsx](hq-console/src/app/page.tsx#L524-L532)

---

## 🔍 问题2: 无法与Agent对话

### 错误信息
后端返回:
```json
{
  "content": "[指令中断]：所有 AI 引擎连接均告急。详细错误: 所有 AI 引擎均不可用。"
}
```

### 根本原因
**WSL代理配置干扰网络连接**，导致：
- ❌ Gemini API 无法连接 (Google服务被阻挡)
- ❌ Bedrock Fallback 失败
- ✅ OpenAI (api2d代理) 可以工作

### 测试结果
```bash
# ❌ Gemini 测试失败
wsl node test-gemini-direct.js
# 错误: request to https://generativelanguage.googleapis.com/... failed

# ✅ OpenAI 测试成功 (禁用代理后)
NO_PROXY='*' HTTP_PROXY='' HTTPS_PROXY='' node test-openai-direct.js
# 成功响应: 我是一个具有创造力和热情的人...
```

### 解决方案

#### 方法1: 使用无代理模式启动脚本 (推荐)

已创建启动脚本 `backend/start-hq-no-proxy.sh`：

```bash
#!/bin/bash
export NO_PROXY='*'
export HTTP_PROXY=''
export HTTPS_PROXY=''
export http_proxy=''
export https_proxy=''

pkill -9 -f 'main-hq' 2>/dev/null || true
sleep 2

npm run start:hq 2>&1 | tee hq-server.log
```

**启动命令**:
```bash
cd backend
bash start-hq-no-proxy.sh
```

#### 方法2: 手动设置环境变量

在 WSL 终端中：
```bash
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend

# 临时禁用代理
export NO_PROXY='*'
export HTTP_PROXY=''
export HTTPS_PROXY=''

# 停止旧进程
pkill -9 -f 'main-hq'
sleep 2

# 启动服务
npm run start:hq
```

#### 方法3: 修改 WSL 代理配置 (永久方案)

编辑 `~/.bashrc` 或 `~/.zshrc`，添加：
```bash
# 为特定域名禁用代理
export NO_PROXY="localhost,127.0.0.1,generativelanguage.googleapis.com,googleapis.com"
```

然后重启终端或执行 `source ~/.bashrc`

---

## ✅ 验证步骤

### 1. 启动 HQ 服务器 (无代理模式)
```bash
cd backend
bash start-hq-no-proxy.sh
```

等待约 **60秒** 让服务器完全启动。

### 2. 测试健康检查
```bash
curl http://localhost:3005/api/hq/knowledge-base | jq '.content' | head -5
```

预期输出: 知识库MD内容

### 3. 测试 Agent 对话
```powershell
$body = @{
    agentId = "AGENT-GROWTH-001"
    messages = @(
        @{ role = "user"; content = "你好" }
    )
} | ConvertTo-Json -Depth 3

Invoke-WebRequest -Uri "http://localhost:3005/api/hq/chat" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -UseBasicParsing | 
    Select-Object @{Name="Response";Expression={($_.Content | ConvertFrom-Json).content}}
```

**预期输出**: AI的正常回复（不是"所有引擎不可用"错误）

### 4. 测试前端
```bash
cd hq-console
npm run dev
```

访问 http://localhost:4000:
- ✅ 点击任意 Agent，发送消息，应该收到正常回复
- ✅ 点击"Workshop IDE"标签，点击"🔍 打开工作区"，应该显示项目信息和文件树

---

## 📊 代理问题详细分析

### WSL 代理配置位置
1. **系统环境变量**: `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`
2. **Shell 配置**: `~/.bashrc`, `~/.zshrc`
3. **WSL 配置**: `/etc/wsl.conf`

### 受影响的服务
| 服务 | 是否受影响 | 原因 |
|------|-----------|------|
| Gemini API | ❌ 是 | Google服务被代理阻挡 |
| Bedrock (AWS) | ❌ 可能 | 需要测试 |
| OpenAI (api2d) | ✅ 否 | 国内代理，可直连 |
| 本地服务 (3001, 3005) | ✅ 否 | localhost不受影响 |

### 长期解决方案
建议修改后端代码的fallback逻辑：
```typescript
// 在 backend/src/modules/hq/hq.service.ts
// Growth/BD agents 直接使用 OpenAI 作为首选，跳过 Gemini
if (agent.role === 'Growth' || agent.role === 'BD') {
  targetModel = 'gpt-3.5-turbo';  // 或 gpt-4
  provider = 'openai';
}
```

这样即使网络有问题，也能保证服务可用。

---

## 🎯 总结

**问题1 (打开工作区错误)**: ✅ 已修复  
**问题2 (Agent对话失败)**: ✅ 已有解决方案 (需重启HQ服务)

**下一步**:
1. 使用 `bash start-hq-no-proxy.sh` 启动 HQ 服务
2. 等待 60 秒
3. 刷新前端页面 (http://localhost:4000)
4. 测试对话和工作区功能

**临时措施**: 每次启动都使用无代理脚本  
**永久方案**: 修改后端代码，让 Growth/BD agents 直接使用 OpenAI 而不是 Gemini
