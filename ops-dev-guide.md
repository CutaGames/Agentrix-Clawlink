# Agentrix 运维与开发指南 (AWS 生产环境)

本指南旨在帮助架构师和开发者快速了解 Agentrix 系统的生产部署架构、日常维护操作及开发流程。

## 1. 系统架构概览

系统采用 **Docker Compose** 进行容器化编排，运行于 AWS EC2 (Ubuntu 24.04) 环境。

### 核心组件
- **Frontend (Port 3000)**: Next.js 主站，通过 Nginx Port 80 访问。
- **Backend (Port 3001)**: NestJS API 服务，处理主要业务逻辑。
- **HQ Pilot (Port 3005)**: 独立的 NestJS 后端服务，专为 HQ Console 提供 Agent 对话、RAG 知识库、代码工作空间等功能。
- **HQ Console (Port 3000)**: Next.js 前端，通过 Nginx Port 8080 访问。
- **Postgres (Port 5432)**: PostgreSQL 15 核心数据库。
- **Redis (Port 6379)**: 缓存与任务队列。
- **Nginx**: 反向代理网关，Port 80 服务主站，Port 8080 服务 HQ Console。

### 架构特点
- **双后端分离**: Backend (3001) 处理用户业务，HQ Pilot (3005) 处理指挥室功能，共享数据库但独立运行。
- **知识库共享**: `backend/knowledge/` 目录挂载到两个后端容器，RAG 引擎加载 14+ 文件用于 AI 对话增强。
- **统一市场**: 76+ Skills（包括 54 个从商品转换的资源）通过 UnifiedMarketplaceModule 统一管理。

---

## 2. 目录结构
- `/home/ubuntu/Agentrix`: 项目根目录。
- `Agentrix/backend`: API 源码及知识库存储 (`knowledge/`)。
- `Agentrix/frontend`: 主站源码。
- `Agentrix/hq-console`: 指挥室源码。
- `Agentrix/nginx`: 配置文件。

---

## 3. 常用操作命令

### 管理容器
```bash
cd ~/Agentrix
# 启动所有服务
docker compose -f docker-compose.prod.yml up -d

# 停止所有服务
docker compose -f docker-compose.prod.yml down

# 重启单个服务 (例如 backend)
docker compose -f docker-compose.prod.yml restart backend

# 重建并重启服务（代码更新后）
docker compose -f docker-compose.prod.yml build backend hq-pilot
docker compose -f docker-compose.prod.yml up -d

# 查看实时日志
docker compose -f docker-compose.prod.yml logs -f --tail 100 backend
docker compose -f docker-compose.prod.yml logs -f --tail 100 hq-pilot

# 查看所有容器状态
docker ps -a
```

### 数据库管理
```bash
# 进入数据库命令行
docker exec -it agentrix-postgres psql -U agentrix -d paymind

# 常用查询
# 查看用户
select * from "user" limit 5;

# 查看 Skills 统计
select status, source, count(*) from skills group by status, source;

# 查看商品统计
select status, count(*) from products group by status;

# 检查 Skills 和 Products 映射
select s.id, s.name, s.source, p.name as product_name 
from skills s 
left join products p on s."productId" = p.id 
where s.source = 'converted' limit 10;
```

---

## 4. 开发与部署流水线

### 更新代码
1. 在本地完成代码推送。
2. 在服务器端执行：
   ```bash
   git pull
   docker compose -f docker-compose.prod.yml up -d --build [service_name]
   ```

### 数据库迁移 (Migrations)
系统在启动时会自动运行 `npm run migration:run`。若需手动处理：
```bash
docker exec -it agentrix-backend npm run migration:run
```

---

## 5. API 验证与测试

### 健康检查
```bash
# 主后端健康检查
curl http://localhost/api/health

# HQ Pilot 健康检查（通过 8080 端口）
curl http://localhost:8080/api/health

# 容器内部测试
docker exec agentrix-backend wget -qO- http://localhost:3001/api/health
docker exec agentrix-hq-pilot wget -qO- http://localhost:3005/api/health
```

### 测试 HQ Agent 对话
```bash
# 创建测试文件
cat > test_chat.json << 'EOF'
{
  "agentId": "ceo",
  "messages": [
    {
      "role": "user",
      "content": "你好，请介绍一下 Agentrix 平台"
    }
  ]
}
EOF

# 通过 Nginx 调用 HQ Chat API
curl -X POST http://localhost:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d @test_chat.json
```

### 测试统一市场 API
```bash
# 搜索所有 Skills
curl "http://localhost/api/unified-marketplace/search?limit=10"

# 按层级搜索（logic/resource/infra/composite）
curl "http://localhost/api/unified-marketplace/search?layer=resource&limit=5"

# 获取热门 Skills
curl "http://localhost/api/unified-marketplace/trending?limit=10"
```

---

## 6. 常见问题排查 (Troubleshooting)

### 指挥室无法打开 (503/502)
- 检查 `agentrix-hq` 和 `agentrix-hq-pilot` 容器状态：`docker ps | grep hq`
- 确认 AWS 安全组已开放 `80` 和 `8080` 端口。
- 查看 Nginx 日志：`docker logs agentrix-nginx`

### Agent 对话失败或返回 500 错误
- 检查 HQ Pilot 日志：`docker logs agentrix-hq-pilot --tail 200`
- 确认环境变量配置正确（AI API Keys）：`docker exec agentrix-hq-pilot env | grep -E "GEMINI|OPENAI|DEEPSEEK"`
- 验证数据库连接：`docker exec agentrix-hq-pilot wget -qO- http://localhost:3005/api/health`

### Marketplace 显示为空
- 检查 Skills 数量：
  ```bash
  docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT COUNT(*) FROM skills WHERE status='published';"
  ```
- 验证统一市场 API：`curl "http://localhost/api/unified-marketplace/search?limit=5"`
- 确认商品已转换为 Skills：
  ```bash
  docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT COUNT(*) FROM skills WHERE source='converted';"
  ```

### 知识库不更新
- 知识库文件存储在 `Agentrix/backend/knowledge`。
- 后端服务会扫描该目录。确保文件读写权限为 `nestjs:nodejs` 或 `755`。
- 重新加载知识库：重启 HQ Pilot 容器 `docker compose -f docker-compose.prod.yml restart hq-pilot`
- 验证加载情况：`docker logs agentrix-hq-pilot | grep "RAG 引擎初始化成功"`

### 容器健康检查失败 (unhealthy)
- 检查端口监听：`docker exec <container> netstat -tuln | grep <port>`
- 健康检查使用 wget，确保容器内已安装：`docker exec <container> which wget`
- 查看健康检查详情：`docker inspect <container> | grep -A 20 Health`

---

---

## 7. 系统验证结果 (2026-01-26)

### 服务状态验证
所有核心服务正常运行：
```bash
CONTAINER ID   STATUS
d32415505137   Up 29 minutes   agentrix-hq-pilot
fcc7a0279f25   Up 29 minutes   agentrix-frontend
70878826e727   Up 29 minutes   agentrix-backend
2df2d0662b8b   Up 29 minutes   agentrix-postgres
417f8ecf6afb   Up 29 minutes   agentrix-redis
82a31ba8ffd3   Up 7 hours      agentrix-hq
1d14077ea5bf   Up 9 hours      agentrix-nginx
```

### HQ Agent 对话验证 ✅
**测试命令**:
```bash
curl -X POST http://localhost:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"ceo","messages":[{"role":"user","content":"你好，请介绍一下 Agentrix 平台的主要功能"}]}'
```

**测试结果**: 成功返回 1031 字节响应，Agent 准确介绍了 Agentrix 平台的 4 大核心功能：
1. 商品搜索和购买
2. 购物车管理
3. 订单管理和支付
4. 比价服务

### 统一市场验证 ✅
**测试命令**:
```bash
curl "http://localhost/api/unified-marketplace/search?limit=3"
```

**测试结果**: 返回 76 个 Skills，分层统计：
- **Resource Layer**: 54 Skills (来自商品转换)
- **Logic Layer**: 15 Skills (原生 + 转换)
- **Infra Layer**: 7 Skills
- **来源**: 22 个原生 Skills + 54 个转换 Skills

示例 Skills: `get_product_details`, `create_order`, `search_products`

### RAG 知识库验证 ✅
**日志确认**:
```
RAG 引擎初始化成功：加载了 14 个文件，共 74 个知识分块
```

**知识库内容**: 14 个 Markdown/Text 文件涵盖产品文档、技术设计、运营指南等。

### 模块加载验证 ✅
HQ Pilot 成功加载所有必要模块：
- ✅ UnifiedMarketplaceModule
- ✅ MarketplaceModule
- ✅ SkillModule
- ✅ AgentAccountModule
- ✅ AuthModule
- ✅ UserModule
- ✅ CommonModule
- ✅ RagModule (Google Generative AI embeddings)
- ✅ DeveloperModule
- ✅ ChatModule

---

## 8. 特别注意事项

### V2.1 分层AI引擎架构 (2026-01-27 最新)
- **云创AWS Bedrock 1500美金额度**分层策略：
  - 🎯 **CEO/架构师**: Claude Opus 4 (最强推理和战略规划)
  - 💻 **程序员/Coder**: Claude Sonnet 4.5 (代码生成和优化专家)
  - 📈 **增长/商务**: Gemini Flash 1.5 (免费额度，日常运营)
  - 🔄 **备用降级**: Claude Haiku (AWS Bedrock 高性价比) → Gemini → Groq
- **环境变量配置**: 需要在 `backend/.env.prod` 中配置 AWS凭证：
  ```env
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=your_key
  AWS_SECRET_ACCESS_KEY=your_secret
  AWS_BEDROCK_REGION=us-east-1
  ```

### V2.0 架构升级
- **双后端分离**: Backend (3001) 和 HQ Pilot (3005) 独立运行，避免功能耦合。
- **统一市场**: 所有商品、服务、工具通过 `UnifiedMarketplaceModule` 管理，自动转换为 Skills。
- **RAG 增强**: HQ Pilot 内置知识库向量化引擎，支持 14+ 文件的语义搜索。
- **健康检查**: 所有容器都配置了 healthcheck，通过 wget 检测 `/api/health` 端点。

### V5 版本改动
- **分账系统**: 确保 `skill` 和 `product` 表中包含 `commission_rate` 等 V5 字段。
- **字段映射**: `User` 表中的 `agentrixId` 对应数据库底层的 `paymindId`。

### 环境变量关键配置
```bash
# 数据库
DB_HOST=agentrix-postgres
DB_USERNAME=agentrix
DB_PASSWORD=agentrix_password
DB_DATABASE=paymind
DB_SYNC=false  # 生产环境必须为 false

# AI 服务
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key
DEEPSEEK_API_KEY=your_key
AWS_BEARER_TOKEN_BEDROCK=your_token

# HQ Pilot
HQ_PORT=3005
```

### 监控要点
1. **服务健康**: 定期检查 `docker ps` 确认所有容器 healthy。
2. **日志分析**: OSL Pay 错误可忽略（外部服务），关注 TypeORM、NestJS 启动错误。
3. **数据库同步**: 生产环境 `DB_SYNC=false`，schema 变更需手动迁移。
4. **知识库更新**: 新增文件到 `backend/knowledge/` 后重启 HQ Pilot。
