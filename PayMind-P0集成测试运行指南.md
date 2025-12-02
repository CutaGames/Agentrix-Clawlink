# PayMind P0集成测试运行指南

**创建日期**: 2025-01-XX

---

## 🚀 快速开始

### 运行所有集成测试
```bash
cd backend
npm run test:integration
```

### 运行特定测试文件
```bash
# 用户Agent测试
npm run test -- user-agent.integration.spec.ts

# 支付流程测试
npm run test -- payment-flow.integration.spec.ts
```

### 运行测试并查看详细输出
```bash
npm run test:integration -- --verbose
```

### 运行测试并查看覆盖率
```bash
npm run test:cov -- --testPathPattern=integration
```

---

## 📋 测试文件列表

### 1. 用户Agent集成测试
**文件**: `backend/src/test/integration/user-agent.integration.spec.ts`

**测试模块**:
- KYC复用（3个测试）
- 商家可信度（2个测试）
- 支付记忆（2个测试）
- 订阅管理（1个测试）
- 预算管理（3个测试）
- 交易分类（1个测试）

**总计**: 12个测试用例

### 2. 支付流程集成测试
**文件**: `backend/src/test/integration/payment-flow.integration.spec.ts`

**测试模块**:
- 手续费估算（5个测试）
- 风险评估（4个测试）
- QuickPay（1个占位测试）

**总计**: 10个测试用例

---

## ⚙️ 测试环境要求

### 1. 数据库配置
确保 `.env` 文件中包含数据库配置：
```env
DATABASE_URL=postgresql://user:password@localhost:5432/paymind_test
```

### 2. JWT配置
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

### 3. 其他配置
- 确保数据库已创建
- 确保数据库迁移已运行
- 确保服务可以正常启动

---

## 🔧 测试辅助函数

### 创建测试用户
```typescript
import { createTestUser } from '../helpers/test-setup.helper';

const testUser = await createTestUser(
  app,
  'test@example.com',  // 邮箱
  'password123',       // 密码
  ['user'],            // 角色
  KYCLevel.VERIFIED,   // KYC级别
  'verified'           // KYC状态
);
```

### 创建测试商家
```typescript
import { createTestMerchant } from '../helpers/test-setup.helper';

const testMerchant = await createTestMerchant(app, 'merchant@example.com');
```

### 使用认证请求
```typescript
import { authenticatedRequest } from '../helpers/test-setup.helper';

const response = await authenticatedRequest(app, testUser.authToken)
  .get('/api/user-agent/budgets')
  .expect(200);
```

---

## 📊 测试结果解读

### 成功示例
```
✓ should get KYC status (123ms)
✓ should check KYC reuse (45ms)
✓ should create budget (234ms)

Test Suites: 2 passed, 2 total
Tests:       22 passed, 22 total
```

### 失败示例
```
✗ should get KYC status (123ms)
  Expected: "verified"
  Received: "none"
```

---

## 🐛 常见问题

### 1. 数据库连接失败
**错误**: `Connection refused` 或 `ECONNREFUSED`

**解决方案**:
- 检查数据库是否运行
- 检查 `.env` 中的数据库配置
- 确保数据库已创建

### 2. 认证失败
**错误**: `401 Unauthorized` 或 `Invalid token`

**解决方案**:
- 检查 `JWT_SECRET` 配置
- 确保测试用户创建成功
- 检查token是否正确传递

### 3. 测试超时
**错误**: `Timeout - Async callback was not invoked`

**解决方案**:
- 增加测试超时时间（已在jest.config.js中设置为30秒）
- 检查数据库查询是否过慢
- 检查是否有死锁

### 4. 测试数据冲突
**错误**: `Unique constraint violation`

**解决方案**:
- 测试会自动清理数据
- 如果仍有问题，手动清理测试数据库
- 使用唯一的测试邮箱（已自动添加时间戳）

---

## 🔍 调试测试

### 1. 查看详细日志
```bash
npm run test:integration -- --verbose
```

### 2. 运行单个测试
```bash
npm run test -- -t "should create budget"
```

### 3. 调试模式
```bash
npm run test:debug -- --testPathPattern=integration
```

### 4. 查看测试覆盖率
```bash
npm run test:cov -- --testPathPattern=integration
```

---

## 📝 测试最佳实践

### 1. 测试隔离
- 每个测试应该独立运行
- 使用 `beforeAll` 和 `afterAll` 进行设置和清理
- 避免测试之间的依赖

### 2. 测试数据
- 使用唯一的测试数据（添加时间戳）
- 测试后自动清理数据
- 避免使用生产数据

### 3. 断言
- 使用明确的断言
- 验证所有重要的响应字段
- 检查边界情况

### 4. 错误处理
- 测试应该验证错误情况
- 使用适当的HTTP状态码断言
- 验证错误消息

---

## 🎯 下一步

1. **运行测试**: 执行 `npm run test:integration`
2. **检查结果**: 查看是否有失败的测试
3. **修复问题**: 根据测试结果修复bug
4. **完善测试**: 添加更多边界情况测试
5. **提高覆盖率**: 确保所有功能都有测试覆盖

---

## 📈 测试统计

- **总测试数**: 22个
- **测试文件**: 2个
- **测试辅助文件**: 1个
- **预计运行时间**: 30-60秒

---

**创建日期**: 2025-01-XX

