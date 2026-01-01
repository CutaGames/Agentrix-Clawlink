import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SkillService } from '../skill/skill.service';
import { SkillExecutorService } from '../skill/skill-executor.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { ProductService } from '../product/product.service';
import { PaymentService } from '../payment/payment.service';
import { WalletService } from '../wallet/wallet.service';
import { AgentAuthorizationService } from '../agent-authorization/agent-authorization.service';
import { AirdropService } from '../auto-earn/airdrop.service';
import { AutoEarnService } from '../auto-earn/auto-earn.service';
import { PaymentMethod } from '../../entities/payment.entity';

@Injectable()
export class McpService implements OnModuleInit {
  private readonly logger = new Logger(McpService.name);
  private server: Server;
  private isInitialized = false;
  
  // 维护 sessionId -> transport 的映射
  private transports: Map<string, any> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly skillService: SkillService,
    private readonly skillExecutorService: SkillExecutorService,
    private readonly marketplaceService: MarketplaceService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    private readonly paymentService: PaymentService,
    private readonly walletService: WalletService,
    private readonly agentAuthorizationService: AgentAuthorizationService,
    private readonly airdropService: AirdropService,
    private readonly autoEarnService: AutoEarnService,
  ) {
    this.server = new Server(
      {
        name: 'agentrix-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        } as any,
      },
    );
  }

  async onModuleInit() {
    const enableMcp = this.configService.get('ENABLE_MCP') !== 'false';
    if (!enableMcp) {
      this.logger.warn('MCP Server is disabled via ENABLE_MCP config');
      return;
    }

    // 异步初始化，避免阻塞主进程启动
    setTimeout(() => {
      try {
        this.setupTools();
        this.isInitialized = true;
        this.logger.log('MCP Server initialized successfully (Async)');
      } catch (error: any) {
        this.logger.error(`Failed to initialize MCP Server: ${error.message}`);
      }
    }, 1000);
  }

  public getCapabilities() {
    // MCP Server 支持两种认证模式：
    // 1. no-auth：无需认证，直接访问
    // 2. OAuth：通过 OAuth2 授权码流认证
    return {
      tools: {},
      resources: {},
      prompts: {},
      logging: {},
    };
  }

  private setupTools() {
    // 1. 处理 Tool 列表请求
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.getAllTools();
      return { tools };
    });

    // 2. 处理 Tool 调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return this.handleCallTool(name, args);
    });
  }

  /**
   * 获取所有可用的 Tools 列表
   */
  private async getAllTools() {
    let dynamicTools = [];
    try {
      const skills = await this.skillService.findAll();
      dynamicTools = skills.map(skill => ({
        name: skill.name.replace(/[^a-zA-Z0-9_]/g, '_'),
        description: skill.description,
        inputSchema: {
          type: 'object',
          properties: skill.inputSchema.properties,
          required: skill.inputSchema.required || [],
        },
      }));
    } catch (error: any) {
      this.logger.error(`Failed to load dynamic skills for MCP: ${error.message}`);
      // 即使数据库表缺失，也继续返回静态工具，不抛出异常
    }

    const staticTools = [
      {
        name: 'search_products',
        description: 'Search products in Agentrix Marketplace. Supports physical goods (like CUTA gaming console, electronics), services, and digital assets (tokens, NFTs).',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (e.g. "CUTA游戏机", "VR", "gaming console")' },
            type: { type: 'string', enum: ['physical', 'service', 'digital', 'x402'], description: 'Product type filter' },
          },
          required: ['query']
        }
      },
      {
        name: 'get_product_details',
        description: 'Get detailed information about a specific product by ID',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID' }
          },
          required: ['productId']
        }
      },
      {
        name: 'create_order',
        description: 'Create a new order for purchasing a product. Returns order details and checkout URL.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID to purchase' },
            quantity: { type: 'number', description: 'Quantity to purchase', default: 1 },
            shippingAddress: { 
              type: 'object',
              description: 'Shipping address for physical products',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' }
              }
            }
          },
          required: ['productId']
        }
      },
      {
        name: 'get_checkout_url',
        description: 'Get a payment checkout URL for an order or product',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID to checkout' },
            orderId: { type: 'string', description: 'Order ID if already created' }
          },
          required: []
        }
      },
      {
        name: 'create_pay_intent',
        description: 'Create a payment intent for a product',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID' },
            quantity: { type: 'number', default: 1 }
          },
          required: ['productId']
        }
      },
      {
        name: 'purchase_asset',
        description: 'Quickly purchase a virtual asset or product by name. Just provide the asset name and quantity.',
        inputSchema: {
          type: 'object',
          properties: {
            assetName: { type: 'string', description: 'Name of the asset to purchase (e.g. "Gold Coins", "Premium Membership")' },
            quantity: { type: 'number', description: 'Quantity to purchase', default: 1 }
          },
          required: ['assetName']
        }
      },
      {
        name: 'get_balance',
        description: 'Get user wallet balance',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            chain: { type: 'string', description: 'Chain (e.g. bsc, ethereum)' }
          },
          required: ['userId']
        }
      },
      {
        name: 'agent_authorize',
        description: 'Create a payment authorization for an AI Agent',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: { type: 'string', description: 'Agent ID' },
            userId: { type: 'string', description: 'User ID' },
            durationDays: { type: 'number', description: 'Duration in days', default: 30 }
          },
          required: ['agentId', 'userId']
        }
      },
      {
        name: 'airdrop_discover',
        description: 'Discover available crypto airdrops',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' }
          },
          required: ['userId']
        }
      },
      {
        name: 'autoearn_stats',
        description: 'Get auto-earn statistics',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' }
          },
          required: ['userId']
        }
      }
    ];

    return [...staticTools, ...dynamicTools];
  }

  /**
   * 公开方法：获取工具列表（供无状态模式使用）
   */
  public async getToolsList() {
    return this.getAllTools();
  }

  /**
   * 统一处理 Tool 调用逻辑
   */
  private async handleCallTool(name: string, args: any) {
    this.logger.log(`Tool Call: ${name} with args: ${JSON.stringify(args)}`);

    try {
      // ============ E-Commerce Tools ============
      if (name === 'search_products') {
        // Search from products table (physical goods, services, digital assets)
        const products = await this.productService.getProducts(
          (args as any).query,  // search query
          undefined,             // merchantId - search all merchants
          'active',              // only active products
          (args as any).type     // type filter (physical, service, digital, x402)
        );
        
        // Format results for AI-friendly response
        const formattedProducts = products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          currency: p.metadata?.currency || 'CNY',
          type: p.productType,
          category: p.category,
          stock: p.stock,
          image: p.metadata?.image,
          checkoutUrl: `https://agentrix.top/pay/checkout?productId=${p.id}`
        }));
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              products: formattedProducts,
              total: formattedProducts.length,
              message: formattedProducts.length > 0 
                ? `Found ${formattedProducts.length} products matching "${args.query}"`
                : `No products found for "${args.query}". Try a different search term.`
            }) 
          }],
        };
      }

      if (name === 'get_product_details') {
        const product = await this.productService.getProduct(args.productId);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.price,
              currency: product.metadata?.currency || 'CNY',
              type: product.productType,
              category: product.category,
              stock: product.stock,
              image: product.metadata?.image,
              checkoutUrl: `https://agentrix.top/pay/checkout?productId=${product.id}`,
              merchantId: product.merchantId
            }) 
          }],
        };
      }

      if (name === 'create_order') {
        // For now, return a checkout URL - full order creation would require OrderService
        const product = await this.productService.getProduct(args.productId);
        const quantity = args.quantity || 1;
        const totalPrice = Number(product.price) * quantity;
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: true,
              product: {
                id: product.id,
                name: product.name,
                price: product.price,
                currency: product.metadata?.currency || 'CNY'
              },
              quantity: quantity,
              totalPrice: totalPrice,
              checkoutUrl: `https://agentrix.top/pay/checkout?productId=${product.id}&quantity=${quantity}`,
              message: `Order created for ${quantity}x ${product.name}. Total: ${totalPrice} ${product.metadata?.currency || 'CNY'}. Click the checkout URL to complete payment.`
            }) 
          }],
        };
      }

      if (name === 'get_checkout_url') {
        if (args.productId) {
          const product = await this.productService.getProduct(args.productId);
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify({
                checkoutUrl: `https://agentrix.top/pay/checkout?productId=${args.productId}`,
                product: {
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  currency: product.metadata?.currency || 'CNY'
                }
              }) 
            }],
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Please provide productId' }) }],
        };
      }

      if (name === 'create_pay_intent') {
        const intent = await this.paymentService.createPaymentIntent(args.userId, {
          amount: args.amount,
          currency: args.currency || 'CNY',
          paymentMethod: args.paymentMethod || PaymentMethod.STRIPE,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(intent) }],
        };
      }

      if (name === 'purchase_asset') {
        const assetName = args.assetName;
        const quantity = args.quantity || 1;
        
        // Search for the product by name
        const products = await this.productService.getProducts(assetName, undefined, 'active');
        
        if (!products || products.length === 0) {
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify({ 
                success: false, 
                message: `Could not find any asset named "${assetName}". Please try a different name or search for products first.` 
              }) 
            }],
          };
        }
        
        // Take the first match
        const product = products[0];
        const totalPrice = Number(product.price) * quantity;
        const currency = product.metadata?.currency || 'CNY';
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: true,
              product: {
                id: product.id,
                name: product.name,
                price: product.price,
                currency: currency
              },
              quantity: quantity,
              totalPrice: totalPrice,
              checkoutUrl: `https://agentrix.top/pay/checkout?productId=${product.id}&quantity=${quantity}`,
              message: `Ready to purchase ${quantity}x ${product.name}. Total: ${totalPrice} ${currency}. Click the checkout URL to complete payment.`
            }) 
          }],
        };
      }

      if (name === 'get_balance') {
        const balance = await this.walletService.getWalletBalance(args.userId, args.chain);
        return {
          content: [{ type: 'text', text: JSON.stringify(balance) }],
        };
      }

      if (name === 'agent_authorize') {
        const auth = await this.agentAuthorizationService.createAgentAuthorization({
          userId: args.userId,
          agentId: args.agentId,
          authorizationType: args.authorizationType || 'session',
          expiry: args.durationDays ? new Date(Date.now() + args.durationDays * 24 * 60 * 60 * 1000) : undefined,
        } as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(auth) }],
        };
      }

      if (name === 'airdrop_discover') {
        const airdrops = await this.airdropService.discoverAirdrops(args.userId);
        return {
          content: [{ type: 'text', text: JSON.stringify(airdrops) }],
        };
      }

      if (name === 'autoearn_stats') {
        const stats = await this.autoEarnService.getStats(args.userId);
        return {
          content: [{ type: 'text', text: JSON.stringify(stats) }],
        };
      }

      // 尝试动态 Skills
      try {
        const skills = await this.skillService.findAll();
        const skill = skills.find(s => s.name.replace(/[^a-zA-Z0-9_]/g, '_') === name);
        if (skill) {
          const result = await this.skillExecutorService.execute(skill.id, args);
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        }
      } catch (error: any) {
        this.logger.error(`Dynamic skill execution failed: ${error.message}`);
      }

      return {
        isError: true,
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      };
    } catch (error: any) {
      this.logger.error(`Tool execution failed: ${error.message}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${error.message}` }],
      };
    }
  }

  /**
   * 连接 Transport 并注册到 session 映射
   */
  async connectTransport(transport: any): Promise<string> {
    // 获取 transport 的 sessionId（如果有的话）
    const sessionId = transport.sessionId || transport._sessionId || 
      `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 存储到映射
    this.transports.set(sessionId, transport);
    this.logger.log(`Registered transport with sessionId: ${sessionId}`);
    
    // 监听连接关闭，清理映射
    if (transport.onclose) {
      const originalOnClose = transport.onclose;
      transport.onclose = () => {
        this.transports.delete(sessionId);
        this.logger.log(`Removed transport for sessionId: ${sessionId}`);
        originalOnClose?.();
      };
    }
    
    await this.server.connect(transport);
    return sessionId;
  }

  /**
   * 根据 sessionId 获取 transport
   */
  getTransport(sessionId: string): any {
    return this.transports.get(sessionId);
  }

  /**
   * 获取最新的 transport（用于单用户兼容）
   */
  getLatestTransport(): any {
    const entries = Array.from(this.transports.entries());
    if (entries.length === 0) return null;
    return entries[entries.length - 1][1];
  }

  /**
   * REST 桥接：执行 Tool 调用
   */
  async callTool(name: string, args: any) {
    return this.handleCallTool(name, args);
  }

  /**
   * 获取 OpenAPI Schema (用于 ChatGPT GPTs / Gemini / Grok)
   * 必须包含 servers 字段，否则 ChatGPT 无法识别
   * 响应 schema 必须包含 properties，否则 ChatGPT 验证会报错
   */
  async getOpenApiSchema() {
    const tools = await this.getAllTools();

    const paths = {};
    for (const tool of tools) {
      // 为每个工具生成完整的响应 schema
      const responseSchema = {
        type: 'object',
        properties: {
          content: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Content type, usually "text"'
                },
                text: {
                  type: 'string',
                  description: 'The response content in JSON string format'
                }
              },
              required: ['type', 'text']
            },
            description: 'Response content array'
          },
          isError: {
            type: 'boolean',
            description: 'Whether the operation resulted in an error'
          }
        },
        required: ['content']
      };

      paths[`/api/mcp/tool/${tool.name}`] = {
        post: {
          operationId: tool.name,
          summary: tool.description,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: tool.inputSchema,
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: responseSchema,
                },
              },
            },
            '400': {
              description: 'Bad request - invalid parameters',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', description: 'Error message' },
                      statusCode: { type: 'number', description: 'HTTP status code' }
                    },
                    required: ['error']
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', description: 'Error message' },
                      statusCode: { type: 'number', description: 'HTTP status code' }
                    },
                    required: ['error']
                  },
                },
              },
            },
          },
        },
      };
    }

    // 获取 API 基础 URL
    const apiBaseUrl = this.configService.get<string>('API_BASE_URL') || 'https://api.agentrix.top';

    return {
      openapi: '3.1.0',
      info: {
        title: 'Agentrix MCP Tools API',
        version: '1.0.0',
        description: 'REST API bridge for Agentrix MCP Tools. Use these tools to search products, create payments, and interact with the Agentrix marketplace.',
      },
      // ChatGPT GPTs 必须有 servers 字段
      servers: [
        {
          url: apiBaseUrl,
          description: 'Agentrix API Server',
        },
      ],
      paths,
    };
  }
}

