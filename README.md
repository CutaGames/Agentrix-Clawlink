# PayMind V2.2

智能支付中间件与双向市场平台

---

## 🚀 快速开始

### 一键安装和配置

```bash
# 运行自动安装脚本
./setup.sh
```

这个脚本会自动：
- ✅ 检查Node.js版本
- ✅ 创建环境变量文件
- ✅ 安装所有依赖
- ✅ 生成JWT密钥

### 手动安装（如果需要）

如果自动脚本无法运行，可以手动执行：

```bash
# 1. 配置后端环境变量
cd backend
cp .env.example .env
# 编辑 .env 配置数据库连接

# 2. 配置前端环境变量
cd ../paymindfrontend
cp .env.local.example .env.local

# 3. 安装依赖
cd ../backend && npm install
cd ../paymindfrontend && npm install
```

---

## 🎯 启动服务

### 方式一：使用启动脚本（推荐）

```bash
./start-dev.sh
```

### 方式二：手动启动

```bash
# 终端1 - 启动后端
cd backend
npm run start:dev

# 终端2 - 启动前端
cd paymindfrontend
npm run dev
```

---

## 🌐 访问应用

- **前端**: http://localhost:3000
- **后端API**: http://localhost:3001/api
- **API文档**: http://localhost:3001/api/docs

---

## 📚 文档

- [快速启动指南](./QUICK_START.md) - 详细的启动步骤
- [浏览器测试指南](./BROWSER_TESTING.md) - 功能测试说明
- [测试指南](./TESTING_GUIDE.md) - 完整的测试文档
- [完成报告](./COMPLETION_REPORT.md) - 功能完成情况

---

## 🛠️ 项目结构

```
paymind-website/
├── backend/              # 后端服务 (NestJS)
├── paymindfrontend/     # 前端应用 (Next.js)
├── contract/            # 智能合约 (Hardhat)
├── setup.sh             # 自动安装脚本
├── start-dev.sh         # 启动脚本
└── stop-dev.sh          # 停止脚本
```

---

## ⚙️ 配置说明

### 必需配置

1. **数据库配置** (`backend/.env`)
   - 如果使用PostgreSQL，需要配置数据库连接
   - 开发环境可以使用 `synchronize: true` 自动创建表

2. **API URL** (`paymindfrontend/.env.local`)
   - 默认: `http://localhost:3001/api`

### 可选配置

- **Stripe支付**: 需要配置Stripe密钥
- **钱包连接**: 需要配置WalletConnect项目ID
- **合约功能**: 需要部署合约并配置地址

---

## 🧪 测试

### 浏览器测试

1. 启动服务后，访问 http://localhost:3000
2. 测试钱包连接功能
3. 测试支付流程（需要配置相应密钥）

详细测试说明请查看 [BROWSER_TESTING.md](./BROWSER_TESTING.md)

---

## 🐛 常见问题

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

### 依赖安装失败

```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install
```

### 数据库连接失败

检查 `backend/.env` 中的数据库配置是否正确。

---

## 📝 开发说明

### 后端开发

- 框架: NestJS
- 数据库: PostgreSQL (TypeORM)
- API文档: Swagger (自动生成)

### 前端开发

- 框架: Next.js 13
- UI: Tailwind CSS
- 状态管理: React Context API

### 合约开发

- 框架: Hardhat
- 语言: Solidity 0.8.20

---

## 📄 许可证

MIT

---

## 👥 贡献

欢迎提交Issue和Pull Request！

---

**祝您使用愉快！** 🎉


