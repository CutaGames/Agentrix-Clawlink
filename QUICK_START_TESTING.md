# 🚀 快速开始 - 自动化测试

## 一键运行所有测试

```bash
./test-all.sh
```

这个命令会自动：
1. ✅ 检查依赖
2. ✅ 安装测试包
3. ✅ 启动前端服务
4. ✅ 运行E2E测试（浏览器自动化）
5. ✅ 运行API测试
6. ✅ 运行SDK测试
7. ✅ 检查交付物
8. ✅ 生成统一测试报告

---

## 📋 测试前准备

### 1. 安装依赖

```bash
# 安装根目录测试依赖
npm install

# 安装前端依赖（如果未安装）
cd paymindfrontend && npm install && cd ..

# 安装SDK依赖（如果未安装）
cd sdk-js && npm install && cd ..
```

### 2. 启动后端服务

```bash
cd backend
npm run start:dev
```

确保后端服务运行在 `http://localhost:3001`

### 3. 配置环境变量（可选）

创建 `.env.test` 文件：

```env
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001/api
PAYMIND_API_KEY=your-test-api-key
TEST_EMAIL=test@example.com
TEST_PASSWORD=test123456
```

---

## 🎯 运行特定测试

### 只运行E2E测试

```bash
npm run test:e2e
# 或
npx playwright test
```

### 只运行API测试

```bash
npm run test:api
# 或
cd tests/api && jest
```

### 只运行SDK测试

```bash
npm run test:sdk
# 或
cd tests/sdk && jest
```

### 运行特定测试文件

```bash
# E2E测试
npx playwright test tests/e2e/payment.spec.ts

# API测试
cd tests/api && jest payment.api.test.ts
```

---

## 📊 查看测试报告

### 统一测试报告

测试完成后，打开：
```
tests/reports/test-report-*.html
```

### E2E测试报告

```bash
npm run test:report
# 或
npx playwright show-report tests/reports/e2e-html
```

### API测试报告

打开浏览器访问：
```
tests/reports/api-html/report.html
```

---

## 🐛 调试测试

### 调试E2E测试

```bash
# 使用Playwright Inspector（推荐）
npx playwright test --debug

# 在浏览器中运行（可见）
npx playwright test --headed

# 慢速执行
npx playwright test --slow-mo=1000
```

### 调试API测试

在测试代码中使用：
```typescript
console.log('调试信息')
debugger // 在Node.js调试器中暂停
```

---

## 📈 测试覆盖范围

### ✅ E2E测试覆盖
- 用户认证（登录/注册）
- 支付流程（Stripe、加密货币、X402、跨境）
- 26个新功能页面
- 商户管理功能
- Agent管理功能
- 用户中心功能

### ✅ API测试覆盖
- 支付API
- 商户API
- Agent API
- 市场API

### ✅ SDK测试覆盖
- JavaScript/TypeScript SDK
- Python SDK（待实现）
- React SDK（待实现）

### ✅ 交付物检查
- README文档
- SDK构建产物
- 示例代码
- 文档完整性

---

## ⚠️ 常见问题

### 问题1: 后端服务未启动
**解决**: 确保后端服务在 `http://localhost:3001` 运行

### 问题2: 前端服务未启动
**解决**: Playwright会自动启动前端服务，或手动运行 `cd paymindfrontend && npm run dev`

### 问题3: 测试失败但功能正常
**解决**: 
- 检查选择器是否正确
- 增加等待时间
- 查看截图和视频（在 `tests/reports/screenshots/`）

### 问题4: 依赖安装失败
**解决**: 
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 更多信息

- 详细测试指南: [AUTOMATED_TESTING_GUIDE.md](./AUTOMATED_TESTING_GUIDE.md)
- 测试架构设计: [TESTING_ARCHITECTURE.md](./TESTING_ARCHITECTURE.md)

---

**🎉 开始测试吧！运行 `./test-all.sh` 即可！**

