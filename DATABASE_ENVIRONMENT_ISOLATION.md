# 数据库环境隔离方案

## 问题分析

当前项目存在开发环境和生产环境数据库混用的风险：

1. **单一数据库名称**: 开发和生产环境使用相同的默认数据库名 `agentrix`
2. **缺少环境标识**: 没有明确的环境隔离机制
3. **同步风险**: `DB_SYNC=true` 在开发环境可能意外修改生产数据结构

## 推荐隔离方案

### 方案 1: 数据库名称隔离（推荐）

为不同环境使用不同的数据库名称：

```bash
# 开发环境 (.env.development)
DB_DATABASE=agentrix_dev
DB_SYNC=true

# 测试环境 (.env.test)
DB_DATABASE=agentrix_test
DB_SYNC=true

# 生产环境 (.env.production)
DB_DATABASE=agentrix_prod
DB_SYNC=false
```

### 方案 2: 完全独立的数据库服务器

```bash
# 开发环境
DB_HOST=localhost
DB_DATABASE=agentrix

# 生产环境
DB_HOST=prod-db.agentrix.com
DB_DATABASE=agentrix
```

### 方案 3: Docker Compose 多环境配置

创建独立的 compose 文件：

```
docker-compose.yml          # 基础配置
docker-compose.dev.yml      # 开发环境覆盖
docker-compose.prod.yml     # 生产环境覆盖
```

## 实施步骤

### 1. 创建环境特定的配置文件

```bash
# backend/.env.development
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=agentrix_dev
DB_PASSWORD=dev_password_here
DB_DATABASE=agentrix_dev
DB_SYNC=true
DB_SSL=false

# backend/.env.production
NODE_ENV=production
DB_HOST=${PROD_DB_HOST}
DB_PORT=5432
DB_USERNAME=${PROD_DB_USER}
DB_PASSWORD=${PROD_DB_PASSWORD}
DB_DATABASE=agentrix_prod
DB_SYNC=false
DB_SSL=true
```

### 2. 修改数据库配置加载逻辑

在 `backend/src/config/database.config.ts` 中添加环境验证：

```typescript
createTypeOrmOptions(): TypeOrmModuleOptions {
  const nodeEnv = this.configService.get('NODE_ENV', 'development');
  const dbName = this.configService.get('DB_DATABASE', 'agentrix');
  
  // 安全检查：生产环境禁止使用开发数据库
  if (nodeEnv === 'production' && dbName.includes('_dev')) {
    throw new Error('Production environment cannot use development database!');
  }
  
  // 安全检查：生产环境禁止自动同步
  const shouldSync = this.configService.get('DB_SYNC') === 'true' && nodeEnv !== 'production';
  
  console.log(`[Database] Environment: ${nodeEnv}, Database: ${dbName}, Sync: ${shouldSync}`);
  
  return {
    // ... existing config
    synchronize: shouldSync,
  };
}
```

### 3. 创建开发环境数据库

```sql
-- 在 PostgreSQL 中创建开发数据库
CREATE DATABASE agentrix_dev;
CREATE USER agentrix_dev WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE agentrix_dev TO agentrix_dev;
```

### 4. 更新 Docker Compose

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  postgres:
    environment:
      POSTGRES_DB: agentrix_dev
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

volumes:
  postgres_dev_data:
```

### 5. 添加启动脚本

```bash
# scripts/start-dev.sh
#!/bin/bash
export NODE_ENV=development
cp backend/.env.development backend/.env
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# scripts/start-prod.sh
#!/bin/bash
export NODE_ENV=production
# 生产环境从安全的配置管理系统加载 .env
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 数据迁移注意事项

1. **开发数据初始化**: 创建种子数据脚本用于开发环境
2. **生产数据备份**: 定期备份生产数据库
3. **迁移测试**: 在开发环境测试所有数据库迁移后再应用到生产

## 环境变量检查清单

| 变量 | 开发环境 | 生产环境 |
|------|----------|----------|
| NODE_ENV | development | production |
| DB_DATABASE | agentrix_dev | agentrix_prod |
| DB_SYNC | true | **false** |
| DB_SSL | false | true |
| DB_HOST | localhost | prod-db-host |

## 验证命令

```bash
# 检查当前连接的数据库
psql -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE -c "SELECT current_database();"

# 检查环境变量
echo "NODE_ENV=$NODE_ENV, DB_DATABASE=$DB_DATABASE"
```

## 紧急回滚

如果意外连接到错误的数据库：

1. 立即停止所有服务
2. 检查最近的数据库操作日志
3. 从备份恢复（如有必要）
4. 修正环境配置后重启
