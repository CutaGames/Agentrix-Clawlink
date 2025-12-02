# PayMind P0必须手动完成的任务

**创建日期**: 2025-01-XX  
**预计时间**: 30-60分钟

---

## 🔴 必须手动完成的任务（2项）

### ✅ 任务1: 运行数据库迁移 ⚠️ **最重要**

**为什么**: 新功能需要数据库表支持，没有表功能无法使用

**操作步骤**:
```bash
# 1. 进入backend目录
cd backend

# 2. 运行迁移（选择一种方式）

# 方式A: 使用npm脚本
npm run migration:run

# 方式B: 使用TypeORM CLI
npx typeorm migration:run -d src/data-source.ts

# 方式C: 查看package.json中的迁移脚本
npm run typeorm migration:run
```

**验证**:
```sql
-- 连接到PostgreSQL数据库，执行以下SQL检查表是否创建
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
- 检查 `.env` 文件中的 `DATABASE_URL` 配置
- 检查数据库用户是否有创建表的权限
- 查看控制台错误信息

---

### ⚠️ 任务2: 检查 payment.api.ts 文件

**为什么**: 文件可能只包含新方法，需要确认是否包含原有方法

**操作步骤**:

1. **打开文件**: `paymindfrontend/lib/api/payment.api.ts`

2. **检查文件是否完整**:
   - 文件应该以 `import` 语句开头
   - 应该有接口定义（如 `PaymentInfo`, `ProcessPaymentDto` 等）
   - 应该有 `export const paymentApi = {` 开头
   - 应该包含原有的方法（如 `createIntent`, `process`, `getRouting` 等）
   - 新方法（`estimateFee`, `compareCosts`, `assessRisk`）应该在对象末尾

3. **如果文件不完整**（只有新方法）:
   
   **选项A: 从git恢复**
   ```bash
   cd paymindfrontend
   git checkout HEAD -- lib/api/payment.api.ts
   # 然后手动添加新方法
   ```

   **选项B: 手动添加新方法**
   - 找到 `paymentApi` 对象的最后一个方法
   - 在 `};` 之前添加以下三个方法：

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

4. **验证**:
   ```bash
   cd paymindfrontend
   npm run build
   # 检查是否有TypeScript编译错误
   ```

---

## ✅ 已自动完成（无需操作）

以下工作已经自动完成：

1. ✅ **CacheOptimizationService 已注册** - `backend/src/modules/cache/cache.module.ts` 已更新
2. ✅ **所有后端服务代码** - 17个新服务文件已创建
3. ✅ **数据库迁移文件** - 已创建，等待运行
4. ✅ **前端API客户端** - `user-agent.api.ts` 已创建
5. ✅ **集成测试框架** - 测试文件已创建

---

## 🟡 推荐完成的任务（可选）

### 任务3: 运行集成测试

```bash
cd backend
npm run test:integration
```

### 任务4: 启动服务测试

```bash
# 后端
cd backend
npm run start:dev

# 前端（新终端）
cd paymindfrontend
npm run dev
```

---

## 📋 快速检查清单

完成前两个任务后，检查：

- [ ] 数据库迁移已运行，9个新表已创建
- [ ] payment.api.ts 文件完整，包含所有方法
- [ ] TypeScript编译无错误
- [ ] 后端服务可以启动
- [ ] 前端可以启动

---

## 💡 提示

1. **数据库迁移最重要** - 没有表，所有新功能都无法使用
2. **payment.api.ts** - 如果文件被覆盖，从git恢复后手动添加新方法
3. **遇到问题** - 查看错误日志，检查配置

---

**预计完成时间**: 30-60分钟  
**优先级**: 任务1 > 任务2 > 其他

