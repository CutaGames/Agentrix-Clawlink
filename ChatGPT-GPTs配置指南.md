# ChatGPT Custom GPTs 配置指南

本指南帮助你在 ChatGPT 中创建一个能够访问 Agentrix Marketplace 的 Custom GPT。

## 📋 前提条件

- ChatGPT Plus 或 Team 订阅
- Agentrix API Key（可选，用于完整购买功能）

---

## 🚀 快速配置步骤

### 第一步：创建 Custom GPT

1. 访问 [ChatGPT](https://chat.openai.com)
2. 点击左下角的 **Explore GPTs**
3. 点击右上角的 **Create**
4. 选择 **Configure** 标签页

### 第二步：基础配置

**Name（名称）:**
```
Agentrix 智能购物助手
```

**Description（描述）:**
```
我可以帮你在 Agentrix Marketplace 搜索和购买各种商品，包括实物商品、服务、NFT、游戏资产等。
```

**Instructions（指令）:**
```
你是 Agentrix Marketplace 的智能购物助手。你的职责是：

1. 帮助用户搜索商品：
   - 支持自然语言搜索，如"帮我找蓝牙耳机"
   - 可以按类型筛选：实物商品(physical)、服务(service)、NFT、代币(ft)、游戏资产(game_asset)、真实世界资产(rwa)
   - 可以按价格区间筛选

2. 展示商品信息：
   - 清晰展示商品名称、价格、描述
   - 对于NFT/代币，展示区块链信息
   - 对于服务，展示服务时长和交付物
   - 对于游戏资产，展示游戏名称和稀有度

3. 协助下单购买：
   - 引导用户提供必要信息（收货地址、钱包地址等）
   - 创建订单并提供支付链接

4. 响应风格：
   - 友好、专业
   - 使用中文回复
   - 主动提供购买建议

注意事项：
- 对于NFT等链上资产，需要用户提供钱包地址
- 对于实物商品，需要收货地址
- 支付链接需要用户点击访问完成支付
```

### 第三步：配置 Actions

1. 点击 **Create new action**
2. 选择 **Import from URL** 或直接粘贴 Schema
3. 使用以下 URL 获取 Schema：

```
https://api.agentrix.top/api/openai/schema
```

或者手动粘贴 OpenAPI Schema（见下方）。

### 第四步：配置认证

配置 API Key 以启用 GPTs Actions：

1. 在 Actions 配置中点击 **Authentication**
2. 选择 **API Key** (API 密钥)
3. Auth Type: **自定义** (Custom)
4. Custom Header Name: `Agentrix-API-KEY`
5. 输入平台 API Key

**平台 API Key：**
```
agx_gpts_platform_2024_xK9mP3nQ7rT2wY5z
```

> 💡 **说明**：这是平台级 API Key，用于授权 GPTs 调用 Agentrix API。
> 普通用户在 ChatGPT 对话中不需要知道这个 Key。
> 
> 商户/开发者如需自己的 API Key，可在 Agentrix 后台申请。

---

## 📝 OpenAPI Schema

将以下内容复制到 Actions 的 Schema 输入框：

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Agentrix Marketplace API",
    "version": "2.0.0",
    "description": "Agentrix Marketplace API - 支持多种资产类型的搜索和交易"
  },
  "servers": [
    {
      "url": "https://api.agentrix.top/api",
      "description": "Agentrix API Server"
    }
  ],
  "paths": {
    "/marketplace/search": {
      "get": {
        "summary": "Search products",
        "operationId": "searchProducts",
        "parameters": [
          { "name": "query", "in": "query", "required": true, "schema": { "type": "string" } },
          { "name": "assetType", "in": "query", "schema": { "type": "string", "enum": ["physical", "service", "nft", "ft", "game_asset", "rwa"] } },
          { "name": "priceMin", "in": "query", "schema": { "type": "number" } },
          { "name": "priceMax", "in": "query", "schema": { "type": "number" } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 10 } }
        ],
        "responses": {
          "200": { "description": "Search results" }
        }
      }
    },
    "/marketplace/products/{id}": {
      "get": {
        "summary": "Get product details",
        "operationId": "getProduct",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Product details" }
        }
      }
    },
    "/marketplace/orders": {
      "post": {
        "summary": "Create order",
        "operationId": "createOrder",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["productId"],
                "properties": {
                  "productId": { "type": "string" },
                  "quantity": { "type": "integer", "default": 1 },
                  "walletAddress": { "type": "string" },
                  "chain": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Order created" }
        }
      }
    },
    "/marketplace/payments": {
      "post": {
        "summary": "Initiate payment",
        "operationId": "initiatePayment",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["orderId"],
                "properties": {
                  "orderId": { "type": "string" },
                  "method": { "type": "string", "enum": ["crypto", "fiat", "usdc"] }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Payment initiated" }
        }
      }
    }
  }
}
```

---

## 💬 测试对话示例

配置完成后，可以用以下对话测试：

### 搜索商品
```
用户：帮我找一下蓝牙耳机，预算500元以内
GPT：好的，我来帮您搜索...[调用searchProducts]
     找到以下蓝牙耳机：
     1. Sony WH-1000XM5 - ¥2999.00 - 业界领先降噪
     2. Apple AirPods Pro - ¥1899.00 - 主动降噪
     ...
```

### 搜索NFT
```
用户：我想看看有什么NFT头像
GPT：我来搜索NFT头像...[调用searchProducts with assetType=nft]
     找到以下NFT：
     1. Cyber Punk Avatar #1024 - 0.5 ETH
        - 链：Ethereum
        - 标准：ERC-721
        - 稀有度：Rare
     ...
```

### 购买流程
```
用户：我要买第一个NFT
GPT：好的！购买NFT需要您提供接收钱包地址。请问您的以太坊钱包地址是？

用户：0x1234...abcd
GPT：正在创建订单...[调用createOrder]
     订单创建成功！
     订单号：ORD-12345
     金额：0.5 ETH
     
     请点击以下链接完成支付：
     [支付链接]
```

---

## 🔧 高级配置

### 添加对话启动器

在 **Conversation starters** 中添加：

```
帮我搜索NFT头像
有什么游戏装备推荐？
搜索AI编程服务
帮我找500元以下的耳机
```

### 添加知识库

可以上传以下文档增强 GPT 的知识：
- Agentrix 商品分类指南
- 支付方式说明
- 常见问题解答

---

## 📊 支持的资产类型

| 类型 | 代码 | 示例 |
|------|------|------|
| 实物商品 | `physical` | 耳机、手机、服装 |
| 服务 | `service` | AI编程助手、技术咨询 |
| NFT | `nft` | PFP头像、数字艺术、虚拟土地 |
| 代币 | `ft` | 治理代币、游戏代币 |
| 游戏资产 | `game_asset` | 武器、坐骑、皮肤 |
| 真实资产 | `rwa` | 黄金代币、房产份额 |

---

## ❓ 常见问题

### Q: 为什么搜索没有结果？
A: 检查搜索关键词是否正确，或者尝试更宽泛的搜索词。

### Q: 如何获取 API Key？
A: 访问 https://www.agentrix.top 注册账户后，在设置中生成 API Key。

### Q: 支持哪些支付方式？
A: 支持加密货币（USDT、USDC、ETH等）和法币支付。

### Q: NFT购买后在哪里查看？
A: NFT会发送到您提供的钱包地址，可以在钱包或区块链浏览器中查看。

---

## 📞 获取帮助

- 文档：https://docs.agentrix.top
- API 参考：https://api.agentrix.top/docs
- 支持邮箱：support@agentrix.top
