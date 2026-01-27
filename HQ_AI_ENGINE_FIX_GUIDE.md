# HQ Pilot AI引擎修复指南

## 问题诊断结果

### ✅ 已确认正常的服务
- 主站 (http://57.182.89.146/) - 健康检查通过
- HQ Pilot (http://57.182.89.146:8080/) - 健康检查通过
- 所有Docker容器运行正常

### ❌ 发现的问题
1. **AI引擎余额不足**: DeepSeek API返回 `402 Insufficient Balance`
2. **知识库文件**: 需要确认RAG文件是否完整挂载
3. **工作区功能**: 需要验证workspace API

---

## 修复方案：分层AI引擎架构

基于云创AWS Bedrock 1500美金额度，配置以下分层策略：

### 🎯 模型分配策略

| Agent类型 | 模型选择 | 供应商 | 用途 |
|----------|---------|--------|------|
| **CEO/架构师** | Claude Opus 4 | AWS Bedrock | 最强推理和战略规划 |
| **程序员/Coder** | Claude Sonnet 4.5 | AWS Bedrock | 代码生成和优化 |
| **增长/商务** | Gemini Flash 1.5 | Google (免费) | 日常对话和运营 |
| **备用降级** | Claude Haiku | AWS Bedrock | 高可用性保障 |

### 🔄 降级策略
1. 首选模型失败 → AWS Bedrock Claude Haiku
2. Bedrock失败 → Gemini Flash 1.5
3. 最后兜底 → Groq Llama 3.3 (开源)

---

## 部署步骤

### 步骤1：配置AWS凭证

SSH连接到服务器：
```bash
ssh -i ~/Desktop/agentrix-us.pem ubuntu@57.182.89.146
```

编辑环境变量文件：
```bash
cd ~/Agentrix
nano backend/.env.prod
```

添加/更新以下配置：
```env
# AWS Bedrock (云创1500美金额度)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY_HERE
AWS_BEDROCK_REGION=us-east-1
```

**获取AWS凭证：**
1. 登录AWS Console → IAM
2. 创建用户并附加策略：`AmazonBedrockFullAccess`
3. 创建访问密钥并保存

### 步骤2：更新代码

将本地修改的代码推送到服务器：

**方式A - Git推送（推荐）**
```bash
# 本地
git add backend/src/modules/hq/hq.service.ts backend/.env.prod
git commit -m "feat: 配置分层AI引擎架构 (AWS Bedrock + Gemini)"
git push origin main

# 服务器
cd ~/Agentrix
git pull origin main
```

**方式B - SCP上传（如果Git不可用）**
```powershell
# Windows PowerShell
scp -i $env:USERPROFILE\Desktop\agentrix-us.pem `
  backend/src/modules/hq/hq.service.ts `
  ubuntu@57.182.89.146:~/Agentrix/backend/src/modules/hq/

scp -i $env:USERPROFILE\Desktop\agentrix-us.pem `
  backend/.env.prod `
  ubuntu@57.182.89.146:~/Agentrix/backend/
```

### 步骤3：运行修复脚本

上传并执行修复脚本：
```bash
# 上传脚本
scp -i ~/Desktop/agentrix-us.pem fix-ai-engines.sh ubuntu@57.182.89.146:~/Agentrix/

# SSH连接并执行
ssh -i ~/Desktop/agentrix-us.pem ubuntu@57.182.89.146
cd ~/Agentrix
chmod +x fix-ai-engines.sh
./fix-ai-engines.sh
```

### 步骤4：验证修复结果

#### 4.1 测试CEO Agent (Claude Opus 4)
```bash
curl -X POST http://57.182.89.146:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "ceo",
    "messages": [{"role": "user", "content": "请简单介绍Agentrix平台的核心优势"}]
  }'
```

**期望响应**: 返回详细的平台介绍，不应出现"指令中断"或"余额不足"错误。

#### 4.2 测试Coder Agent (Claude Sonnet 4.5)
```bash
curl -X POST http://57.182.89.146:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "coder",
    "messages": [{"role": "user", "content": "写一个TypeScript函数计算斐波那契数列"}]
  }'
```

**期望响应**: 返回完整的代码示例和解释。

#### 4.3 测试工作区功能
```bash
curl http://57.182.89.146:8080/api/workspace
```

#### 4.4 检查知识库
```bash
ssh -i ~/Desktop/agentrix-us.pem ubuntu@57.182.89.146
docker exec agentrix-hq-pilot ls -lah /app/knowledge/
docker logs agentrix-hq-pilot | grep "RAG 引擎初始化"
```

**期望输出**: 应该看到14+个知识库文件，日志显示"RAG 引擎初始化成功"。

---

## 知识库文件补充（如果缺失）

如果知识库文件较少，需要上传文档：

```bash
# 1. 准备知识库文件（Markdown/TXT格式）
# 文件应包含: PRD、技术设计、运维指南、API文档等

# 2. 上传到服务器
scp -i ~/Desktop/agentrix-us.pem -r backend/knowledge/*.md ubuntu@57.182.89.146:~/Agentrix/backend/knowledge/

# 3. 重启HQ Pilot重新加载
ssh -i ~/Desktop/agentrix-us.pem ubuntu@57.182.89.146
cd ~/Agentrix
docker compose -f docker-compose.prod.yml restart hq-pilot
```

---

## 故障排查

### 问题1: "AWS credentials not configured"
**原因**: AWS凭证未正确配置
**解决**:
```bash
# 验证环境变量
docker exec agentrix-hq-pilot env | grep AWS

# 确认.env.prod中已配置AWS_ACCESS_KEY_ID和AWS_SECRET_ACCESS_KEY
```

### 问题2: "Bedrock model not found"
**原因**: Claude Opus 4 或 Sonnet 4.5模型ID错误
**解决**: 检查AWS Bedrock可用模型：
```bash
aws bedrock list-foundation-models --region us-east-1
```
如果模型不可用，临时回退到Claude 3.5版本：
- Opus 4 → `anthropic.claude-3-opus-20240229-v1:0`
- Sonnet 4.5 → `anthropic.claude-3-5-sonnet-20241022-v2:0`

### 问题3: 知识库为空
```bash
# 检查挂载
docker inspect agentrix-hq-pilot | grep -A 5 "Mounts"

# 应该看到: ~/Agentrix/backend/knowledge:/app/knowledge
```

### 问题4: 工作区打不开
检查Workspace API实现：
```bash
curl -v http://57.182.89.146:8080/api/workspace
```

---

## 成本预估

基于云创1500美金AWS Bedrock额度：

| 模型 | 输入价格 | 输出价格 | 预估对话次数 |
|------|---------|---------|-------------|
| Claude Opus 4 | $15/MTok | $75/MTok | ~15,000次 (CEO专用) |
| Claude Sonnet 4.5 | $3/MTok | $15/MTok | ~75,000次 (Coder专用) |
| Claude Haiku | $0.8/MTok | $4/MTok | ~280,000次 (备用) |
| Gemini Flash 1.5 | 免费 | 免费 | 无限制 |

**建议**:
- CEO/架构师对话控制在每天<50次
- 程序员对话控制在每天<200次
- 增长运营使用免费Gemini额度

---

## 监控与维护

### 日常检查
```bash
# 查看实时日志
docker logs agentrix-hq-pilot -f --tail 100

# 检查AI引擎调用统计
docker logs agentrix-hq-pilot | grep "架构师模式\|程序员模式\|增长模式" | tail -20

# 监控降级情况
docker logs agentrix-hq-pilot | grep "降级成功"
```

### 性能优化
- 如果Bedrock响应慢（>5s），考虑增加Gemini作为首选
- 定期清理Docker日志：`docker system prune -a`
- 监控AWS Bedrock配额：AWS Console → Bedrock → Usage

---

## 联系支持

如果遇到问题：
1. 查看完整日志：`docker logs agentrix-hq-pilot --tail 500 > hq-error.log`
2. 检查Docker容器状态：`docker ps -a`
3. 验证网络连接：`curl -v https://bedrock-runtime.us-east-1.amazonaws.com`

---

**修复完成后应该看到：**
✅ CEO Agent正常响应（使用Claude Opus 4）
✅ Coder Agent正常响应（使用Claude Sonnet 4.5）
✅ 知识库显示14+文件
✅ 工作区可以正常访问
✅ 不再出现"余额不足"错误
