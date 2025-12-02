# PayMind P0数据库迁移完成报告

**完成日期**: 2025-01-XX  
**迁移文件**: `1766000000000-AddP0FeatureTables.ts`

---

## ✅ 已创建的表

### 1. budgets（预算管理）
- **用途**: 存储用户预算设置和使用情况
- **关键字段**: userId, category, amount, period, spent, remaining, status
- **索引**: userId, status

### 2. subscriptions（订阅识别）
- **用途**: 存储识别出的订阅交易
- **关键字段**: userId, merchantId, amount, interval, nextBillingDate, status
- **索引**: userId, merchantId, status

### 3. fulfillment_records（发货记录）
- **用途**: 存储自动发货记录
- **关键字段**: orderId, paymentId, merchantId, type, status, trackingNumber
- **索引**: orderId, paymentId, merchantId

### 4. redemption_records（核销记录）
- **用途**: 存储自动核销记录（会员卡、充值等）
- **关键字段**: paymentId, orderId, merchantId, type, status
- **索引**: paymentId, merchantId

### 5. transaction_classifications（交易分类）
- **用途**: 存储交易分类结果
- **关键字段**: paymentId, category, subcategory, confidence, method
- **索引**: paymentId, category

### 6. referral_links（推广链接）
- **用途**: 存储推广链接和统计
- **关键字段**: agentId, merchantId, link, clicks, conversions
- **索引**: agentId

### 7. webhook_configs（Webhook配置）
- **用途**: 存储商户Webhook配置
- **关键字段**: merchantId, url, events, secret, retryCount, timeout
- **索引**: merchantId

### 8. reconciliation_records（对账记录）
- **用途**: 存储自动对账记录
- **关键字段**: merchantId, date, type, totalAmount, matchedCount, differences
- **索引**: merchantId, date

### 9. settlement_records（结算记录）
- **用途**: 存储结算记录
- **关键字段**: merchantId, period, amount, currency, status, transactionHash
- **索引**: merchantId, status

---

## 🔗 外键关系

- `budgets.userId` → `users.id` (CASCADE)
- `subscriptions.userId` → `users.id` (CASCADE)
- `fulfillment_records.orderId` → `orders.id` (SET NULL)
- `fulfillment_records.paymentId` → `payments.id` (SET NULL)
- `transaction_classifications.paymentId` → `payments.id` (CASCADE)

---

## 📊 表统计

| 表名 | 字段数 | 索引数 | 外键数 |
|------|--------|--------|--------|
| budgets | 12 | 2 | 1 |
| subscriptions | 11 | 3 | 1 |
| fulfillment_records | 11 | 3 | 2 |
| redemption_records | 9 | 2 | 0 |
| transaction_classifications | 7 | 2 | 1 |
| referral_links | 8 | 1 | 0 |
| webhook_configs | 10 | 1 | 0 |
| reconciliation_records | 11 | 2 | 0 |
| settlement_records | 10 | 2 | 0 |
| **总计** | **89** | **18** | **5** |

---

## 🚀 运行迁移

```bash
# 运行迁移
npm run migration:run

# 回滚迁移（如果需要）
npm run migration:revert
```

---

## ⚠️ 注意事项

1. **数据备份**: 运行迁移前请备份数据库
2. **测试环境**: 先在测试环境运行迁移
3. **索引性能**: 所有关键查询字段都已创建索引
4. **外键约束**: 注意外键的删除行为（CASCADE vs SET NULL）

---

**完成日期**: 2025-01-XX  
**审查状态**: ⏳ 待审查

