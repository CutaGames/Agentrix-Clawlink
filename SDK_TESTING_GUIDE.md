# PayMind SDK 测试指南

## JavaScript/TypeScript SDK 测试

### 运行测试

```bash
cd sdk-js

# 安装依赖
npm install

# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行测试并生成覆盖率报告
npm run test:cov

# 监听模式
npm run test:watch
```

### 测试结构

```
sdk-js/tests/
├── setup.ts                    # 测试配置
├── utils/
│   ├── validation.test.ts      # 验证函数测试
│   └── errors.test.ts          # 错误处理测试
├── client.test.ts              # HTTP客户端测试
├── resources/
│   └── payments.test.ts        # 支付资源测试
└── integration/
    └── api.test.ts             # API集成测试
```

### 测试覆盖率目标

- 单元测试覆盖率: > 80%
- 集成测试: 覆盖主要API端点

---

## 与后端API对接验证

### 1. 启动后端服务

```bash
cd backend
npm run start:dev
```

确保后端服务运行在 `http://localhost:3001`

### 2. 设置环境变量

```bash
export PAYMIND_API_KEY="test-api-key"
export PAYMIND_API_URL="http://localhost:3001/api"
```

### 3. 运行集成测试

```bash
cd sdk-js
npm run test:integration
```

### 4. 手动验证

```typescript
import { PayMind } from './src';

const paymind = new PayMind({
  apiKey: 'test-api-key',
  baseUrl: 'http://localhost:3001/api',
});

// 测试支付路由
const routing = await paymind.payments.getRouting({
  amount: 100,
  currency: 'USD',
});

console.log('Routing:', routing);
```

---

## NPM 发布准备

### 1. 构建项目

```bash
cd sdk-js
npm run build
```

### 2. 运行测试

```bash
npm run test:unit
```

### 3. 检查发布文件

```bash
npm pack --dry-run
```

### 4. 发布到NPM

```bash
# 使用发布脚本
./publish.sh

# 或手动发布
npm publish --access public
```

### 发布前检查清单

- [ ] 所有测试通过
- [ ] 构建成功
- [ ] 版本号已更新
- [ ] CHANGELOG已更新
- [ ] README完整
- [ ] 类型定义完整

---

## Python SDK 测试

### 运行测试

```bash
cd sdk-python

# 安装依赖
pip install -r requirements-dev.txt

# 运行测试
pytest

# 运行测试并生成覆盖率
pytest --cov=paymind --cov-report=html
```

---

## React SDK 测试

### 运行测试

```bash
cd sdk-react

# 安装依赖
npm install

# 运行测试
npm test
```

---

## 持续集成

建议配置CI/CD流程：

1. **代码提交时**:
   - 运行lint检查
   - 运行单元测试

2. **Pull Request时**:
   - 运行所有测试
   - 检查测试覆盖率
   - 构建项目

3. **发布前**:
   - 运行完整测试套件
   - 构建所有版本
   - 验证发布包

