# PayMind Agent 完整流程时序图与功能检查

**创建日期**: 2025-01-XX

---

## 📋 目录

1. [商家端完整流程时序图](#商家端完整流程时序图)
2. [用户端完整流程时序图](#用户端完整流程时序图)
3. [功能完成状态检查](#功能完成状态检查)
4. [缺失功能补充计划](#缺失功能补充计划)

---

## 商家端完整流程时序图

### 1. 实物商品完整流程

```mermaid
sequenceDiagram
    participant 商家 as 商家/商家Agent
    participant PM as PM Agent系统
    participant Auth as 认证服务
    participant Product as 商品服务
    participant Search as 搜索服务
    participant Order as 订单服务
    participant Payment as 支付服务
    participant Fulfill as 发货服务
    participant Logistics as 物流服务
    participant Notify as 通知服务

    Note over 商家,Notify: 1. 注册账户阶段
    商家->>PM: "我要注册成为商家"
    PM->>Auth: 检查用户权限
    Auth-->>PM: 返回用户信息
    PM->>Auth: 注册商户角色(registerRole('merchant'))
    Auth-->>PM: 返回商户ID和权限
    PM-->>商家: "✅ 注册成功，您的商户ID是xxx"

    Note over 商家,Notify: 2. 上传商品阶段
    商家->>PM: "我要上传商品：跑步鞋，价格150元，库存100"
    PM->>Product: createProduct({name, price, stock, category})
    Product->>Search: indexProduct() - 索引到向量数据库
    Search-->>Product: 索引成功
    Product-->>PM: 返回商品ID
    PM-->>商家: "✅ 商品已上架，ID:xxx，已自动索引"

    Note over 商家,Notify: 3. 接单阶段（用户下单后）
    Order->>Notify: 订单创建通知
    Notify->>商家: 推送："新订单：订单ID xxx，金额150元"
    商家->>PM: "查看订单详情"
    PM->>Order: getOrder(orderId)
    Order-->>PM: 返回订单信息
    PM-->>商家: 显示订单详情（商品、数量、地址等）

    Note over 商家,Notify: 4. 支付完成阶段
    Payment->>Fulfill: 支付成功，触发自动发货
    Fulfill->>Fulfill: 判断订单类型（physical）
    Fulfill->>Logistics: 创建物流跟踪（状态：packed）
    Logistics->>Notify: 发货准备通知
    Notify->>商家: 推送："订单已准备发货，请填写物流信息"

    Note over 商家,Notify: 5. 商家发货阶段
    商家->>PM: "订单xxx已发货，物流单号123456，承运商顺丰"
    PM->>Logistics: updateLogisticsStatus(orderId, 'shipped', trackingNumber, carrier)
    Logistics->>Logistics: 更新物流状态
    Logistics->>Notify: 发货通知
    Notify->>商家: 推送："订单已发货"
    Notify->>用户: 推送："您的订单已发货，物流单号：123456"

    Note over 商家,Notify: 6. 物流跟踪阶段
    Logistics->>Logistics: 定时任务自动查询第三方物流API
    Logistics->>Logistics: 更新物流状态（in_transit → delivered）
    Logistics->>Notify: 物流状态更新通知
    Notify->>商家: 推送："订单物流状态已更新"
    Notify->>用户: 推送："订单已送达"

    Note over 商家,Notify: 7. 收款阶段
    Payment->>Payment: 支付完成，自动结算
    Payment->>商家: 资金到账（根据结算规则）
    商家->>PM: "查看收款统计"
    PM->>Payment: 查询收款记录
    Payment-->>PM: 返回收款统计
    PM-->>商家: "今日收款：¥1500，待收款：¥500"
```

### 2. 服务类商品完整流程

```mermaid
sequenceDiagram
    participant 商家 as 商家/商家Agent
    participant PM as PM Agent系统
    participant Product as 商品服务
    participant Order as 订单服务
    participant Payment as 支付服务
    participant Fulfill as 发货服务
    participant Notify as 通知服务

    Note over 商家,Notify: 1. 上传服务商品
    商家->>PM: "我要上架服务：在线课程，价格99元"
    PM->>Product: createProduct({productType: 'service', ...})
    Product->>Product: 自动索引到向量数据库
    Product-->>PM: 返回商品ID
    PM-->>商家: "✅ 服务已上架"

    Note over 商家,Notify: 2. 用户购买服务
    Order->>Notify: 订单创建通知
    Notify->>商家: 推送："新订单：在线课程"

    Note over 商家,Notify: 3. 支付完成自动激活
    Payment->>Fulfill: 支付成功，触发自动发货
    Fulfill->>Fulfill: 判断订单类型（service）
    Fulfill->>Fulfill: 自动激活服务
    Fulfill->>Order: 更新订单状态为COMPLETED
    Fulfill->>Notify: 服务激活通知
    Notify->>商家: 推送："服务已自动激活"
    Notify->>用户: 推送："您的服务已激活，可以开始使用"

    Note over 商家,Notify: 4. 收款（即时结算）
    Payment->>Payment: 支付完成，即时结算（服务类）
    Payment->>商家: 资金到账
```

### 3. 链上资产（NFT/FT）完整流程

```mermaid
sequenceDiagram
    participant 商家 as 商家/商家Agent
    participant PM as PM Agent系统
    participant Product as 商品服务
    participant NFT as NFT服务
    participant Order as 订单服务
    participant Payment as 支付服务
    participant Fulfill as 发货服务
    participant Escrow as 托管服务
    participant Blockchain as 区块链

    Note over 商家,Blockchain: 1. 上传链上资产
    商家->>PM: "我要上架NFT：数字艺术品，价格0.5 ETH"
    PM->>NFT: 同步链上资产信息
    NFT->>Blockchain: 查询NFT元数据
    Blockchain-->>NFT: 返回NFT信息
    NFT->>Product: createProduct({productType: 'nft', ...})
    Product-->>PM: 返回商品ID
    PM-->>商家: "✅ NFT已上架"

    Note over 商家,Blockchain: 2. 用户购买NFT
    Order->>Order: 创建订单（订单类型：nft）
    Order->>Payment: 创建支付（使用托管）

    Note over 商家,Blockchain: 3. 支付完成自动核销
    Payment->>Escrow: 资金托管
    Escrow->>Blockchain: 锁定资金
    Payment->>Fulfill: 支付成功，触发自动发货
    Fulfill->>Fulfill: 判断订单类型（nft）
    Fulfill->>NFT: 转移NFT所有权
    NFT->>Blockchain: 调用智能合约转移NFT
    Blockchain-->>NFT: 转移成功
    NFT->>Escrow: 确认NFT已转移
    Escrow->>Escrow: 释放资金（即时结算）
    Escrow->>商家: 资金到账
    Fulfill->>Order: 更新订单状态为COMPLETED
```

---

## 用户端完整流程时序图

### 1. 实物商品完整流程

```mermaid
sequenceDiagram
    participant 用户 as 用户/用户Agent
    participant PM as PM Agent系统
    participant Search as 搜索服务
    participant Product as 商品服务
    participant Cart as 购物车服务
    participant Order as 订单服务
    participant Payment as 支付服务
    participant Fulfill as 发货服务
    participant Logistics as 物流服务
    participant Notify as 通知服务

    Note over 用户,Notify: 1. 提出需求
    用户->>PM: "帮我找跑步鞋，价格不超过150元"
    PM->>Search: semanticSearch("跑步鞋", {priceMax: 150})
    Search->>Search: 向量数据库检索
    Search-->>PM: 返回搜索结果
    PM->>Product: 获取商品详情
    Product-->>PM: 返回商品信息
    PM-->>用户: 展示搜索结果（5件商品）

    Note over 用户,Notify: 2. 比价
    用户->>PM: "比价一下"
    PM->>Search: semanticSearch("跑步鞋")
    Search-->>PM: 返回相关商品
    PM->>PM: 计算比价信息（最低价、最高价、平均价、最佳性价比）
    PM-->>用户: 展示比价结果

    Note over 用户,Notify: 3. 加入购物车
    用户->>PM: "加入购物车 最佳性价比的那双，数量1"
    PM->>Cart: addToCart(userId, productId, quantity)
    Cart->>Cart: 保存到缓存（7天）
    Cart-->>PM: 返回购物车
    PM-->>用户: "✅ 已加入购物车"

    Note over 用户,Notify: 4. 查看购物车
    用户->>PM: "查看购物车"
    PM->>Cart: getCartWithProducts(userId)
    Cart->>Product: 获取商品详情
    Product-->>Cart: 返回商品信息
    Cart->>Cart: 计算总价
    Cart-->>PM: 返回购物车详情
    PM-->>用户: 展示购物车（商品列表、总价）

    Note over 用户,Notify: 5. 下单
    用户->>PM: "结算" 或 "下单"
    PM->>Order: createOrder(userId, {productId, quantity, ...})
    Order->>Product: 检查库存
    Product-->>Order: 库存充足
    Order->>Order: 创建订单
    Order-->>PM: 返回订单ID
    PM-->>用户: "✅ 订单创建成功，订单ID:xxx，总价：¥150"

    Note over 用户,Notify: 6. 支付
    用户->>PM: "支付"
    PM->>Payment: processPayment(userId, {orderId, amount, ...})
    Payment->>Payment: 智能路由选择支付方式
    Payment->>Payment: 处理支付
    Payment-->>PM: 支付成功
    PM-->>用户: "✅ 支付成功"

    Note over 用户,Notify: 7. 自动发货
    Payment->>Fulfill: 支付成功，触发自动发货
    Fulfill->>Fulfill: 判断订单类型（physical）
    Fulfill->>Logistics: 创建物流跟踪（状态：packed）
    Logistics->>Notify: 发货准备通知
    Notify->>用户: 推送："订单已准备发货"

    Note over 用户,Notify: 8. 商家发货
    Logistics->>Logistics: 商家填写物流信息
    Logistics->>Logistics: 更新物流状态（shipped）
    Logistics->>Notify: 发货通知
    Notify->>用户: 推送："订单已发货，物流单号：123456"

    Note over 用户,Notify: 9. 物流跟踪
    Logistics->>Logistics: 定时任务自动查询第三方物流API
    Logistics->>Logistics: 更新物流状态
    Logistics->>Notify: 物流状态更新通知
    Notify->>用户: 推送："订单正在运输中" / "订单已送达"
```

### 2. 服务类商品完整流程

```mermaid
sequenceDiagram
    participant 用户 as 用户/用户Agent
    participant PM as PM Agent系统
    participant Search as 搜索服务
    participant Product as 商品服务
    participant Order as 订单服务
    participant Payment as 支付服务
    participant Fulfill as 发货服务
    participant Notify as 通知服务

    Note over 用户,Notify: 1. 搜索服务
    用户->>PM: "帮我找在线课程"
    PM->>Search: semanticSearch("在线课程", {type: 'service'})
    Search-->>PM: 返回服务列表
    PM-->>用户: 展示服务结果

    Note over 用户,Notify: 2. 下单
    用户->>PM: "购买这个课程"
    PM->>Order: createOrder({productType: 'service', ...})
    Order-->>PM: 返回订单ID
    PM-->>用户: "✅ 订单创建成功"

    Note over 用户,Notify: 3. 支付
    用户->>PM: "支付"
    PM->>Payment: processPayment()
    Payment-->>PM: 支付成功

    Note over 用户,Notify: 4. 自动激活服务
    Payment->>Fulfill: 支付成功，触发自动发货
    Fulfill->>Fulfill: 判断订单类型（service）
    Fulfill->>Fulfill: 自动激活服务
    Fulfill->>Order: 更新订单状态为COMPLETED
    Fulfill->>Notify: 服务激活通知
    Notify->>用户: 推送："服务已激活，可以开始使用"
```

### 3. 链上资产（NFT/FT）完整流程

```mermaid
sequenceDiagram
    participant 用户 as 用户/用户Agent
    participant PM as PM Agent系统
    participant Search as 搜索服务
    participant NFT as NFT服务
    participant Order as 订单服务
    participant Payment as 支付服务
    participant Escrow as 托管服务
    participant Blockchain as 区块链

    Note over 用户,Blockchain: 1. 搜索链上资产
    用户->>PM: "帮我找NFT艺术品"
    PM->>Search: semanticSearch("NFT艺术品", {type: 'nft'})
    Search-->>PM: 返回NFT列表
    PM-->>用户: 展示NFT结果

    Note over 用户,Blockchain: 2. 下单
    用户->>PM: "购买这个NFT"
    PM->>Order: createOrder({productType: 'nft', ...})
    Order-->>PM: 返回订单ID
    PM-->>用户: "✅ 订单创建成功"

    Note over 用户,Blockchain: 3. 支付（使用托管）
    用户->>PM: "支付"
    PM->>Payment: processPayment({useEscrow: true})
    Payment->>Escrow: 创建托管交易
    Escrow->>Blockchain: 锁定资金
    Blockchain-->>Escrow: 资金已锁定
    Escrow-->>Payment: 托管成功
    Payment-->>PM: 支付成功

    Note over 用户,Blockchain: 4. 自动转移NFT
    Payment->>Fulfill: 支付成功，触发自动发货
    Fulfill->>Fulfill: 判断订单类型（nft）
    Fulfill->>NFT: 转移NFT所有权
    NFT->>Blockchain: 调用智能合约转移NFT
    Blockchain-->>NFT: 转移成功
    NFT->>Escrow: 确认NFT已转移
    Escrow->>Escrow: 释放资金（即时结算）
    Escrow->>商家: 资金到账
    Fulfill->>Order: 更新订单状态为COMPLETED
```

---

## 功能完成状态检查

### 商家Agent功能检查

| 功能 | Agent支持 | SDK支持 | 后端API | 状态 |
|------|----------|---------|---------|------|
| **注册商户账户** | ❌ 未实现 | ✅ 有前端页面 | ✅ AuthService.register() | ⚠️ 需补充 |
| **上传商品（实物）** | ❌ 未实现 | ✅ marketplace.createProduct() | ✅ ProductService.createProduct() | ⚠️ 需补充 |
| **上传商品（服务）** | ❌ 未实现 | ✅ marketplace.createProduct() | ✅ ProductService.createProduct() | ⚠️ 需补充 |
| **上传商品（NFT/FT）** | ❌ 未实现 | ✅ marketplace.createProduct() | ✅ ProductService.createProduct() | ⚠️ 需补充 |
| **查看订单列表** | ❌ 未实现 | ✅ merchants.listOrders() | ✅ OrderService.getOrders() | ⚠️ 需补充 |
| **查看订单详情** | ❌ 未实现 | ✅ merchants.getOrder() | ✅ OrderService.getOrder() | ⚠️ 需补充 |
| **发货（填写物流信息）** | ❌ 未实现 | ❌ 未实现 | ✅ LogisticsService.updateLogisticsStatus() | ⚠️ 需补充 |
| **收款管理** | ✅ 已实现 | ❌ 未实现 | ✅ PayIntentService.createPayIntent() | ✅ 完成 |
| **订单分析** | ✅ 已实现 | ❌ 未实现 | ✅ AnalyticsService.getMerchantAnalytics() | ✅ 完成 |
| **对账** | ✅ 已实现 | ❌ 未实现 | ✅ ReconciliationService | ✅ 完成 |
| **结算规则** | ✅ 已实现 | ❌ 未实现 | ✅ SettlementRulesService | ✅ 完成 |

### 用户Agent功能检查

| 功能 | Agent支持 | SDK支持 | 后端API | 状态 |
|------|----------|---------|---------|------|
| **语义检索商品** | ✅ 已实现 | ✅ marketplace.searchProducts() | ✅ SearchService.semanticSearch() | ✅ 完成 |
| **比价** | ✅ 已实现 | ❌ 未实现 | ✅ AgentService.searchAndCompareProducts() | ✅ 完成 |
| **加入购物车** | ✅ 已实现 | ❌ 未实现 | ✅ CartService.addToCart() | ✅ 完成 |
| **查看购物车** | ✅ 已实现 | ❌ 未实现 | ✅ CartService.getCartWithProducts() | ✅ 完成 |
| **删除购物车商品** | ✅ 已实现 | ❌ 未实现 | ✅ CartService.removeFromCart() | ✅ 完成 |
| **清空购物车** | ✅ 已实现 | ❌ 未实现 | ✅ CartService.clearCart() | ✅ 完成 |
| **下单** | ✅ 已实现 | ❌ 未实现 | ✅ OrderService.createOrder() | ✅ 完成 |
| **支付** | ✅ 已实现 | ✅ payment.processPayment() | ✅ PaymentService.processPayment() | ✅ 完成 |
| **查看订单** | ❌ 未实现 | ❌ 未实现 | ✅ OrderService.getOrders() | ⚠️ 需补充 |
| **物流跟踪** | ❌ 未实现 | ❌ 未实现 | ✅ LogisticsService.getLogisticsTracking() | ⚠️ 需补充 |

### SDK功能检查

| 功能模块 | 完成度 | 说明 |
|---------|--------|------|
| **Marketplace** | 90% | ✅ 商品搜索、创建、更新、删除<br>❌ 比价、购物车 |
| **Merchants** | 70% | ✅ 商品管理、订单查询<br>❌ 发货、收款 |
| **Payment** | 100% | ✅ 支付流程完整 |
| **Cart** | 0% | ❌ 未实现 |
| **Logistics** | 0% | ❌ 未实现 |

---

## 缺失功能补充计划

### 优先级P0（核心功能）

#### 1. 商家Agent - 注册商户账户

**实现位置**: `backend/src/modules/agent/agent-p0-integration.service.ts`

**需要添加**:
- 意图识别：`register_merchant` / `注册商户`
- 处理方法：`handleRegisterMerchant()`
- 调用：`AuthService.registerRole('merchant')`

**Agent对话示例**:
```
商家："我要注册成为商家"
Agent：[检查权限] → [注册商户角色] → "✅ 注册成功，您的商户ID是xxx"
```

#### 2. 商家Agent - 上传商品

**实现位置**: `backend/src/modules/agent/agent-p0-integration.service.ts`

**需要添加**:
- 意图识别：`create_product` / `上传商品` / `上架商品`
- 处理方法：`handleCreateProduct()`
- 支持商品类型：physical, service, nft, ft, game_asset, rwa
- 调用：`ProductService.createProduct()`

**Agent对话示例**:
```
商家："我要上传商品：跑步鞋，价格150元，库存100，分类运动鞋"
Agent：[创建商品] → [自动索引] → "✅ 商品已上架，ID:xxx"
```

#### 3. 商家Agent - 查看订单

**实现位置**: `backend/src/modules/agent/agent-p0-integration.service.ts`

**需要添加**:
- 意图识别：`view_orders` / `查看订单` / `订单列表`
- 处理方法：`handleViewOrders()`
- 调用：`OrderService.getOrders(merchantId)`

#### 4. 商家Agent - 发货

**实现位置**: `backend/src/modules/agent/agent-p0-integration.service.ts`

**需要添加**:
- 意图识别：`ship_order` / `发货` / `填写物流信息`
- 处理方法：`handleShipOrder()`
- 调用：`LogisticsService.updateLogisticsStatus()`

**Agent对话示例**:
```
商家："订单xxx已发货，物流单号123456，承运商顺丰"
Agent：[更新物流状态] → [推送通知] → "✅ 发货成功，已通知用户"
```

#### 5. 用户Agent - 查看订单

**实现位置**: `backend/src/modules/agent/agent-p0-integration.service.ts`

**需要添加**:
- 意图识别：`view_orders` / `查看订单` / `我的订单`
- 处理方法：`handleViewOrders()`
- 调用：`OrderService.getOrders(userId)`

#### 6. 用户Agent - 物流跟踪

**实现位置**: `backend/src/modules/agent/agent-p0-integration.service.ts`

**需要添加**:
- 意图识别：`track_logistics` / `物流跟踪` / `查看物流`
- 处理方法：`handleTrackLogistics()`
- 调用：`LogisticsService.getLogisticsTracking()`

**Agent对话示例**:
```
用户："查看订单xxx的物流"
Agent：[查询物流信息] → 展示物流状态、事件时间线、当前位置
```

### 优先级P1（增强功能）

#### 7. SDK - 购物车功能

**实现位置**: `sdk-js/src/resources/cart.ts`

**需要添加**:
- `addToCart()`
- `getCart()`
- `removeFromCart()`
- `updateQuantity()`
- `clearCart()`

#### 8. SDK - 物流功能

**实现位置**: `sdk-js/src/resources/logistics.ts`

**需要添加**:
- `getTracking()`
- `updateStatus()` (商家)
- `autoUpdate()`

---

## 总结

### 当前完成度

- **商家Agent**: 40% (收款、订单分析、对账已完成，注册、上传商品、发货待实现)
- **用户Agent**: 85% (搜索、比价、购物车、下单、支付已完成，查看订单、物流跟踪待实现)
- **SDK**: 70% (Marketplace、Payment完成，Cart、Logistics待实现)

### 核心流程完整性

| 流程 | 商家端 | 用户端 | 状态 |
|------|--------|--------|------|
| **注册/登录** | ⚠️ 需补充Agent | ✅ 已完成 | ⚠️ 部分完成 |
| **商品管理** | ⚠️ 需补充Agent | ✅ 已完成 | ⚠️ 部分完成 |
| **订单处理** | ⚠️ 需补充Agent | ✅ 已完成 | ⚠️ 部分完成 |
| **发货/物流** | ⚠️ 需补充Agent | ⚠️ 需补充Agent | ⚠️ 部分完成 |
| **收款/支付** | ✅ 已完成 | ✅ 已完成 | ✅ 完成 |

### 下一步行动

1. **立即实现**（P0）:
   - 商家Agent注册商户
   - 商家Agent上传商品
   - 商家Agent查看订单
   - 商家Agent发货
   - 用户Agent查看订单
   - 用户Agent物流跟踪

2. **后续实现**（P1）:
   - SDK购物车功能
   - SDK物流功能

