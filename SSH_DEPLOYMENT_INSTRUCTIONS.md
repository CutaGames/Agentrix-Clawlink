# HQ Pilot 快速修复 - SSH部署指令

由于SSH密钥验证问题，提供以下两种修复方案：

---

## 方案A：直接在服务器上编辑（最简单）

### 1. SSH连接服务器

```bash
# 方式1：如果PEM密钥可用
ssh -i ~/Desktop/agentrix-us.pem ubuntu@57.182.89.146

# 方式2：如果有密码
ssh ubuntu@57.182.89.146
```

### 2. 配置AWS Bedrock凭证

```bash
cd ~/Agentrix
nano backend/.env.prod
```

在文件末尾添加（或更新）：

```env
# ========== AWS Bedrock配置 (云创1500美金额度) ==========
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY_HERE
AWS_BEDROCK_REGION=us-east-1
```

**保存**: `Ctrl+O`, `Enter`, `Ctrl+X`

### 3. 更新AI引擎代码

```bash
nano backend/src/modules/hq/hq.service.ts
```

找到第298行左右（搜索 `// 模型映射策略`），替换为：

```typescript
      // 模型映射策略 V2 (Agentrix "智能分级混合模型引擎")
      // 云创AWS Bedrock 1500美金额度分配:
      // - 架构师(CEO): Claude Opus 4 (最强推理)
      // - 程序员(Coder): Claude Sonnet 4.5 (代码专家)
      // - 增长商务: Gemini Flash 1.5 (免费额度)
      // - 备用降级: Claude Haiku (高性价比)
      
      let targetModel = 'gemini-1.5-flash-002'; 
      let provider: 'gemini' | 'bedrock' | 'openai' | 'deepseek' | 'groq' = 'gemini';

      // 1. CEO/系统架构师 - 使用 Claude Opus 4 (最强推理和规划能力)
      if (agentId === 'ceo' || agentId === 'CEO' || agentId === 'architect' || 
          agentId === 'ARCHITECT-01' || agentId === 'AGENT-ARCHITECT-001') {
        targetModel = 'anthropic.claude-opus-4-20250514-v1:0'; 
        provider = 'bedrock';
        this.logger.log('🎯 架构师模式：使用 Claude Opus 4 (AWS Bedrock)');
      } 
      // 2. 开发者/代码专家 - 使用 Claude Sonnet 4.5 (代码优化专家)
      else if (agentId === 'coder' || agentId === 'CODER' || agentId === 'developer' ||
               agentId === 'CODER-01' || agentId === 'AGENT-CODER-001' || 
               agentId.toLowerCase().includes('dev') || agentId.toLowerCase().includes('code')) {
        targetModel = 'anthropic.claude-sonnet-4-20250514-v1:0';
        provider = 'bedrock';
        this.logger.log('💻 程序员模式：使用 Claude Sonnet 4.5 (AWS Bedrock)');
      } 
      // 3. 增长/商务/运营 - 使用 Gemini Flash 1.5 (免费额度)
      else if (agentId.toLowerCase().includes('growth') || agentId.toLowerCase().includes('bd') ||
               agentId.toLowerCase().includes('sales') || agentId.toLowerCase().includes('marketing')) {
        targetModel = 'gemini-1.5-flash-002';
        provider = 'gemini';
        this.logger.log('📈 增长模式：使用 Gemini Flash 1.5 (免费)');
      } 
      // 4. 其他默认使用 Gemini Flash (免费额度节约成本)
      else {
        targetModel = 'gemini-1.5-flash-002';
        provider = 'gemini';
        this.logger.log('🌟 默认模式：使用 Gemini Flash 1.5 (免费)');
      }
```

同时修改降级策略（搜索 `尝试 Claude 3.5 Haiku`），替换为：

```typescript
      try {
        response = await executeAiCall(provider, targetModel);
      } catch (e: any) {
        this.logger.warn(`${provider} 引擎首选失败 (${e.message})，尝试降级方案...`);
        try {
          // 降级策略1：尝试 Claude Haiku (AWS Bedrock 高性价比)
          if (provider !== 'bedrock') {
            response = await executeAiCall('bedrock', 'anthropic.claude-3-5-haiku-20241022-v1:0');
            this.logger.log('✅ 降级成功：Claude Haiku (AWS Bedrock)');
          } else {
            // 如果已经在使用Bedrock但失败，尝试Gemini
            response = await executeAiCall('gemini', 'gemini-1.5-flash-002');
            this.logger.log('✅ 降级成功：Gemini Flash 1.5');
          }
        } catch (e2: any) {
          // 最后的兜底：Groq（开源模型）
          this.logger.warn('所有主力引擎失败，使用 Groq 开源模型兜底...');
          try {
            response = await executeAiCall('groq', 'llama-3.3-70b-versatile');
            this.logger.log('✅ 降级成功：Groq Llama 3.3');
          } catch (e3: any) {
```

**保存**: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4. 重建并部署

```bash
cd ~/Agentrix

# 重建HQ Pilot镜像
docker compose -f docker-compose.prod.yml build hq-pilot

# 重启服务
docker compose -f docker-compose.prod.yml up -d hq-pilot

# 等待启动
sleep 30

# 查看日志
docker logs agentrix-hq-pilot --tail 50
```

### 5. 验证修复

```bash
# 健康检查
curl http://localhost:8080/api/health

# 测试CEO Agent
curl -X POST http://localhost:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"ceo","messages":[{"role":"user","content":"Hello"}]}'

# 检查模型日志
docker logs agentrix-hq-pilot | grep "架构师模式\|程序员模式"
```

**期望输出**: 不应再出现 "指令中断" 或 "402 Insufficient Balance" 错误。

---

## 方案B：使用自动化脚本（如果vim/nano不熟悉）

### 1. 下载修改后的文件

从GitHub仓库或本地下载：
- `backend/.env.prod`
- `backend/src/modules/hq/hq.service.ts`

### 2. 上传到服务器

```bash
# Windows PowerShell (确保PEM权限正确)
scp -i $env:USERPROFILE\Desktop\agentrix-us.pem `
    backend/.env.prod `
    ubuntu@57.182.89.146:~/Agentrix/backend/

scp -i $env:USERPROFILE\Desktop\agentrix-us.pem `
    backend/src/modules/hq/hq.service.ts `
    ubuntu@57.182.89.146:~/Agentrix/backend/src/modules/hq/
```

### 3. SSH连接并部署

```bash
ssh -i ~/Desktop/agentrix-us.pem ubuntu@57.182.89.146

cd ~/Agentrix
docker compose -f docker-compose.prod.yml build hq-pilot
docker compose -f docker-compose.prod.yml up -d hq-pilot
```

---

## 方案C：Git拉取（如果仓库已配置）

```bash
ssh ubuntu@57.182.89.146
cd ~/Agentrix

# 拉取最新代码
git pull origin main

# 手动配置AWS凭证（Git不会包含敏感信息）
nano backend/.env.prod
# 添加 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY

# 部署
docker compose -f docker-compose.prod.yml build hq-pilot
docker compose -f docker-compose.prod.yml up -d hq-pilot
```

---

## 重要提醒

### ⚠️ AWS凭证获取

1. 登录AWS Console: https://console.aws.amazon.com/
2. 导航到 **IAM** → **Users** → **Create User**
3. 用户名: `agentrix-bedrock-user`
4. 权限策略: 附加 `AmazonBedrockFullAccess`
5. 创建访问密钥: **Access keys** → **Create access key**
6. 保存 `AWS_ACCESS_KEY_ID` 和 `AWS_SECRET_ACCESS_KEY`

### ⚠️ 模型ID确认

Claude Opus 4 和 Sonnet 4.5 的模型ID可能因AWS区域而异：

```bash
# 查看可用模型
aws bedrock list-foundation-models --region us-east-1 | grep claude

# 如果Opus 4不可用，临时使用:
# anthropic.claude-3-opus-20240229-v1:0 (Claude 3 Opus)
```

### ⚠️ 知识库检查

```bash
# 确认知识库文件
ls -lh ~/Agentrix/backend/knowledge/

# 如果文件较少，上传更多文档
# 推荐: PRD、技术设计、API文档、运维指南等

# 查看容器内知识库
docker exec agentrix-hq-pilot ls -lah /app/knowledge/
```

---

## 故障排查

### 问题1: SSH连接失败

```bash
# 检查PEM权限（Windows）
icacls C:\Users\YourName\Desktop\agentrix-us.pem

# 修复权限
icacls C:\Users\YourName\Desktop\agentrix-us.pem /inheritance:r /grant:r "$env:USERNAME`:R"

# 通过WSL连接
wsl ssh -i /mnt/c/Users/YourName/Desktop/agentrix-us.pem ubuntu@57.182.89.146
```

### 问题2: Docker构建失败

```bash
# 查看构建日志
docker compose -f docker-compose.prod.yml build hq-pilot --no-cache

# 检查磁盘空间
df -h

# 清理Docker缓存
docker system prune -a
```

### 问题3: AWS凭证无效

```bash
# 测试AWS连接
docker exec agentrix-hq-pilot env | grep AWS

# 验证Bedrock访问
aws bedrock list-foundation-models --region us-east-1
```

---

## 验证清单

修复完成后，检查以下项目：

- [ ] 主站 http://57.182.89.146/ 正常访问
- [ ] 指挥室 http://57.182.89.146:8080/ 正常访问
- [ ] CEO Agent 对话不再出现"余额不足"错误
- [ ] 日志显示 "架构师模式：使用 Claude Opus 4"
- [ ] Coder Agent 正常工作
- [ ] 知识库文件数量 >= 10
- [ ] 工作区功能可访问

---

## 联系支持

如遇问题，收集以下信息：

```bash
# 导出完整日志
docker logs agentrix-hq-pilot > hq-pilot-full.log 2>&1

# 导出环境变量（隐藏敏感信息）
docker exec agentrix-hq-pilot env | grep -v "SECRET\|PASSWORD\|KEY" > env-sanitized.txt

# 容器状态
docker ps -a > docker-status.txt

# 压缩发送
tar -czf agentrix-debug-$(date +%Y%m%d).tar.gz *.log *.txt
```
