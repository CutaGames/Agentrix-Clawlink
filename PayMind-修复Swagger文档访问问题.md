# PayMind 修复 Swagger 文档访问问题

## 🔍 问题诊断

`http://localhost:3001/api/docs` 无法访问的可能原因：

1. **后端服务未运行** - 最常见
2. **端口3001被其他程序占用**
3. **服务启动失败** - 编译错误或运行时错误
4. **Swagger配置问题** - 已检查，配置正确

---

## ✅ 快速修复步骤

### 步骤1: 检查后端服务状态

在WSL中运行：
```bash
bash 检查后端服务状态.sh
```

或手动检查：
```bash
# 检查端口
lsof -i :3001
# 或
netstat -ano | grep :3001

# 测试API
curl http://localhost:3001/api
curl http://localhost:3001/api/docs
```

### 步骤2: 启动后端服务

如果服务未运行：

```bash
cd backend

# 检查依赖
npm install

# 启动开发服务器
npm run start:dev
```

### 步骤3: 等待服务启动

NestJS需要时间编译，等待30-60秒后检查：

```bash
# 检查启动日志，应该看到：
# 🚀 PayMind Backend is running on: http://0.0.0.0:3001
# 📚 API Documentation: http://0.0.0.0:3001/api/docs
```

### 步骤4: 验证访问

在浏览器中打开：
- **API文档**: http://localhost:3001/api/docs
- **API根路径**: http://localhost:3001/api

---

## 🐛 常见问题解决

### 问题1: 端口被占用

**错误**: `EADDRINUSE: address already in use :::3001`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3001
# 或
netstat -ano | grep :3001

# 杀死进程（替换<PID>为实际进程ID）
kill -9 <PID>

# 或使用不同端口
PORT=3002 npm run start:dev
```

### 问题2: 编译错误

**错误**: TypeScript编译失败

**解决**:
```bash
cd backend
npm run build
# 查看具体错误信息
```

### 问题3: 数据库连接失败

**错误**: `Unable to connect to the database`

**解决**:
```bash
# 检查PostgreSQL是否运行
pg_isready -h localhost -p 5432

# 检查数据库配置
cat backend/.env | grep DB_
```

### 问题4: 依赖缺失

**错误**: `Cannot find module '@nestjs/swagger'`

**解决**:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

---

## 🔧 Swagger配置验证

Swagger配置在 `backend/src/main.ts` 中：

```typescript
// Swagger documentation
const config = new DocumentBuilder()
  .setTitle('PayMind API')
  .setDescription('PayMind V2.2 API Documentation')
  .setVersion('2.2.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

**配置正确** ✅ - 路径应该是 `http://localhost:3001/api/docs`

---

## 📋 完整启动流程

### 1. 环境准备
```bash
# 确保在项目根目录
cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website

# 进入后端目录
cd backend
```

### 2. 安装依赖（如果需要）
```bash
npm install
```

### 3. 检查环境变量
```bash
# 检查.env文件
cat .env | grep -E "PORT|HOST|DB_"
```

### 4. 启动服务
```bash
npm run start:dev
```

### 5. 等待启动完成
查看控制台输出，应该看到：
```
🚀 PayMind Backend is running on: http://0.0.0.0:3001
📚 API Documentation: http://0.0.0.0:3001/api/docs
```

### 6. 验证访问
- 浏览器打开: http://localhost:3001/api/docs
- 或使用curl: `curl http://localhost:3001/api/docs`

---

## 🚀 一键启动脚本

创建 `start-backend.sh`:

```bash
#!/bin/bash
cd backend
npm run start:dev
```

运行：
```bash
chmod +x start-backend.sh
./start-backend.sh
```

---

## 📞 如果问题仍然存在

### 收集诊断信息

1. **检查服务日志**
   ```bash
   cd backend
   npm run start:dev 2>&1 | tee backend.log
   ```

2. **检查端口占用**
   ```bash
   lsof -i :3001
   ```

3. **测试网络连接**
   ```bash
   curl -v http://localhost:3001/api
   curl -v http://localhost:3001/api/docs
   ```

4. **检查防火墙**
   ```bash
   # WSL2可能需要端口转发
   # Windows防火墙可能阻止访问
   ```

### 提供以下信息以便进一步诊断：

1. 后端启动日志（完整输出）
2. 端口检查结果
3. curl测试结果
4. 浏览器控制台错误（如果有）

---

**最后更新**: 2024年1月

