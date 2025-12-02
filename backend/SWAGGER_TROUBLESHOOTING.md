# Swagger API 文档访问故障排除

## 问题：无法访问 http://localhost:3001/api/docs

### 检查步骤

#### 1. 确认后端服务是否运行

```bash
# 检查端口 3001 是否被占用
netstat -ano | findstr :3001  # Windows
# 或
lsof -i :3001  # Linux/Mac
```

#### 2. 检查后端启动日志

后端启动成功应该看到：
```
🚀 PayMind Backend is running on: http://0.0.0.0:3001
📚 API Documentation: http://0.0.0.0:3001/api/docs
```

如果看到数据库连接错误，需要先修复数据库问题。

#### 3. 修复数据库问题（如果存在）

如果看到 `column "userId" of relation "agent_sessions" contains null values` 错误：

**方法 1：运行迁移**
```bash
cd backend
npm run migration:run
```

**方法 2：手动执行 SQL**
```sql
-- 删除 userId 为 NULL 的记录
DELETE FROM agent_sessions WHERE "userId" IS NULL;

-- 删除外键约束（如果存在）
ALTER TABLE agent_sessions DROP CONSTRAINT IF EXISTS "FK_40a6b0600d60c067ae0f8659ce0";

-- 将 userId 设置为 NOT NULL
ALTER TABLE agent_sessions ALTER COLUMN "userId" SET NOT NULL;
```

#### 4. 启动后端服务

```bash
cd backend
npm run start:dev
```

#### 5. 访问 Swagger 文档

- 本地访问：http://localhost:3001/api/docs
- 网络访问：http://0.0.0.0:3001/api/docs（如果 HOST=0.0.0.0）

### 常见问题

#### 问题 1：端口被占用
**解决方案**：更改端口或停止占用端口的进程
```bash
# 在 .env 文件中设置
PORT=3002
```

#### 问题 2：CORS 错误
**解决方案**：检查 `CORS_ORIGIN` 环境变量
```bash
# 在 .env 文件中设置
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

#### 问题 3：Swagger 页面空白
**解决方案**：清除浏览器缓存或使用无痕模式

#### 问题 4：404 Not Found
**解决方案**：
- 确认后端服务正在运行
- 确认访问的 URL 正确：`http://localhost:3001/api/docs`
- 检查 `app.setGlobalPrefix('api')` 配置

### V7.0 新增 API 标签

Swagger 文档现在包含以下 V7.0 相关标签：
- `payment` - Pre-Flight Check 和支付路由
- `relayer` - Relayer 服务和 QuickPay
- `sessions` - ERC-8004 Session 管理

### 验证 Swagger 配置

如果 Swagger 仍然无法访问，可以检查：

1. **检查 Swagger 模块是否正确导入**
   ```typescript
   // main.ts 中应该有
   import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
   ```

2. **检查 Swagger 设置**
   ```typescript
   SwaggerModule.setup('api/docs', app, document);
   ```

3. **检查包版本**
   ```bash
   npm list @nestjs/swagger
   ```
   应该显示 `@nestjs/swagger@^7.0.0`

### 测试 API 端点

如果 Swagger 无法访问，可以直接测试 API：

```bash
# 测试健康检查
curl http://localhost:3001/api

# 测试 Pre-Flight Check（需要认证）
curl -X GET "http://localhost:3001/api/payment/preflight?amount=10&currency=USDC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 联系支持

如果以上步骤都无法解决问题，请检查：
1. 后端控制台是否有错误信息
2. 浏览器控制台是否有错误
3. 网络请求是否被拦截

