# Agentrix 优化支付流程分析

## 一、支付场景分类

### 1. 境内支付（法币直接支付）
- 使用场景：同一国家内支付
- 支付方式：Stripe、Google Pay、Apple Pay、Visa/Mastercard
- 特点：手续费低、到账快

### 2. 跨境支付（法币→数字货币→结算）
- 使用场景：跨境交易
- 流程：法币 → Provider转换 → 数字货币 → 点对点结算 → (可选)数字货币→法币
- Provider聚合：OKPay、MoonPay、Binance Pay、Alchemy Pay等

### 3. 数字货币支付
- 普通支付：直接转账
- X402协议支付：批量压缩、低Gas费
- Agent代付：Agent代为支付，用户后续还款

### 4. 托管交易
- 货到付款模式
- 分润支持（如1%分成）

