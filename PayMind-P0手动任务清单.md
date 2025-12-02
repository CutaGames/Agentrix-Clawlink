# PayMind P0手动任务清单

**创建日期**: 2025-01-XX  
**优先级**: 按顺序完成

---

## 🔴 必须手动完成的任务

### 1. 运行数据库迁移 ⚠️ **重要**

**任务**: 执行数据库迁移，创建新表

**步骤**:
```bash
# 1. 进入backend目录
cd backend

# 2. 检查迁移文件是否存在
ls src/migrations/1766000000000-AddP0FeatureTables.ts

# 3. 运行迁移
npm run migration:run

# 或者使用TypeORM CLI
npx typeorm migration:run -d src/data-source.ts
```

**验证**:
- 检查数据库中是否创建了9个新表
- 检查索引是否创建成功
- 检查外键关系是否正确

**如果失败**:
- 检查数据库连接配置
- 检查迁移文件语法
- 查看错误日志

---

### 2. 合并 payment.api.ts 文件 ⚠️ **重要**

**任务**: 将新的API方法添加到现有的 `paymentApi` 对象中

**文件位置**: `paymindfrontend/lib/api/payment.api.ts`

**需要添加的方法**:
```typescript
// 在 paymentApi 对象中添加以下三个方法（在最后一个方法之后，} 之前）

/**
 * 估算手续费
 */
estimateFee: async (params: {
  amount: number;
  currency: string;
  paymentMethod: string;
  chain?: string;
  isCrossBorder?: boolean;
  userCountry?: string;
  merchantCountry?: string;
}): Promise<any> => {
  const queryParams = new URLSearchParams({
    amount: params.amount.toString(),
    currency: params.currency,
    paymentMethod: params.paymentMethod,
    ...(params.chain && { chain: params.chain }),
    ...(params.isCrossBorder !== undefined && { isCrossBorder: params.isCrossBorder.toString() }),
    ...(params.userCountry && { userCountry: params.userCountry }),
    ...(params.merchantCountry && { merchantCountry: params.merchantCountry }),
  });
  return apiClient.get(`/payments/estimate-fees?${queryParams}`);
},

/**
 * 对比所有支付方式成本
 */
compareCosts: async (params: {
  amount: number;
  currency?: string;
  chain?: string;
  targetCurrency?: string;
}): Promise<any[]> => {
  const queryParams = new URLSearchParams({
    amount: params.amount.toString(),
    currency: params.currency || 'USD',
    ...(params.chain && { chain: params.chain }),
    ...(params.targetCurrency && { targetCurrency: params.targetCurrency }),
  });
  return apiClient.get(`/payments/compare-costs?${queryParams}`);
},

/**
 * 评估交易风险
 */
assessRisk: async (params: {
  amount: number;
  paymentMethod: string;
  metadata?: any;
}): Promise<any> => {
  return apiClient.post('/payments/assess-risk', params);
},
```

**验证**:
- 检查文件语法是否正确
- 确保没有重复的方法名
- 运行 `npm run build` 检查TypeScript错误

---

### 3. 注册缓存优化服务 ⚠️ **重要**

**任务**: 将 `CacheOptimizationService` 注册到模块中

**文件位置**: `backend/src/modules/cache/cache.module.ts`

**需要添加**:
```typescript
import { CacheOptimizationService } from './cache-optimization.service';

@Module({
  // ... existing imports
  providers: [
    CacheService,
    CacheOptimizationService, // 添加这一行
  ],
  exports: [
    CacheService,
    CacheOptimizationService, // 添加这一行
  ],
})
export class CacheModule {}
```

**验证**:
- 检查模块是否正确导入
- 确保服务可以被其他模块使用

---

### 4. 运行集成测试 ⚠️ **重要**

**任务**: 运行集成测试，检查功能是否正常

**步骤**:
```bash
# 1. 进入backend目录
cd backend

# 2. 运行集成测试
npm run test:integration

# 或者运行所有测试
npm run test
```

**注意事项**:
- 测试可能需要配置测试数据库
- 可能需要设置环境变量
- 某些测试可能需要mock外部服务

**如果测试失败**:
- 查看测试日志
- 检查测试配置
- 修复发现的bug

---

## 🟡 可选但推荐的任务

### 5. 检查依赖和配置

**任务**: 确保所有必要的依赖已安装

**步骤**:
```bash
# backend
cd backend
npm install

# frontend
cd ../paymindfrontend
npm install
```

**检查项**:
- [ ] 所有依赖都已安装
- [ ] 没有版本冲突
- [ ] 环境变量已配置

---

### 6. 更新环境变量配置

**任务**: 检查并更新 `.env` 文件

**需要检查的变量**:
```env
# 数据库配置
DATABASE_URL=...

# Redis配置（如果使用）
REDIS_URL=...

# API配置
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

### 7. 前端页面开发（按需）

**任务**: 开发前端页面（参考 `PayMind-P0前端开发指南.md`）

**优先级页面**:
1. 预算管理页面 (`pages/app/user/budgets.tsx`)
2. 订阅管理页面增强 (`pages/app/user/subscriptions.tsx`)
3. 支付流程增强（手续费展示、风险提示）

**其他页面**:
- 交易分类页面
- 商家可信度展示
- Webhook配置页面增强
- 发货管理页面
- 多链账户页面
- 对账页面
- 结算配置页面

---

## 📋 快速检查清单

在开始测试前，请确认：

- [ ] 数据库迁移已运行
- [ ] payment.api.ts 已合并新方法
- [ ] CacheOptimizationService 已注册
- [ ] 所有依赖已安装
- [ ] 环境变量已配置
- [ ] 后端服务可以启动
- [ ] 前端可以启动
- [ ] 集成测试可以运行

---

## 🚨 常见问题

### Q1: 数据库迁移失败
**A**: 检查数据库连接，确保数据库用户有创建表的权限

### Q2: TypeScript编译错误
**A**: 检查类型定义，确保所有导入正确

### Q3: 测试失败
**A**: 检查测试配置，确保测试数据库已配置

### Q4: API调用失败
**A**: 检查后端服务是否启动，API路径是否正确

---

## 📞 需要帮助？

如果遇到问题：
1. 查看相关文档
2. 检查错误日志
3. 查看代码注释
4. 参考测试用例

---

**完成日期**: TBD  
**预计时间**: 1-2小时

