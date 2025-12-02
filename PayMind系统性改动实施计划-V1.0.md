# PayMind 系统性改动实施计划 V1.0
## 支付、Marketplace、联盟等模块系统改动详细计划

**版本**: 1.0  
**日期**: 2025年1月  
**状态**: 准备实施

---

## 📋 目录

1. [改动总览](#1-改动总览)
2. [数据库改动](#2-数据库改动)
3. [后端改动](#3-后端改动)
4. [合约改动](#4-合约改动)
5. [API改动](#5-api改动)
6. [SDK改动](#6-sdk改动)
7. [前端改动（系统相关）](#7-前端改动系统相关)
8. [测试计划](#8-测试计划)
9. [实施时间表](#9-实施时间表)
10. [验收标准](#10-验收标准)

---

## 1. 改动总览

### 1.1 改动范围

**核心模块**：
- ✅ 支付模块（Payment）
- ✅ 佣金模块（Commission）
- ✅ 智能路由模块（Smart Router）
- ✅ Marketplace模块
- ✅ 定价模块（Pricing）
- ✅ 税费模块（Tax）
- ✅ 联盟模块（Alliance）

**影响范围**：
- 数据库：新增/修改表结构
- 后端：新增/修改服务、控制器、DTO
- 合约：新增/修改智能合约
- API：新增/修改API接口
- SDK：新增/修改SDK方法
- 前端：修改支付流程、价格显示等

### 1.2 改动原则

1. **向后兼容**：保持旧API可用，使用版本控制
2. **渐进式迁移**：分阶段实施，降低风险
3. **充分测试**：每个改动都要有测试覆盖
4. **文档更新**：及时更新API文档和SDK文档

---

## 2. 数据库改动

### 2.1 新增表

#### 2.1.1 产品价格表

**表名**：`product_prices`

**字段**：
```sql
CREATE TABLE product_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  base_price DECIMAL(18, 2) NOT NULL,
  base_currency VARCHAR(3) NOT NULL,
  tax_included BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id)
);

CREATE INDEX idx_product_prices_product_id ON product_prices(product_id);
```

**迁移文件**：`1764000000500-CreateProductPrices.ts`

---

#### 2.1.2 国家价格表

**表名**：`product_country_prices`

**字段**：
```sql
CREATE TABLE product_country_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL,
  price DECIMAL(18, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  tax_included BOOLEAN DEFAULT TRUE,
  tax_rate DECIMAL(5, 4),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, country_code)
);

CREATE INDEX idx_product_country_prices_product_id ON product_country_prices(product_id);
CREATE INDEX idx_product_country_prices_country ON product_country_prices(country_code);
```

**迁移文件**：`1764000000600-CreateProductCountryPrices.ts`

---

#### 2.1.3 区域价格表

**表名**：`product_region_prices`

**字段**：
```sql
CREATE TABLE product_region_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  region_code VARCHAR(10) NOT NULL,
  price DECIMAL(18, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  tax_included BOOLEAN DEFAULT TRUE,
  tax_rate DECIMAL(5, 4),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, region_code)
);

CREATE INDEX idx_product_region_prices_product_id ON product_region_prices(product_id);
CREATE INDEX idx_product_region_prices_region ON product_region_prices(region_code);
```

**迁移文件**：`1764000000700-CreateProductRegionPrices.ts`

---

#### 2.1.4 税费表

**表名**：`tax_rates`

**字段**：
```sql
CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code VARCHAR(2) NOT NULL,
  region_code VARCHAR(10),
  tax_type VARCHAR(20) NOT NULL, -- 'VAT', 'GST', 'SALES_TAX'
  rate DECIMAL(5, 4) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(country_code, region_code, tax_type, effective_date)
);

CREATE INDEX idx_tax_rates_country ON tax_rates(country_code);
CREATE INDEX idx_tax_rates_region ON tax_rates(region_code);
CREATE INDEX idx_tax_rates_type ON tax_rates(tax_type);
```

**迁移文件**：`1764000000800-CreateTaxRates.ts`

---

#### 2.1.5 资产聚合表

**表名**：`asset_aggregations`

**字段**：
```sql
CREATE TABLE asset_aggregations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id VARCHAR(255) NOT NULL,
  asset_type VARCHAR(50) NOT NULL, -- 'nft', 'ft', 'game_asset', 'rwa'
  source_platform VARCHAR(100) NOT NULL, -- 'opensea', 'magic_eden', 'user_generated'
  source_type VARCHAR(50) NOT NULL, -- 'platform_aggregated', 'user_generated'
  chain VARCHAR(50) NOT NULL,
  contract_address VARCHAR(255),
  token_id VARCHAR(255),
  metadata JSONB,
  price DECIMAL(18, 2),
  currency VARCHAR(3),
  commission_rate DECIMAL(5, 4),
  income_mode VARCHAR(50), -- 'platform_commission', 'user_paid'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(asset_id, source_platform, chain)
);

CREATE INDEX idx_asset_aggregations_asset_id ON asset_aggregations(asset_id);
CREATE INDEX idx_asset_aggregations_type ON asset_aggregations(asset_type);
CREATE INDEX idx_asset_aggregations_source ON asset_aggregations(source_platform);
```

**迁移文件**：`1764000000900-CreateAssetAggregations.ts`

---

### 2.2 修改表

#### 2.2.1 产品表修改

**表名**：`products`

**新增字段**：
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'physical'; -- 'physical', 'service', 'nft', 'ft', 'game_asset', 'rwa'
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 4); -- 固定佣金比例
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_commission_adjustment BOOLEAN DEFAULT FALSE; -- 是否允许调整佣金
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_commission_rate DECIMAL(5, 4); -- 最低佣金比例
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_commission_rate DECIMAL(5, 4); -- 最高佣金比例
```

**迁移文件**：`1764000001000-AlterProducts.ts`

---

#### 2.2.2 支付表修改

**表名**：`payments`

**新增字段**：
```sql
ALTER TABLE payments ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(18, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 4);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS channel_fee DECIMAL(18, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 4);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS session_id UUID; -- Session ID (三层ID之一)
```

**迁移文件**：`1764000001100-AlterPayments.ts`

---

#### 2.2.3 佣金表修改

**表名**：`commissions`

**新增字段**：
```sql
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50); -- 'execution', 'recommendation', 'referral'
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS commission_base DECIMAL(18, 2); -- 佣金计算基础（商户税前价格）
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS channel_fee DECIMAL(18, 2); -- 通道费用
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS session_id UUID; -- Session ID
```

**迁移文件**：`1764000001200-AlterCommissions.ts`

---

### 2.3 数据迁移脚本

#### 2.3.1 产品价格迁移

**脚本**：`1764000001300-MigrateProductPrices.ts`

**逻辑**：
```typescript
// 将现有产品价格迁移到product_prices表
// 使用现有price作为base_price
// 使用现有currency作为base_currency
```

---

#### 2.3.2 佣金数据迁移

**脚本**：`1764000001400-MigrateCommissions.ts`

**逻辑**：
```typescript
// 保持现有佣金记录不变
// 只对新交易使用新规则
```

---

## 3. 后端改动

### 3.1 新增服务

#### 3.1.1 定价服务（Pricing Service）

**文件**：`backend/src/modules/pricing/pricing.service.ts`

**功能**：
- 获取产品价格（根据国家、区域）
- 计算税费
- 计算总价
- 价格转换（货币转换）

**方法**：
```typescript
@Injectable()
export class PricingService {
  async getProductPrice(productId: string, countryCode: string): Promise<ProductPrice>
  async calculateTax(productId: string, countryCode: string, amount: number): Promise<TaxCalculation>
  async getTotalPrice(productId: string, countryCode: string): Promise<TotalPrice>
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number>
}
```

**模块**：`backend/src/modules/pricing/pricing.module.ts`

**控制器**：`backend/src/modules/pricing/pricing.controller.ts`

---

#### 3.1.2 税费服务（Tax Service）

**文件**：`backend/src/modules/tax/tax.service.ts`

**功能**：
- 获取税费率
- 计算税费
- 税费报表生成

**方法**：
```typescript
@Injectable()
export class TaxService {
  async getTaxRate(countryCode: string, regionCode?: string, taxType?: string): Promise<TaxRate>
  async calculateTax(amount: number, countryCode: string, regionCode?: string): Promise<TaxCalculation>
  async generateTaxReport(merchantId: string, startDate: Date, endDate: Date): Promise<TaxReport>
}
```

**模块**：`backend/src/modules/tax/tax.module.ts`

**控制器**：`backend/src/modules/tax/tax.controller.ts`

---

#### 3.1.3 资产聚合服务（Asset Aggregation Service）

**文件**：`backend/src/modules/marketplace/asset-aggregation.service.ts`

**功能**：
- 聚合外部平台资产（OpenSea、Magic Eden等）
- 聚合链上资产
- 资产同步和更新

**方法**：
```typescript
@Injectable()
export class AssetAggregationService {
  async aggregateFromPlatform(platform: string, assetType: string): Promise<Asset[]>
  async aggregateFromChain(chain: string, assetType: string): Promise<Asset[]>
  async syncAssets(): Promise<void>
  async updateAssetPrice(assetId: string): Promise<void>
}
```

---

#### 3.1.4 资产交易服务（Asset Trading Service）

**文件**：`backend/src/modules/marketplace/asset-trading.service.ts`

**功能**：
- 执行资产交易
- 处理平台分佣模式
- 处理用户付费模式

**方法**：
```typescript
@Injectable()
export class AssetTradingService {
  async executeTrade(trade: TradeRequest): Promise<TradeResult>
  async processPlatformCommission(tradeId: string): Promise<void>
  async processUserPaid(tradeId: string): Promise<void>
}
```

---

### 3.2 修改服务

#### 3.2.1 支付服务修改

**文件**：`backend/src/modules/payment/payment.service.ts`

**修改内容**：
- 支持多国家定价
- 支持税费计算
- 支持通道费用扣除
- 支持Session ID记录

**修改方法**：
```typescript
async processPayment(userId: string, dto: ProcessPaymentDto) {
  // 1. 获取产品价格（根据国家）
  const price = await this.pricingService.getProductPrice(dto.productId, dto.countryCode);
  
  // 2. 计算税费
  const tax = await this.taxService.calculateTax(price.amount, dto.countryCode);
  
  // 3. 创建Session ID
  const sessionId = uuidv4();
  
  // 4. 计算通道费用
  const channelFee = await this.calculateChannelFee(price.amount, dto.paymentMethod);
  
  // 5. 计算佣金（基于商户税前价格）
  const commissionBase = price.amount; // 商户税前价格
  const commission = await this.commissionCalculator.calculateCommission(
    commissionBase,
    dto.productId,
    sessionId
  );
  
  // 6. 处理支付
  // ...
}
```

---

#### 3.2.2 佣金计算服务修改

**文件**：`backend/src/modules/commission/commission-calculator.service.ts`

**修改内容**：
- 支持新的佣金分配规则（实体商品3%，服务类5%）
- 支持多Agent协作（推荐Agent 30%，执行Agent 70%）
- 支持通道费用扣除
- 支持Session ID记录

**修改方法**：
```typescript
async calculateCommission(
  commissionBase: number, // 商户税前价格
  productId: string,
  sessionId: string
): Promise<CommissionCalculation> {
  // 1. 获取产品类型
  const product = await this.productRepository.findOne(productId);
  const productType = product.productType;
  
  // 2. 确定佣金比例
  let commissionRate: number;
  if (productType === 'physical') {
    commissionRate = 0.03; // 3%
  } else if (productType === 'service') {
    commissionRate = 0.05; // 5%
  } else {
    // 链上资产根据场景不同
    commissionRate = await this.getOnChainAssetCommissionRate(product);
  }
  
  // 3. 计算总佣金
  const totalCommission = commissionBase * commissionRate;
  
  // 4. 分配佣金
  const recommendationAgentCommission = totalCommission * 0.3; // 30%
  const executionAgentCommission = totalCommission * 0.7; // 70%
  const paymindFee = commissionBase * this.getPayMindFeeRate(productType);
  
  // 5. 记录佣金
  await this.recordCommission({
    commissionBase,
    totalCommission,
    recommendationAgentCommission,
    executionAgentCommission,
    paymindFee,
    sessionId,
  });
  
  return {
    totalCommission,
    recommendationAgentCommission,
    executionAgentCommission,
    paymindFee,
  };
}
```

---

#### 3.2.3 智能路由服务修改

**文件**：`backend/src/modules/smart-router/smart-router.service.ts`

**修改内容**：
- 支持商户价格设置（根据国家、通道）
- 支持QuickPay快速通道
- 支持KYC引导流程
- 支持Session ID记录

**修改方法**：
```typescript
async routePayment(
  userId: string,
  productId: string,
  countryCode: string,
  currency: string,
  amount: number
): Promise<RoutingDecision> {
  // 1. 创建Session ID
  const sessionId = uuidv4();
  
  // 2. 检查用户状态（QuickPay、KYC等）
  const userStatus = await this.checkUserStatus(userId);
  
  // 3. 获取商户价格设置
  const merchantPrice = await this.pricingService.getProductPrice(productId, countryCode);
  
  // 4. 获取可用通道
  const availableChannels = await this.getAvailableChannels(countryCode, currency);
  
  // 5. 获取各通道的商户设置价格
  const channelPrices = await Promise.all(
    availableChannels.map(channel => 
      this.pricingService.getProductPriceForChannel(productId, countryCode, channel.id)
    )
  );
  
  // 6. 选择最优通道（价格最低）
  const recommendedChannel = channelPrices.reduce((a, b) => 
    a.price < b.price ? a : b
  );
  
  // 7. 记录路由决策（SLA指标）
  await this.slaService.recordRoutingDecision({
    sessionId,
    userId,
    productId,
    recommendedChannel: recommendedChannel.channelId,
    decisionTime: Date.now(),
  });
  
  return {
    sessionId,
    recommendedChannel: recommendedChannel.channelId,
    price: recommendedChannel.price,
    alternatives: channelPrices.filter(c => c.channelId !== recommendedChannel.channelId),
  };
}
```

---

### 3.3 新增实体

#### 3.3.1 产品价格实体

**文件**：`backend/src/entities/product-price.entity.ts`

```typescript
@Entity('product_prices')
export class ProductPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.prices)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  productId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  basePrice: number;

  @Column({ length: 3 })
  baseCurrency: string;

  @Column({ default: true })
  taxIncluded: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

#### 3.3.2 国家价格实体

**文件**：`backend/src/entities/product-country-price.entity.ts`

```typescript
@Entity('product_country_prices')
export class ProductCountryPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.countryPrices)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  productId: string;

  @Column({ length: 2 })
  countryCode: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  price: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ default: true })
  taxIncluded: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  taxRate: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

#### 3.3.3 税费实体

**文件**：`backend/src/entities/tax-rate.entity.ts`

```typescript
@Entity('tax_rates')
export class TaxRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 2 })
  countryCode: string;

  @Column({ length: 10, nullable: true })
  regionCode: string;

  @Column({ length: 20 })
  taxType: string; // 'VAT', 'GST', 'SALES_TAX'

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  rate: number;

  @Column({ type: 'date' })
  effectiveDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

#### 3.3.4 资产聚合实体

**文件**：`backend/src/entities/asset-aggregation.entity.ts`

```typescript
@Entity('asset_aggregations')
export class AssetAggregation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  assetId: string;

  @Column({ length: 50 })
  assetType: string; // 'nft', 'ft', 'game_asset', 'rwa'

  @Column({ length: 100 })
  sourcePlatform: string; // 'opensea', 'magic_eden', 'user_generated'

  @Column({ length: 50 })
  sourceType: string; // 'platform_aggregated', 'user_generated'

  @Column({ length: 50 })
  chain: string;

  @Column({ length: 255, nullable: true })
  contractAddress: string;

  @Column({ length: 255, nullable: true })
  tokenId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  price: number;

  @Column({ length: 3, nullable: true })
  currency: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  commissionRate: number;

  @Column({ length: 50, nullable: true })
  incomeMode: string; // 'platform_commission', 'user_paid'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 4. 合约改动

### 4.1 修改佣金合约

**文件**：`contract/contracts/Commission.sol`

**修改内容**：
- 支持新的佣金分配规则
- 支持多Agent协作
- 支持Session ID记录

**修改方法**：
```solidity
function recordCommission(
    address payee,
    PayeeType payeeType,
    uint256 amount,
    address currency,
    bytes32 sessionId,
    AgentType agentType
) external {
    // 记录佣金，包含Session ID和Agent类型
    // ...
}
```

---

### 4.2 修改支付路由合约

**文件**：`contract/contracts/PaymentRouter.sol`

**修改内容**：
- 支持新的路由规则
- 支持商户价格设置
- 支持Session ID记录

---

## 5. API改动

### 5.1 新增API

#### 5.1.1 定价API

**路径**：`/api/v2/pricing`

**接口**：
- `GET /api/v2/pricing/products/:id/price` - 获取产品价格
- `GET /api/v2/pricing/products/:id/price/:country` - 获取国家价格
- `POST /api/v2/pricing/calculate` - 计算价格和税费

---

#### 5.1.2 税费API

**路径**：`/api/v2/tax`

**接口**：
- `GET /api/v2/tax/rates/:country` - 获取税费率
- `POST /api/v2/tax/calculate` - 计算税费
- `GET /api/v2/tax/reports/:merchantId` - 获取税费报表

---

#### 5.1.3 资产聚合API

**路径**：`/api/v2/marketplace/assets`

**接口**：
- `GET /api/v2/marketplace/assets` - 获取资产列表
- `GET /api/v2/marketplace/assets/:id` - 获取资产详情
- `POST /api/v2/marketplace/assets/:id/purchase` - 购买资产
- `POST /api/v2/marketplace/assets/aggregate` - 聚合资产

---

### 5.2 修改API

#### 5.2.1 支付API修改

**路径**：`/api/v2/payments`

**修改接口**：
- `POST /api/v2/payments/create` - 创建支付（支持多国家定价、税费）
- `POST /api/v2/payments/process` - 处理支付（支持通道费用扣除）

**请求体修改**：
```typescript
interface CreatePaymentDto {
  productId: string;
  countryCode: string; // 新增
  currency?: string; // 新增
  amount: number;
  paymentMethod: string;
  // ... 其他字段
}
```

---

#### 5.2.2 佣金API修改

**路径**：`/api/v2/commissions`

**修改接口**：
- `POST /api/v2/commissions/calculate` - 计算佣金（支持新规则）
- `GET /api/v2/commissions/:id` - 获取佣金详情（包含Session ID）

---

## 6. SDK改动

### 6.1 新增方法

#### 6.1.1 定价SDK

**文件**：`sdk/src/pricing.ts`

**方法**：
```typescript
class PricingSDK {
  async getProductPrice(productId: string, countryCode: string): Promise<ProductPrice>
  async calculateTax(productId: string, countryCode: string, amount: number): Promise<TaxCalculation>
  async getTotalPrice(productId: string, countryCode: string): Promise<TotalPrice>
}
```

---

#### 6.1.2 资产聚合SDK

**文件**：`sdk/src/marketplace.ts`

**方法**：
```typescript
class MarketplaceSDK {
  async getAssets(filters: AssetFilters): Promise<Asset[]>
  async getAsset(assetId: string): Promise<Asset>
  async purchaseAsset(assetId: string, payment: PaymentRequest): Promise<TradeResult>
}
```

---

### 6.2 修改方法

#### 6.2.1 支付SDK修改

**文件**：`sdk/src/payment.ts`

**修改方法**：
```typescript
class PaymentSDK {
  async create(payment: CreatePaymentRequest): Promise<Payment> {
    // 支持多国家定价、税费计算
    // 支持Session ID
  }
}
```

---

#### 6.2.2 佣金SDK修改

**文件**：`sdk/src/commission.ts`

**修改方法**：
```typescript
class CommissionSDK {
  async calculate(commission: CommissionRequest): Promise<CommissionCalculation> {
    // 支持新佣金分配规则
    // 支持多Agent协作
  }
}
```

---

## 7. 前端改动（系统相关）

### 7.1 支付流程修改

**文件**：`paymindfrontend/components/payment/UserFriendlyPaymentModalV2.tsx`

**修改内容**：
- 支持多国家价格显示
- 支持税费显示
- 支持通道费用显示（可选）
- 支持佣金明细显示

---

### 7.2 API调用修改

**文件**：`paymindfrontend/lib/api/payment.api.ts`

**修改内容**：
- 更新支付API调用（支持新字段）
- 新增定价API调用
- 新增税费API调用

---

## 8. 测试计划

### 8.1 单元测试

**覆盖范围**：
- 所有新增服务
- 所有修改服务
- 所有新增实体
- 所有修改实体

**测试文件**：
- `backend/src/modules/pricing/pricing.service.spec.ts`
- `backend/src/modules/tax/tax.service.spec.ts`
- `backend/src/modules/commission/commission-calculator.service.spec.ts`
- `backend/src/modules/smart-router/smart-router.service.spec.ts`

---

### 8.2 集成测试

**覆盖范围**：
- 支付流程（包含新功能）
- 佣金计算（包含新规则）
- 智能路由（包含新规则）
- 资产聚合和交易

**测试文件**：
- `backend/test/payment.integration.spec.ts`
- `backend/test/commission.integration.spec.ts`
- `backend/test/smart-router.integration.spec.ts`
- `backend/test/marketplace.integration.spec.ts`

---

### 8.3 E2E测试

**覆盖范围**：
- 完整支付流程
- 佣金分配流程
- 资产交易流程

**测试文件**：
- `e2e/payment-flow.e2e.spec.ts`
- `e2e/commission-flow.e2e.spec.ts`
- `e2e/marketplace-flow.e2e.spec.ts`

---

## 9. 实施时间表

### 9.1 阶段1：数据库和实体（Week 1）

**任务**：
- [ ] 创建数据库迁移文件
- [ ] 创建实体文件
- [ ] 运行数据库迁移
- [ ] 数据迁移脚本

**负责人**：后端开发人员

---

### 9.2 阶段2：后端服务（Week 2-4）

**任务**：
- [ ] 开发定价服务
- [ ] 开发税费服务
- [ ] 修改支付服务
- [ ] 修改佣金计算服务
- [ ] 修改智能路由服务
- [ ] 开发资产聚合服务
- [ ] 开发资产交易服务

**负责人**：后端开发人员

---

### 9.3 阶段3：API和控制器（Week 3-4）

**任务**：
- [ ] 开发定价API
- [ ] 开发税费API
- [ ] 修改支付API
- [ ] 修改佣金API
- [ ] 开发资产聚合API
- [ ] API文档更新

**负责人**：后端开发人员

---

### 9.4 阶段4：合约（Week 4-5）

**任务**：
- [ ] 修改佣金合约
- [ ] 修改支付路由合约
- [ ] 合约测试
- [ ] 合约部署

**负责人**：合约开发人员

---

### 9.5 阶段5：SDK（Week 5-6）

**任务**：
- [ ] 开发定价SDK
- [ ] 开发资产聚合SDK
- [ ] 修改支付SDK
- [ ] 修改佣金SDK
- [ ] SDK文档更新

**负责人**：SDK开发人员

---

### 9.6 阶段6：前端（Week 6-7）

**任务**：
- [ ] 修改支付流程UI
- [ ] 修改API调用
- [ ] 更新类型定义
- [ ] 前端测试

**负责人**：前端开发人员

---

### 9.7 阶段7：测试（Week 7-8）

**任务**：
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E测试
- [ ] 性能测试
- [ ] 安全测试

**负责人**：测试人员

---

### 9.8 阶段8：部署（Week 8）

**任务**：
- [ ] 数据库迁移（生产环境）
- [ ] 后端部署
- [ ] 合约部署
- [ ] SDK发布
- [ ] 前端部署
- [ ] 监控和日志

**负责人**：DevOps人员

---

## 10. 验收标准

### 10.1 功能验收

**支付功能**：
- ✅ 支持多国家定价
- ✅ 支持税费计算
- ✅ 支持通道费用扣除
- ✅ 支持Session ID记录

**佣金功能**：
- ✅ 实体商品佣金3%（PayMind 0.5% + 其他 2.5%）
- ✅ 服务类佣金5%（PayMind 1% + 其他 4%）
- ✅ 链上资产佣金根据场景不同
- ✅ 支持多Agent协作（推荐Agent 30%，执行Agent 70%）

**智能路由功能**：
- ✅ 支持商户价格设置
- ✅ 支持QuickPay快速通道
- ✅ 支持KYC引导流程
- ✅ 支持Session ID记录

**Marketplace功能**：
- ✅ 支持资产聚合（平台聚合、用户自发）
- ✅ 支持游戏资产和RWA
- ✅ 支持收入模式（平台分佣、用户付费）

---

### 10.2 性能验收

**API响应时间**：
- ✅ API响应时间 < 500ms（P95）
- ✅ 支付流程完成时间 < 5s

**并发能力**：
- ✅ 支持至少1000并发用户
- ✅ 支持至少10000 TPS

---

### 10.3 安全验收

**数据安全**：
- ✅ 敏感数据加密
- ✅ 数据备份机制

**API安全**：
- ✅ API认证和授权
- ✅ API限流和防护

---

## 11. 风险控制

### 11.1 技术风险

**风险1：数据库迁移失败**
- **应对**：充分测试迁移脚本，准备回滚方案

**风险2：API不兼容**
- **应对**：使用版本控制，保持向后兼容

**风险3：性能下降**
- **应对**：性能测试，优化慢查询

---

### 11.2 业务风险

**风险1：佣金计算错误**
- **应对**：充分测试，多场景验证

**风险2：支付流程中断**
- **应对**：灰度发布，监控和告警

---

## 12. 总结

### 12.1 改动统计

**数据库**：
- 新增表：5个
- 修改表：3个
- 迁移脚本：6个

**后端**：
- 新增服务：4个
- 修改服务：3个
- 新增实体：4个
- 新增API：10个
- 修改API：5个

**合约**：
- 修改合约：2个

**SDK**：
- 新增方法：10个
- 修改方法：5个

**前端**：
- 修改组件：2个
- 修改API调用：5个

### 12.2 开发时间

**总工期**：8周
- 数据库和实体：1周
- 后端服务：3周
- API和控制器：2周
- 合约：2周
- SDK：2周
- 前端：2周
- 测试：2周
- 部署：1周

**并行开发**：可以，前端和后端可以并行开发

---

**请确认实施计划，以便开始系统改动工作。**

