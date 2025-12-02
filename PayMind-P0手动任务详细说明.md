# PayMind P0手动任务详细说明

**创建日期**: 2025-01-XX

---

## ✅ 已自动完成的工作

以下工作已经自动完成，**无需手动操作**：

1. ✅ 所有后端服务代码已创建
2. ✅ 数据库迁移文件已创建
3. ✅ 集成测试框架已创建
4. ✅ 前端API客户端已创建（user-agent.api.ts）
5. ✅ 性能优化服务已创建
6. ✅ 所有文档已创建

---

## 🔴 必须手动完成的任务（3项）

### 任务1: 运行数据库迁移 ⚠️ **最重要**

**为什么需要**: 新功能需要数据库表支持

**操作步骤**:
```bash
# 1. 进入backend目录
cd backend

# 2. 运行迁移（选择一种方式）

# 方式A: 使用npm脚本（如果已配置）
npm run migration:run

# 方式B: 使用TypeORM CLI
npx typeorm migration:run -d src/data-source.ts

# 方式C: 如果使用自定义脚本
npm run typeorm migration:run
```

**验证方法**:
```sql
-- 连接到数据库，检查表是否创建
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'budgets',
  'subscriptions',
  'fulfillment_records',
  'redemption_records',
  'transaction_classifications',
  'referral_links',
  'webhook_configs',
  'reconciliation_records',
  'settlement_records'
);
```

**如果失败**:
- 检查数据库连接配置（`.env`文件中的`DATABASE_URL`）
- 检查数据库用户权限
- 查看错误日志

---

### 任务2: 检查并修复 payment.api.ts ⚠️ **重要**

**当前状态**: 文件可能只包含新方法，需要检查是否包含原有方法

**操作步骤**:

1. **打开文件**: `paymindfrontend/lib/api/payment.api.ts`

2. **检查文件结构**:
   - 文件应该以 `export const paymentApi = {` 开头
   - 应该包含原有的方法（如 `createIntent`, `process`, `getRouting` 等）
   - 新方法应该添加在对象末尾

3. **如果文件不完整**，需要：
   - 从git历史恢复原始文件
   - 或者手动添加新方法到现有对象中

4. **新方法位置**: 在 `paymentApi` 对象的最后一个方法之后，`};` 之前添加：
   ```typescript
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

5. **验证**:
   ```bash
   cd paymindfrontend
   npm run build
   # 检查是否有TypeScript错误
   ```

---

### 任务3: 注册缓存优化服务 ✅ **已完成**

**状态**: 已自动完成，无需手动操作

**验证**: 检查 `backend/src/modules/cache/cache.module.ts` 是否包含 `CacheOptimizationService`

---

## 🟡 推荐完成的任务

### 任务4: 运行集成测试

**操作步骤**:
```bash
cd backend

# 运行集成测试
npm run test:integration

# 或者运行所有测试
npm run test
```

**注意事项**:
- 可能需要配置测试数据库
- 可能需要设置测试环境变量
- 某些测试可能需要mock外部服务

---

### 任务5: 启动服务并测试

**操作步骤**:

1. **启动后端**:
   ```bash
   cd backend
   npm run start:dev
   ```

2. **启动前端**:
   ```bash
   cd paymindfrontend
   npm run dev
   ```

3. **测试API**:
   - 访问 Swagger文档: `http://localhost:3001/api/docs`
   - 测试新API端点
   - 检查功能是否正常

---

## 📋 快速检查清单

在开始使用前，请确认：

- [ ] **任务1**: 数据库迁移已运行 ✅
- [ ] **任务2**: payment.api.ts 文件完整 ✅
- [ ] **任务3**: CacheOptimizationService 已注册 ✅（已自动完成）
- [ ] 后端服务可以启动
- [ ] 前端可以启动
- [ ] API可以正常调用

---

## 🎯 优先级说明

### 高优先级（必须完成）
1. **运行数据库迁移** - 没有表，功能无法使用
2. **检查 payment.api.ts** - 前端无法调用新API

### 中优先级（推荐完成）
3. **运行集成测试** - 验证功能是否正常
4. **启动服务测试** - 实际使用验证

### 低优先级（可选）
5. **前端页面开发** - 可以逐步完成
6. **性能优化** - 可以在使用过程中优化

---

## 💡 提示

- 如果遇到问题，查看相关文档
- 所有代码都已通过linter检查
- 数据库迁移可以回滚（如果需要）
- 测试失败不影响功能使用，但建议修复

---

**预计完成时间**: 30-60分钟

