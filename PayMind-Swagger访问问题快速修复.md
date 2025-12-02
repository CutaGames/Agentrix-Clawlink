# PayMind Swagger 访问问题快速修复

## 🔍 问题

`http://localhost:3001/api/docs` 无法打开

## ✅ 解决方案

### 最可能的原因：后端服务未运行

### 快速修复步骤

#### 1. 检查服务是否运行

在WSL终端中运行：
```bash
# 检查端口3001
lsof -i :3001
```

如果**没有输出**，说明服务未运行。

#### 2. 启动后端服务

```bash
cd backend
npm run start:dev
```

#### 3. 等待启动完成

等待30-60秒，看到以下输出表示启动成功：
```
🚀 PayMind Backend is running on: http://0.0.0.0:3001
📚 API Documentation: http://0.0.0.0:3001/api/docs
```

#### 4. 验证访问

在浏览器中打开：
- http://localhost:3001/api/docs

---

## 🐛 其他可能的问题

### 问题1: 端口被占用

**解决**:
```bash
# 查找并杀死占用端口的进程
lsof -i :3001
kill -9 <PID>
```

### 问题2: 依赖缺失

**解决**:
```bash
cd backend
npm install
```

### 问题3: 数据库连接失败

**解决**:
```bash
# 检查PostgreSQL
pg_isready -h localhost -p 5432

# 如果未运行，启动PostgreSQL
sudo service postgresql start
```

---

## 📋 一键启动

使用提供的启动脚本：
```bash
chmod +x start-backend.sh
./start-backend.sh
```

---

## ✅ 验证清单

- [ ] 后端服务正在运行
- [ ] 端口3001被监听
- [ ] 可以访问 http://localhost:3001/api
- [ ] 可以访问 http://localhost:3001/api/docs

---

**如果问题仍然存在，请提供后端启动日志。**

