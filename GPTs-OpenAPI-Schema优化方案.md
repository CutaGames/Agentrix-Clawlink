# GPTs OpenAPI Schema 优化方案

## 📊 Schema 分析

### ✅ 优点

1. **标准 REST API 格式**
   - 符合 GPTs Actions 的标准要求
   - 使用标准的 OpenAPI 3.1.0 规范
   - 路径设计清晰（`/marketplace/search`, `/marketplace/products/{id}` 等）

2. **结构清晰**
   - 使用了 `components/schemas` 定义数据结构
   - 操作定义明确（GET, POST）
   - 参数和响应定义完整

3. **符合 GPTs 要求**
   - GPTs Actions 支持标准的 REST API 格式
   - 可以直接导入使用

### ⚠️ 需要改进的地方

1. **缺少认证机制**
   - 需要添加 API Key 或 OAuth 认证
   - 需要支持用户身份传递

2. **参数支持不完整**
   - 搜索接口缺少分类、价格范围等参数
   - 需要支持更多过滤条件

3. **错误响应未定义**
   - 需要添加错误响应 Schema
   - 需要定义错误码

4. **数据格式需要对齐**
   - 需要确保返回格式与现有实现一致
   - 需要添加更多字段（如库存、图片等）

---

## 🚀 优化后的 OpenAPI Schema

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Agentrix Marketplace API",
    "version": "1.0.0",
    "description": "Agentrix Marketplace API for GPTs. Supports product search, product details, order creation, and payment initiation.",
    "contact": {
      "name": "Agentrix Support",
      "email": "support@agentrix.com",
      "url": "https://www.agentrix.top"
    }
  },
  "servers": [
    {
      "url": "https://api.agentrix.top/api",
      "description": "Agentrix API Server"
    }
    3. 验证更新
    更新后，GPTs 应该显示：
    工具名称：searchProducts, getProduct, createOrder, initiatePayment
    不是：getOpenAIFunctions, executeOpenAIFunctionCall
    重要提示
    使用完整 URL：https://api.agentrix.top/api/openai/openapi.json
    不是：api.agentrix.top 或 https://api.agentrix.top
    确保后端服务已重启（应用最新代码）
    更新后，GPTs 应该能正常调用新的 REST API 端点了。
    In components section, schemas subsection is not an object
    
    In context=('paths', '/openai/chat', '200', 'response', 'content', 'application/json', 'schema'), object schema missing properties
    
    错误显示仍在使用旧的 Schema（包含 /openai/chat）。检查并修复：
    问题：Controller 在读取文件失败时回退到旧的 Schema（包含 /openai/chat）。修复：确保始终返回新的 Schema，移除回退逻辑。
    检查 JSON 文件，并修复 Controller 的回退逻辑：
    修复：Controller 在失败时回退到旧的 Schema（包含 /openai/chat）。改为始终返回新的 Schema，移除旧的回退
  ],
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key",
        "description": "API Key 认证（用于识别用户身份）"
      },
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT Token 认证（可选）"
      }
    },
    "schemas": {
      "SearchResponse": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "description": "是否成功"
          },
          "data": {
            "type": "object",
            "properties": {
              "items": {
                "type": "array",
                "items": { "$ref": "#/components/schemas/Product" }
              },
              "total": {
                "type": "integer",
                "description": "商品总数"
              },
              "query": {
                "type": "string",
                "description": "搜索查询"
              }
            }
          },
          "message": {
            "type": "string",
            "description": "响应消息"
          }
        },
        "required": ["success", "data"]
      },
      "Product": {
        "type": "object",
        "properties": {
          "id": { 
            "type": "string",
            "description": "商品ID"
          },
          "title": { 
            "type": "string",
            "description": "商品名称"
          },
          "name": {
            "type": "string",
            "description": "商品名称（别名）"
          },
          "description": { 
            "type": "string",
            "description": "商品描述"
          },
          "price": { 
            "type": "number",
            "description": "商品价格"
          },
          "currency": { 
            "type": "string",
            "description": "货币类型（如 CNY, USD）",
            "default": "CNY"
          },
          "priceDisplay": {
            "type": "string",
            "description": "格式化后的价格显示（如 ¥899.00）"
          },
          "image": { 
            "type": "string",
            "format": "uri",
            "description": "商品主图URL"
          },
          "images": {
            "type": "array",
            "items": { "type": "string", "format": "uri" },
            "description": "商品图片列表"
          },
          "category": {
            "type": "string",
            "description": "商品分类"
          },
          "productType": {
            "type": "string",
            "enum": ["physical", "service", "crypto", "nft"],
            "description": "商品类型"
          },
          "stock": {
            "type": "integer",
            "description": "库存数量"
          },
          "inStock": {
            "type": "boolean",
            "description": "是否有库存"
          },
          "merchantId": {
            "type": "string",
            "description": "商户ID"
          },
          "merchantName": {
            "type": "string",
            "description": "商户名称"
          }
        },
        "required": ["id", "title", "price", "currency"]
      },
      "CreateOrderInput": {
        "type": "object",
        "properties": {
          "productId": { 
            "type": "string",
            "description": "商品ID"
          },
          "quantity": { 
            "type": "integer",
            "minimum": 1,
            "default": 1,
            "description": "购买数量"
          },
          "shippingAddress": {
            "$ref": "#/components/schemas/ShippingAddress"
          },
          "appointmentTime": {
            "type": "string",
            "format": "date-time",
            "description": "预约时间（服务类商品需要，ISO 8601格式）"
          },
          "contactInfo": {
            "type": "string",
            "description": "联系方式（服务类商品需要）"
          },
          "walletAddress": {
            "type": "string",
            "description": "接收NFT的钱包地址（NFT类商品需要）"
          },
          "chain": {
            "type": "string",
            "enum": ["ethereum", "polygon", "solana", "bsc"],
            "description": "区块链网络（NFT类商品需要）"
          }
        },
        "required": ["productId"]
      },
      "ShippingAddress": {
        "type": "object",
        "properties": {
          "name": { 
            "type": "string",
            "description": "收货人姓名"
          },
          "phone": { 
            "type": "string",
            "description": "联系电话"
          },
          "addressLine": { 
            "type": "string",
            "description": "详细地址"
          },
          "city": { 
            "type": "string",
            "description": "城市"
          },
          "postalCode": { 
            "type": "string",
            "description": "邮编"
          },
          "country": { 
            "type": "string",
            "description": "国家"
          }
        },
        "required": ["name", "phone", "addressLine"]
      },
      "Order": {
        "type": "object",
        "properties": {
          "orderId": { 
            "type": "string",
            "description": "订单ID"
          },
          "id": {
            "type": "string",
            "description": "订单ID（别名）"
          },
          "status": { 
            "type": "string",
            "enum": ["pending", "paid", "processing", "shipped", "delivered", "cancelled"],
            "description": "订单状态"
          },
          "amount": { 
            "type": "number",
            "description": "订单金额"
          },
          "currency": { 
            "type": "string",
            "description": "货币类型"
          },
          "productId": {
            "type": "string",
            "description": "商品ID"
          },
          "quantity": {
            "type": "integer",
            "description": "购买数量"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "description": "创建时间"
          }
        },
        "required": ["orderId", "status", "amount", "currency"]
      },
      "PaymentInput": {
        "type": "object",
        "properties": {
          "orderId": { 
            "type": "string",
            "description": "订单ID"
          },
          "method": { 
            "type": "string",
            "enum": ["crypto", "fiat", "usdc", "sol", "visa", "apple_pay"],
            "description": "支付方式"
          }
        },
        "required": ["orderId"]
      },
      "Payment": {
        "type": "object",
        "properties": {
          "paymentId": { 
            "type": "string",
            "description": "支付ID"
          },
          "paymentUrl": { 
            "type": "string",
            "format": "uri",
            "description": "支付页面URL"
          },
          "status": { 
            "type": "string",
            "enum": ["pending", "processing", "completed", "failed"],
            "description": "支付状态"
          },
          "orderId": {
            "type": "string",
            "description": "关联的订单ID"
          }
        },
        "required": ["paymentId", "status"]
      },
      "Error": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "default": false
          },
          "error": {
            "type": "string",
            "description": "错误代码"
          },
          "message": {
            "type": "string",
            "description": "错误消息"
          }
        },
        "required": ["success", "error", "message"]
      }
    }
  },
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/marketplace/search": {
      "get": {
        "summary": "Search products",
        "description": "搜索商品，支持语义搜索、分类筛选、价格筛选等",
        "operationId": "searchProducts",
        "tags": ["Marketplace"],
        "parameters": [
          {
            "name": "query",
            "in": "query",
            "required": true,
            "schema": { 
              "type": "string",
              "description": "搜索查询（支持自然语言）"
            }
          },
          {
            "name": "category",
            "in": "query",
            "schema": { 
              "type": "string",
              "description": "商品分类"
            }
          },
          {
            "name": "priceMin",
            "in": "query",
            "schema": { 
              "type": "number",
              "description": "最低价格"
            }
          },
          {
            "name": "priceMax",
            "in": "query",
            "schema": { 
              "type": "number",
              "description": "最高价格"
            }
          },
          {
            "name": "currency",
            "in": "query",
            "schema": { 
              "type": "string",
              "default": "CNY",
              "description": "货币类型"
            }
          },
          {
            "name": "inStock",
            "in": "query",
            "schema": { 
              "type": "boolean",
              "description": "是否仅显示有库存商品"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": { 
              "type": "integer",
              "default": 10,
              "minimum": 1,
              "maximum": 100,
              "description": "返回结果数量限制"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Search results",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SearchResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    },
    "/marketplace/products/{id}": {
      "get": {
        "summary": "Get product details",
        "description": "获取商品详情",
        "operationId": "getProduct",
        "tags": ["Marketplace"],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { 
              "type": "string",
              "description": "商品ID"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Product details",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Product"
                }
              }
            }
          },
          "404": {
            "description": "Product not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    },
    "/orders": {
      "post": {
        "summary": "Create an order",
        "description": "创建订单",
        "operationId": "createOrder",
        "tags": ["Orders"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateOrderInput"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Order created",
            "content": {
              "application/json": {
                "schema": { 
                  "$ref": "#/components/schemas/Order"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    },
    "/payments": {
      "post": {
        "summary": "Initiate a payment",
        "description": "创建支付意图，返回支付页面URL",
        "operationId": "initiatePayment",
        "tags": ["Payments"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PaymentInput"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Payment session created",
            "content": {
              "application/json": {
                "schema": { 
                  "$ref": "#/components/schemas/Payment"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 🔧 实现方案

### 1. 创建新的 Controller（推荐）

创建 `backend/src/modules/marketplace/marketplace-gpts.controller.ts`：

```typescript
import { Controller, Get, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SearchService } from '../search/search.service';
import { ProductService } from '../product/product.service';
import { OrderService } from '../order/order.service';
import { PayIntentService } from '../payment/pay-intent.service';

@ApiTags('Marketplace (GPTs)')
@Controller('marketplace')
@Public() // 允许 GPTs 访问
export class MarketplaceGPTsController {
  constructor(
    private searchService: SearchService,
    private productService: ProductService,
    private orderService: OrderService,
    private payIntentService: PayIntentService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search products' })
  @ApiSecurity('ApiKeyAuth')
  async searchProducts(
    @Query('query') query: string,
    @Query('category') category?: string,
    @Query('priceMin') priceMin?: number,
    @Query('priceMax') priceMax?: number,
    @Query('currency') currency?: string,
    @Query('inStock') inStock?: boolean,
    @Query('limit') limit?: number,
    @Headers('x-api-key') apiKey?: string,
  ) {
    // 1. 通过 API Key 识别用户（如果提供）
    const userId = await this.getUserIdFromApiKey(apiKey);
    
    // 2. 调用搜索服务
    const filters: any = {};
    if (category) filters.category = category;
    if (priceMin !== undefined) filters.priceMin = priceMin;
    if (priceMax !== undefined) filters.priceMax = priceMax;
    if (currency) filters.currency = currency;
    if (inStock !== undefined) filters.inStock = inStock;
    
    const result = await this.searchService.semanticSearch(
      query,
      limit || 10,
      filters,
    );
    
    // 3. 转换为标准格式
    return {
      success: true,
      data: {
        items: result.products.map(p => this.formatProduct(p)),
        total: result.total,
        query: query,
      },
      message: `找到 ${result.total} 个相关商品`,
    };
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product details' })
  @ApiSecurity('ApiKeyAuth')
  async getProduct(
    @Param('id') id: string,
    @Headers('x-api-key') apiKey?: string,
  ) {
    const product = await this.productService.getProduct(id);
    if (!product) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: '商品不存在',
      };
    }
    
    return this.formatProduct(product);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create an order' })
  @ApiSecurity('ApiKeyAuth')
  async createOrder(
    @Body() input: any,
    @Headers('x-api-key') apiKey?: string,
  ) {
    // 1. 通过 API Key 识别用户
    const userId = await this.getUserIdFromApiKey(apiKey);
    if (!userId) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: '需要提供有效的 API Key',
      };
    }
    
    // 2. 获取商品信息
    const product = await this.productService.getProduct(input.productId);
    if (!product) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: '商品不存在',
      };
    }
    
    // 3. 创建订单
    const order = await this.orderService.createOrder(userId, {
      merchantId: product.merchantId,
      productId: input.productId,
      amount: Number(product.price) * (input.quantity || 1),
      currency: (product.metadata as any)?.currency || 'CNY',
      metadata: {
        quantity: input.quantity || 1,
        shippingAddress: input.shippingAddress,
        appointmentTime: input.appointmentTime,
        contactInfo: input.contactInfo,
        walletAddress: input.walletAddress,
        chain: input.chain,
      },
    });
    
    return {
      orderId: order.id,
      id: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      productId: order.productId,
      quantity: input.quantity || 1,
      createdAt: order.createdAt,
    };
  }

  @Post('payments')
  @ApiOperation({ summary: 'Initiate a payment' })
  @ApiSecurity('ApiKeyAuth')
  async initiatePayment(
    @Body() input: any,
    @Headers('x-api-key') apiKey?: string,
  ) {
    // 1. 通过 API Key 识别用户
    const userId = await this.getUserIdFromApiKey(apiKey);
    if (!userId) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: '需要提供有效的 API Key',
      };
    }
    
    // 2. 获取订单信息
    const order = await this.orderService.getOrder(userId, input.orderId);
    if (!order) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: '订单不存在',
      };
    }
    
    // 3. 创建支付意图
    const payIntent = await this.payIntentService.createPayIntent(userId, {
      orderId: input.orderId,
      amount: order.amount,
      currency: order.currency || 'CNY',
      type: PayIntentType.ORDER_PAYMENT,
      paymentMethod: {
        type: input.method || 'crypto',
      },
      metadata: {
        paymentMethod: input.method,
      } as any,
    });
    
    // 4. 生成支付页面URL
    const paymentUrl = `${process.env.FRONTEND_URL || 'https://www.agentrix.top'}/payment/${payIntent.id}`;
    
    return {
      paymentId: payIntent.id,
      paymentUrl: paymentUrl,
      status: 'pending',
      orderId: input.orderId,
    };
  }

  // 辅助方法
  private async getUserIdFromApiKey(apiKey?: string): Promise<string | null> {
    if (!apiKey) return null;
    
    // TODO: 实现 API Key 到 User ID 的映射
    // 可以从数据库查询，或使用 JWT Token
    // 临时方案：使用 API Key 作为 User ID（不推荐，仅用于测试）
    return apiKey;
  }

  private formatProduct(product: any): any {
    return {
      id: product.id,
      title: product.name,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: (product.metadata as any)?.currency || 'CNY',
      priceDisplay: `${(product.metadata as any)?.currency || 'CNY'} ${product.price}`,
      image: product.image || product.images?.[0],
      images: product.images || [],
      category: product.category,
      productType: product.productType,
      stock: product.stock,
      inStock: product.stock > 0,
      merchantId: product.merchantId,
      merchantName: product.merchant?.name,
    };
  }
}
```

### 2. 更新 OpenAPI Schema 生成

修改 `openai-integration.controller.ts` 的 `getOpenAPISpec()` 方法，返回优化后的 Schema。

---

## ✅ 实施步骤

1. **创建 MarketplaceGPTsController**
   - 实现所有 REST API 端点
   - 添加 API Key 认证支持

2. **实现 API Key 认证机制**
   - 创建 API Key 表
   - 实现 API Key 到 User ID 的映射

3. **更新 OpenAPI Schema**
   - 使用优化后的 Schema
   - 确保格式正确

4. **测试**
   - 在 GPTs 中导入 OpenAPI Schema
   - 测试所有端点

---

## 🎯 总结

**优化后的 Schema 优点**：
- ✅ 符合 GPTs Actions 标准
- ✅ 支持完整的电商流程
- ✅ 包含认证机制
- ✅ 错误处理完善
- ✅ 参数支持完整

**需要实现**：
- ⚠️ 创建 MarketplaceGPTsController
- ⚠️ 实现 API Key 认证
- ⚠️ 更新 OpenAPI Schema 生成

