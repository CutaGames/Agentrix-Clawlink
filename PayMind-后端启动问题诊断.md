# PayMind 后端启动问题诊断

## 🔍 常见启动问题

### 问题1: 数据库连接失败

**症状**: 
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Unable to connect to the database
```

**解决方案**:
```bash
# 1. 检查PostgreSQL是否运行
pg_isready -h localhost -p 5432

# 2. 如果未运行，启动PostgreSQL
sudo service postgresql start

# 3. 检查数据库是否存在
sudo -u postgres psql -l | grep paymind

# 4. 如果不存在，创建数据库
sudo -u postgres psql
CREATE DATABASE paymind_db;
CREATE USER paymind WITH PASSWORD 'paymind_password';
GRANT ALL PRIVILEGES ON DATABASE paymind_db TO paymind;
\q
```

### 问题2: 模块导入错误

**症状**:
```
Nest can't resolve dependencies of the XXXService
```

**解决方案**:
- 检查模块导入顺序
- 确保所有依赖的服务都已正确导入到模块中
- 检查循环依赖

### 问题3: 端口被占用

**症状**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**解决方案**:
```bash
# 查找占用进程
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

### 问题4: 环境变量缺失

**症状**:
```
Configuration validation error
```

**解决方案**:
- 检查 `.env` 文件是否存在
- 检查必需的环境变量
- 使用默认值（如果配置了）

### 问题5: TypeScript编译错误

**症状**:
```
Type error: ...
```

**解决方案**:
```bash
# 查看详细错误
npm run build

# 修复类型错误后重新启动
```

---

## 🚀 快速诊断步骤

### 步骤1: 检查环境
```bash
# Node版本
node --version

# npm版本
npm --version

# PostgreSQL状态
pg_isready -h localhost -p 5432
```

### 步骤2: 检查依赖
```bash
cd backend
ls -la node_modules | head -5
```

### 步骤3: 尝试构建
```bash
cd backend
npm run build
```

### 步骤4: 检查配置
```bash
cd backend
ls -la .env
cat .env | grep -E "DB_|PORT" || echo "使用默认配置"
```

---

## 📋 完整启动检查清单

- [ ] Node.js已安装 (v18+)
- [ ] npm已安装
- [ ] PostgreSQL已安装并运行
- [ ] 数据库已创建
- [ ] 依赖已安装 (`npm install`)
- [ ] 端口3001未被占用
- [ ] 环境变量已配置（可选）
- [ ] TypeScript编译通过

---

## 🔧 最小化启动（绕过数据库）

如果只是想测试Swagger文档，可以临时禁用数据库：

**警告**: 这会导致所有数据库相关功能不可用！

修改 `backend/src/app.module.ts`:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 临时注释TypeORM
    // TypeOrmModule.forRootAsync({
    //   useClass: DatabaseConfig,
    // }),
    // ... 其他模块
  ],
})
```

**不推荐用于生产环境！**

---

## 📞 获取帮助

如果问题仍然存在，请提供：

1. **完整错误日志**（从 `npm run start:dev` 的输出）
2. **Node版本**: `node --version`
3. **PostgreSQL状态**: `pg_isready -h localhost -p 5432`
4. **端口检查**: `lsof -i :3001`
5. **构建结果**: `npm run build` 的输出

---

**最后更新**: 2024年1月

