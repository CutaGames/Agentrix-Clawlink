import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SkillService } from '../skill/skill.service';
import { SkillExecutorService } from '../skill/skill-executor.service';
import { DynamicToolAdapter } from '../skill/dynamic-tool-adapter.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { ProductService } from '../product/product.service';
import { PaymentService } from '../payment/payment.service';
import { WalletService } from '../wallet/wallet.service';
import { AgentAuthorizationService } from '../agent-authorization/agent-authorization.service';
import { AirdropService } from '../auto-earn/airdrop.service';
import { AutoEarnService } from '../auto-earn/auto-earn.service';
import { QuickPayGrantService } from '../payment/quick-pay-grant.service';
import { GuestCheckoutService } from './guest-checkout.service';
import { AgentWalletService } from './agent-wallet.service';
import { PaymentMethod } from '../../entities/payment.entity';
import { getUCPMCPTools } from '../ucp/mcp/ucp-mcp.tools';
import { commerceMcpTools } from '../commerce/commerce-mcp.tools';
import { UCPService } from '../ucp/ucp.service';
import { CommerceService, CommerceAction, CommerceMode } from '../commerce/commerce.service';
import { A2AService } from '../a2a/a2a.service';
import { a2aMcpTools } from '../a2a/a2a-mcp.tools';

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
    private readonly dynamicToolAdapter: DynamicToolAdapter,
    private readonly marketplaceService: MarketplaceService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    private readonly paymentService: PaymentService,
    private readonly walletService: WalletService,
    private readonly agentAuthorizationService: AgentAuthorizationService,
    private readonly airdropService: AirdropService,
    private readonly autoEarnService: AutoEarnService,
    private readonly quickPayGrantService: QuickPayGrantService,
    private readonly guestCheckoutService: GuestCheckoutService,
    private readonly agentWalletService: AgentWalletService,
    @Inject(forwardRef(() => UCPService))
    private readonly ucpService: UCPService,
    @Inject(forwardRef(() => CommerceService))
    private readonly commerceService: CommerceService,
    @Inject(forwardRef(() => A2AService))
    private readonly a2aService: A2AService,
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
      // ============ 基础设施类 Skills (Infrastructure) ============
      {
        name: 'wallet_onboarding',
        description: 'Create or check MPC wallet for the user. Users can receive and send crypto without managing private keys.',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['create', 'check', 'info'], description: 'Action to perform', default: 'check' }
          },
          required: []
        }
      },
      {
        name: 'onramp_fiat',
        description: 'Convert fiat currency (USD, EUR, CNY) to crypto (USDC, ETH). Returns a payment link for credit card or bank transfer.',
        inputSchema: {
          type: 'object',
          properties: {
            fiatAmount: { type: 'number', description: 'Amount in fiat currency to convert' },
            fiatCurrency: { type: 'string', enum: ['USD', 'EUR', 'CNY', 'GBP', 'JPY'], description: 'Fiat currency', default: 'USD' },
            cryptoCurrency: { type: 'string', enum: ['USDC', 'USDT', 'ETH', 'BNB', 'SOL'], description: 'Target crypto', default: 'USDC' },
            walletAddress: { type: 'string', description: 'Wallet address to receive crypto' }
          },
          required: ['fiatAmount']
        }
      },
      {
        name: 'balance_query',
        description: 'Query wallet balance across multiple chains. Returns balances for USDC, ETH, BNB, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            walletAddress: { type: 'string', description: 'Wallet address to query' },
            chain: { type: 'string', enum: ['bsc', 'ethereum', 'polygon', 'solana', 'all'], description: 'Chain to query', default: 'all' }
          },
          required: []
        }
      },
      {
        name: 'agent_authorize',
        description: 'Set spending limits for AI Agent. Allows automatic payments within the authorized amount.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: { type: 'string', description: 'Agent ID to authorize' },
            singleLimit: { type: 'number', description: 'Max amount per single transaction (in USDC)', default: 10 },
            dailyLimit: { type: 'number', description: 'Max daily spending limit (in USDC)', default: 50 },
            durationDays: { type: 'number', description: 'Authorization duration in days', default: 30 }
          },
          required: ['agentId']
        }
      },
      // ============ 商业零售类 Skills (Retail) ============
      {
        name: 'search_products',
        description: 'Search products in Agentrix Marketplace. Supports physical goods, services, digital assets, and X402 skills.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (e.g. "AI翻译", "游戏机", "VR headset")' },
            type: { type: 'string', enum: ['physical', 'service', 'digital', 'x402_skill', 'x402_metered'], description: 'Product type filter' },
            maxPrice: { type: 'number', description: 'Maximum price filter' }
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
      // ============ 增值服务类 Skills (Growth) ============
      {
        name: 'airdrop_discover',
        description: 'Discover available crypto airdrops that the user can claim',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['defi', 'nft', 'gaming', 'all'], description: 'Airdrop category filter', default: 'all' }
          },
          required: []
        }
      },
      {
        name: 'autoearn_stats',
        description: 'Get auto-earn statistics and passive income summary',
        inputSchema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['today', 'week', 'month', 'all'], description: 'Time period', default: 'week' }
          },
          required: []
        }
      },
      // ============ 兼容性保留 ============
      {
        name: 'get_balance',
        description: '[Legacy] Get user wallet balance - use balance_query instead',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            chain: { type: 'string', description: 'Chain (e.g. bsc, ethereum)' }
          },
          required: ['userId']
        }
      },
      // ============ Phase 1-3: 对话内购物闭环 (In-Chat Commerce) ============
      {
        name: 'quick_purchase',
        description: '一键购买商品。支持已授权用户直接扣款，或为游客生成支付链接。无需跳转即可在对话内完成购物。',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: '商品ID（从 search_products 获取）' },
            quantity: { type: 'number', description: '购买数量', default: 1 },
            email: { type: 'string', description: '邮箱地址（游客必填，用于接收订单确认）' },
            shippingAddress: {
              type: 'object',
              description: '收货地址（实物商品必填）',
              properties: {
                name: { type: 'string', description: '收件人姓名' },
                phone: { type: 'string', description: '联系电话' },
                address: { type: 'string', description: '详细地址' },
                city: { type: 'string', description: '城市' },
                country: { type: 'string', description: '国家', default: 'China' }
              }
            }
          },
          required: ['productId']
        }
      },
      {
        name: 'prepare_checkout',
        description: '准备结账。为商品创建待支付订单，返回支付确认信息。用户确认后调用 confirm_payment 完成支付。',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: '商品ID' },
            quantity: { type: 'number', description: '购买数量', default: 1 },
            email: { type: 'string', description: '邮箱地址' }
          },
          required: ['productId']
        }
      },
      {
        name: 'confirm_payment',
        description: '确认支付。用户明确表示"确认"或"支付"后调用此工具完成扣款。',
        inputSchema: {
          type: 'object',
          properties: {
            intentId: { type: 'string', description: '支付意图ID（从 prepare_checkout 获取）' },
            guestSessionId: { type: 'string', description: '游客会话ID（如适用）' }
          },
          required: ['intentId']
        }
      },
      {
        name: 'collect_user_info',
        description: '收集用户信息。在购物流程中收集邮箱或收货地址。',
        inputSchema: {
          type: 'object',
          properties: {
            infoType: { type: 'string', enum: ['email', 'shipping', 'both'], description: '需要收集的信息类型' },
            email: { type: 'string', description: '用户提供的邮箱' },
            shippingAddress: {
              type: 'object',
              description: '用户提供的收货地址',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' }
              }
            },
            guestSessionId: { type: 'string', description: '游客会话ID' }
          },
          required: ['infoType']
        }
      },
      {
        name: 'check_payment_status',
        description: '查询支付状态。检查订单是否已支付完成。',
        inputSchema: {
          type: 'object',
          properties: {
            intentId: { type: 'string', description: '支付意图ID' },
            guestSessionId: { type: 'string', description: '游客会话ID' }
          },
          required: []
        }
      },
      {
        name: 'setup_quickpay',
        description: '设置快速支付授权。允许 Agent 在限额内自动完成支付，无需每次确认。',
        inputSchema: {
          type: 'object',
          properties: {
            maxAmount: { type: 'number', description: '单笔最大金额', default: 100 },
            dailyLimit: { type: 'number', description: '每日限额', default: 500 },
            paymentMethod: { type: 'string', enum: ['stripe', 'wallet', 'crypto'], description: '支付方式', default: 'stripe' }
          },
          required: []
        }
      },
      // ============ 钱包与身份管理 (Wallet & Identity) ============
      {
        name: 'create_wallet',
        description: '创建 Agentrix MPC 钱包和 AX ID。用户无需管理私钥，即可安全持有和使用加密资产。支持在对话中直接完成。',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: '邮箱地址（用于账户恢复和通知）' }
          },
          required: []
        }
      },
      {
        name: 'get_wallet_balance',
        description: '查询钱包余额。返回 USDC、ETH 等资产余额及约等于的法币价值。',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'topup_wallet',
        description: '充值钱包。支持信用卡、Google Pay、Apple Pay、支付宝、微信等多种方式将法币转为加密货币。',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: '充值金额' },
            currency: { type: 'string', enum: ['CNY', 'USD', 'EUR'], description: '法币类型', default: 'CNY' },
            method: { type: 'string', enum: ['stripe', 'google_pay', 'apple_pay', 'alipay', 'wechat_pay'], description: '支付方式' }
          },
          required: ['amount']
        }
      },
      {
        name: 'setup_agent_authorization',
        description: '设置 Agent 支付授权。允许 AI Agent 在限额内自动完成支付，适用于 API 调用、订阅服务等场景。',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['quickpay', 'x402', 'both'], description: '授权类型', default: 'both' },
            singleLimit: { type: 'number', description: '单笔限额（元）', default: 100 },
            dailyLimit: { type: 'number', description: '每日限额（元）', default: 500 }
          },
          required: []
        }
      },
      {
        name: 'pay_with_wallet',
        description: '使用钱包余额支付。适用于已授权用户直接从钱包扣款，无需跳转。',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: '支付金额' },
            currency: { type: 'string', description: '币种', default: 'USDC' },
            productId: { type: 'string', description: '商品ID（可选）' },
            description: { type: 'string', description: '支付说明（可选）' }
          },
          required: ['amount']
        }
      },
      // ============ 订阅与 API 计费 (Subscription & API Billing) ============
      {
        name: 'subscribe_service',
        description: '订阅服务。支持按月/按年订阅，自动从钱包扣款。',
        inputSchema: {
          type: 'object',
          properties: {
            serviceId: { type: 'string', description: '服务ID' },
            plan: { type: 'string', enum: ['monthly', 'yearly'], description: '订阅周期', default: 'monthly' },
            autoRenew: { type: 'boolean', description: '是否自动续费', default: true }
          },
          required: ['serviceId']
        }
      },
      {
        name: 'pay_api_usage',
        description: '支付 API 调用费用。支持按次计费或按量计费的 API 服务。',
        inputSchema: {
          type: 'object',
          properties: {
            apiId: { type: 'string', description: 'API 服务ID' },
            usage: { type: 'number', description: '使用量（次数或单位）' },
            usageType: { type: 'string', enum: ['calls', 'tokens', 'data', 'time'], description: '计费类型', default: 'calls' }
          },
          required: ['apiId', 'usage']
        }
      },
      {
        name: 'check_subscription_status',
        description: '查询订阅状态。返回当前订阅的服务列表、到期时间、费用等信息。',
        inputSchema: {
          type: 'object',
          properties: {
            serviceId: { type: 'string', description: '服务ID（可选，不填返回所有订阅）' }
          },
          required: []
        }
      },
      // ============ X402 微支付 (X402 Micropayments) ============
      {
        name: 'x402_pay',
        description: 'X402 协议支付。用于 API 访问、内容付费等微支付场景，支持按次/按量自动扣款。',
        inputSchema: {
          type: 'object',
          properties: {
            resourceUrl: { type: 'string', description: 'X402 资源 URL' },
            maxPrice: { type: 'number', description: '最大可接受价格（USDC）' }
          },
          required: ['resourceUrl']
        }
      },
      {
        name: 'x402_authorize',
        description: '设置 X402 授权。允许自动支付符合条件的 X402 请求。',
        inputSchema: {
          type: 'object',
          properties: {
            singleLimit: { type: 'number', description: '单次最大金额', default: 1 },
            dailyLimit: { type: 'number', description: '每日限额', default: 10 },
            allowedDomains: { type: 'array', items: { type: 'string' }, description: '允许的域名列表' }
          },
          required: []
        }
      },
      // ============ Agent 生态标准化支付 (Agent Ecosystem Payment) ============
      {
        name: 'agent_payment',
        description: '🤖 Agent 支付技能 - 让任何 AI Agent 一秒具备收付款能力。支持自然语言意图支付、直接支付和多方分账。',
        inputSchema: {
          type: 'object',
          properties: {
            intent: { 
              type: 'string', 
              description: '支付意图的自然语言描述。如: "支付100U给翻译Agent，从上周的预存款扣"' 
            },
            amount: { type: 'number', description: '支付金额（USDC）' },
            recipientAgentId: { type: 'string', description: '收款 Agent ID' },
            recipientAddress: { type: 'string', description: '收款钱包地址' },
            taskId: { type: 'string', description: '关联任务ID（用于 Audit Proof）' },
            sessionId: { type: 'string', description: 'ERC8004 Session ID（用于预存款扣款）' },
            currency: { type: 'string', enum: ['USDC', 'USDT'], default: 'USDC', description: '支付币种' },
            description: { type: 'string', description: '支付说明' },
            splitConfig: {
              type: 'object',
              description: '分账配置（多方分账时使用）',
              properties: {
                totalAmount: { type: 'number', description: '总金额' },
                recipients: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      address: { type: 'string' },
                      share: { type: 'number', description: '分成比例 (basis points, 10000=100%)' },
                      role: { type: 'string', enum: ['merchant', 'agent', 'referrer', 'platform'] }
                    }
                  }
                }
              }
            }
          },
          required: []
        }
      },
      {
        name: 'agent_payment_confirm',
        description: '确认 Agent 支付。用户明确表示"确认"后调用此工具完成支付执行。',
        inputSchema: {
          type: 'object',
          properties: {
            confirmationId: { type: 'string', description: '支付确认ID（从 agent_payment 返回）' }
          },
          required: ['confirmationId']
        }
      },
      {
        name: 'agent_payment_reject',
        description: '拒绝 Agent 支付。用户表示"取消"或"不要"时调用。',
        inputSchema: {
          type: 'object',
          properties: {
            confirmationId: { type: 'string', description: '支付确认ID' },
            reason: { type: 'string', description: '拒绝原因' }
          },
          required: ['confirmationId']
        }
      },
      {
        name: 'submit_audit_proof',
        description: '提交任务完成证明（Audit Proof）。任务完成后调用此工具触发自动分账。',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: '任务ID' },
            orderId: { type: 'string', description: '订单ID' },
            resultHash: { type: 'string', description: '任务结果哈希' },
            proofData: { 
              type: 'object', 
              description: '证明数据',
              properties: {
                completedAt: { type: 'string', description: '完成时间' },
                quality: { type: 'number', description: '质量评分 (0-100)' },
                deliverables: { type: 'array', items: { type: 'string' }, description: '交付物列表' }
              }
            },
            signatures: { type: 'array', items: { type: 'string' }, description: '多方签名' }
          },
          required: ['taskId', 'orderId', 'resultHash']
        }
      }
    ];

    // Phase 2: 加载 Product as Skill（动态商品工具）
    let productSkills = [];
    try {
      productSkills = await this.dynamicToolAdapter.getAllDynamicTools();
      this.logger.log(`Loaded ${productSkills.length} product skills`);
    } catch (error: any) {
      this.logger.error(`Failed to load product skills: ${error.message}`);
    }

    // UCP MCP Tools - Universal Commerce Protocol
    const ucpTools = getUCPMCPTools();
    this.logger.log(`Loaded ${ucpTools.length} UCP MCP tools`);

    // Commerce MCP Tools - Unified Commerce Skill
    this.logger.log(`Loaded ${commerceMcpTools.length} Commerce MCP tools`);

    // A2A MCP Tools - Agent-to-Agent Task Management
    this.logger.log(`Loaded ${a2aMcpTools.length} A2A MCP tools`);

    return [...staticTools, ...dynamicTools, ...productSkills, ...ucpTools, ...commerceMcpTools, ...a2aMcpTools];
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
      // ============ 基础设施类 Skills ============
      if (name === 'wallet_onboarding') {
        const action = args.action || 'check';
        // TODO: 实际实现需要注入 MPCWalletService
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              action,
              message: action === 'create' 
                ? '钱包创建功能已就绪。请先登录 Agentrix 以完成身份验证。登录后将自动为您创建 MPC 托管钱包。'
                : '请登录 Agentrix 查看您的钱包状态。如果您还没有钱包，登录后可以免费创建一个。',
              loginUrl: 'https://agentrix.top/login',
              hint: 'MPC 钱包无需管理私钥，安全便捷。'
            })
          }],
        };
      }

      if (name === 'onramp_fiat') {
        const { fiatAmount, fiatCurrency = 'USD', cryptoCurrency = 'USDC', walletAddress } = args;
        
        if (!fiatAmount || fiatAmount <= 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'INVALID_AMOUNT',
                message: '请提供有效的充值金额。例如："充值 100 美元"'
              })
            }],
          };
        }

        // 生成 Transak 入金链接
        const transakUrl = `https://global.transak.com/?apiKey=${process.env.TRANSAK_API_KEY || 'demo'}&fiatAmount=${fiatAmount}&fiatCurrency=${fiatCurrency}&cryptoCurrencyCode=${cryptoCurrency}&walletAddress=${walletAddress || ''}&network=bsc`;
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              fiatAmount,
              fiatCurrency,
              cryptoCurrency,
              checkoutUrl: transakUrl,
              message: `已为您创建 ${fiatAmount} ${fiatCurrency} -> ${cryptoCurrency} 的充值订单。点击链接使用信用卡或银行转账完成支付。`,
              note: walletAddress ? `资金将发送到: ${walletAddress}` : '请先创建或绑定钱包地址'
            })
          }],
        };
      }

      if (name === 'balance_query') {
        const { walletAddress, chain = 'all' } = args;
        // TODO: 实际实现需要调用链上 RPC 或缓存服务
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              walletAddress: walletAddress || '请提供钱包地址',
              balances: walletAddress ? [
                { chain: 'bsc', token: 'USDC', balance: '0.00', usdValue: '0.00' },
                { chain: 'bsc', token: 'BNB', balance: '0.00', usdValue: '0.00' },
              ] : [],
              message: walletAddress 
                ? '余额查询完成。如需充值，请使用 onramp_fiat 功能。'
                : '请提供钱包地址以查询余额，或使用 wallet_onboarding 创建新钱包。'
            })
          }],
        };
      }

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

      // ============ Phase 1-3: 对话内购物闭环工具处理 ============
      
      // quick_purchase: 一键购买（支持授权用户和游客）
      if (name === 'quick_purchase') {
        return this.handleQuickPurchase(args);
      }

      // prepare_checkout: 准备结账
      if (name === 'prepare_checkout') {
        return this.handlePrepareCheckout(args);
      }

      // confirm_payment: 确认支付
      if (name === 'confirm_payment') {
        return this.handleConfirmPayment(args);
      }

      // collect_user_info: 收集用户信息
      if (name === 'collect_user_info') {
        return this.handleCollectUserInfo(args);
      }

      // check_payment_status: 查询支付状态
      if (name === 'check_payment_status') {
        return this.handleCheckPaymentStatus(args);
      }

      // setup_quickpay: 设置快速支付
      if (name === 'setup_quickpay') {
        return this.handleSetupQuickPay(args);
      }

      // Phase 2: 处理动态商品工具（buy_xxx）
      if (name.startsWith('buy_') || name.startsWith('skill_')) {
        return this.handleDynamicProductTool(name, args);
      }

      // ============ 钱包与支付工具处理 ============
      
      // create_wallet: 创建钱包
      if (name === 'create_wallet') {
        return this.handleCreateWallet(args);
      }

      // get_wallet_balance: 查询余额
      if (name === 'get_wallet_balance') {
        return this.handleGetWalletBalance(args);
      }

      // topup_wallet: 充值
      if (name === 'topup_wallet') {
        return this.handleTopupWallet(args);
      }

      // setup_agent_authorization: 设置授权
      if (name === 'setup_agent_authorization') {
        return this.handleSetupAgentAuthorization(args);
      }

      // pay_with_wallet: 钱包支付
      if (name === 'pay_with_wallet') {
        return this.handlePayWithWallet(args);
      }

      // subscribe_service: 订阅服务
      if (name === 'subscribe_service') {
        return this.handleSubscribeService(args);
      }

      // pay_api_usage: 支付 API 费用
      if (name === 'pay_api_usage') {
        return this.handlePayApiUsage(args);
      }

      // check_subscription_status: 查询订阅
      if (name === 'check_subscription_status') {
        return this.handleCheckSubscriptionStatus(args);
      }

      // x402_pay: X402 支付
      if (name === 'x402_pay') {
        return this.handleX402Pay(args);
      }

      // x402_authorize: X402 授权
      if (name === 'x402_authorize') {
        return this.handleX402Authorize(args);
      }

      // ============ Agent 生态标准化支付工具处理 ============
      
      // agent_payment: Agent 支付技能
      if (name === 'agent_payment') {
        return this.handleAgentPayment(args);
      }

      // agent_payment_confirm: 确认 Agent 支付
      if (name === 'agent_payment_confirm') {
        return this.handleAgentPaymentConfirm(args);
      }

      // agent_payment_reject: 拒绝 Agent 支付
      if (name === 'agent_payment_reject') {
        return this.handleAgentPaymentReject(args);
      }

      // submit_audit_proof: 提交 Audit Proof
      if (name === 'submit_audit_proof') {
        return this.handleSubmitAuditProof(args);
      }

      // ============ UCP MCP Tools ============
      if (name === 'ucp_create_checkout') {
        return this.handleUCPCreateCheckout(args);
      }
      if (name === 'ucp_get_checkout') {
        return this.handleUCPGetCheckout(args);
      }
      if (name === 'ucp_update_checkout') {
        return this.handleUCPUpdateCheckout(args);
      }
      if (name === 'ucp_complete_checkout') {
        return this.handleUCPCompleteCheckout(args);
      }
      if (name === 'ucp_cancel_checkout') {
        return this.handleUCPCancelCheckout(args);
      }
      if (name === 'ucp_discover_business') {
        return this.handleUCPDiscoverBusiness(args);
      }
      if (name === 'ucp_get_payment_handlers') {
        return this.handleUCPGetPaymentHandlers(args);
      }
      if (name === 'ucp_get_order') {
        return this.handleUCPGetOrder(args);
      }
      if (name === 'ucp_list_orders') {
        return this.handleUCPListOrders(args);
      }
      if (name === 'ucp_create_mandate') {
        return this.handleUCPCreateMandate(args);
      }
      if (name === 'ucp_verify_mandate') {
        return this.handleUCPVerifyMandate(args);
      }
      if (name === 'ucp_revoke_mandate') {
        return this.handleUCPRevokeMandate(args);
      }
      // Platform capability tools
      if (name === 'ucp_platform_discover') {
        return this.handleUCPPlatformDiscover(args);
      }
      if (name === 'ucp_platform_create_checkout') {
        return this.handleUCPPlatformCreateCheckout(args);
      }
      if (name === 'ucp_platform_get_checkout') {
        return this.handleUCPPlatformGetCheckout(args);
      }
      if (name === 'ucp_platform_complete_checkout') {
        return this.handleUCPPlatformCompleteCheckout(args);
      }
      if (name === 'ucp_platform_list_merchants') {
        return this.handleUCPPlatformListMerchants(args);
      }
      // Identity linking tools
      if (name === 'ucp_link_identity') {
        return this.handleUCPLinkIdentity(args);
      }
      if (name === 'ucp_find_linked_user') {
        return this.handleUCPFindLinkedUser(args);
      }

      // ============ Commerce MCP Tools ============
      if (name === 'commerce') {
        return this.handleCommerceTool(args);
      }
      if (name === 'split_plan') {
        return this.handleSplitPlanTool(args);
      }
      if (name === 'budget_pool') {
        return this.handleBudgetPoolTool(args);
      }
      if (name === 'milestone') {
        return this.handleMilestoneTool(args);
      }
      if (name === 'calculate_commerce_fees') {
        return this.handleCalculateCommerceFees(args);
      }
      // === New Commerce Skill tools (2026-02-08) ===
      if (name === 'publish_to_marketplace') {
        return this.handlePublishToMarketplace(args);
      }
      if (name === 'search_marketplace') {
        return this.handleSearchMarketplace(args);
      }
      if (name === 'execute_skill') {
        return this.handleExecuteSkill(args);
      }

      // ============ A2A Task Management MCP Tools ============
      if (name === 'a2a_create_task') {
        return this.handleA2ACreateTask(args);
      }
      if (name === 'a2a_get_task') {
        return this.handleA2AGetTask(args);
      }
      if (name === 'a2a_list_tasks') {
        return this.handleA2AListTasks(args);
      }
      if (name === 'a2a_accept_task') {
        return this.handleA2AAcceptTask(args);
      }
      if (name === 'a2a_deliver_task') {
        return this.handleA2ADeliverTask(args);
      }
      if (name === 'a2a_review_task') {
        return this.handleA2AReviewTask(args);
      }
      if (name === 'a2a_cancel_task') {
        return this.handleA2ACancelTask(args);
      }
      if (name === 'a2a_get_reputation') {
        return this.handleA2AGetReputation(args);
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
   * 带认证上下文的工具调用
   * 安全地从上下文中获取用户身份，而不是从参数中
   */
  async callToolWithContext(
    name: string, 
    args: any, 
    context: {
      userId: string | null;
      agentId: string | null;
      isAuthenticated: boolean;
      platform: string;
      originalArgs: any;
    }
  ) {
    this.logger.log(`Tool Call (with context): ${name}, userId=${context.userId}, platform=${context.platform}`);
    
    // 对于需要用户身份的工具，使用上下文中的 userId
    const secureArgs = {
      ...args,
      // 覆盖参数中的 userId，使用认证上下文中的
      userId: context.userId,
      _mcpContext: {
        isAuthenticated: context.isAuthenticated,
        platform: context.platform,
        agentId: context.agentId,
      },
    };
    
    // 对于需要认证但未认证的工具，返回认证提示
    const authRequiredTools = [
      'quick_purchase', 'confirm_payment', 'pay_with_wallet',
      'setup_quickpay', 'setup_agent_authorization', 'agent_authorize',
      'create_wallet', 'x402_pay', 'x402_authorize', 'subscribe_service',
      // Commerce tools that modify state require auth
      'commerce', 'split_plan', 'budget_pool', 'milestone',
      'publish_to_marketplace', 'execute_skill', // search_marketplace is public
      // A2A tools require auth
      'a2a_create_task', 'a2a_accept_task', 'a2a_deliver_task', 'a2a_review_task', 'a2a_cancel_task',
    ];
    
    if (authRequiredTools.includes(name) && !context.isAuthenticated) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'AUTH_REQUIRED',
            message: '此操作需要登录。请先完成身份验证。',
            loginUrl: 'https://agentrix.top/login',
            oauthUrl: '/api/auth/mcp/authorize',
          })
        }],
      };
    }
    
    return this.handleCallTool(name, secureArgs);
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

  // ============ Phase 1-3: 对话内购物闭环工具实现 ============

  /**
   * Phase 1: 一键购买（支持授权用户和游客）
   * 
   * 流程：
   * 1. 检查是否有 QuickPay 授权 → 直接扣款
   * 2. 无授权 → 创建 Guest Session → 生成支付链接
   */
  private async handleQuickPurchase(args: any) {
    const { productId, quantity = 1, email, shippingAddress } = args;

    try {
      // 获取商品信息
      const product = await this.productService.getProduct(productId);
      if (!product) {
        return this.toolResponse({ success: false, error: 'PRODUCT_NOT_FOUND', message: '商品不存在' });
      }

      const totalPrice = Number(product.price) * quantity;
      const currency = product.metadata?.currency || 'CNY';
      const isPhysical = product.productType === 'physical';

      // 尝试 QuickPay 授权（如果用户已登录且有授权）
      // 注意：在 MCP 场景下，通常没有 userId，所以走游客流程
      // TODO: 通过 OAuth 获取 userId 后可启用 QuickPay

      // 游客购买流程
      const guestSession = this.guestCheckoutService.getOrCreateGuestSession();
      
      // 检查是否需要收集信息
      if (!email && !guestSession.email) {
        return this.toolResponse({
          success: false,
          requiresInfo: true,
          infoType: 'email',
          guestSessionId: guestSession.id,
          product: { id: product.id, name: product.name, price: product.price, currency },
          quantity,
          totalPrice,
          message: `购买「${product.name}」需要您的邮箱地址，用于接收订单确认。请提供您的邮箱。`,
        });
      }

      if (isPhysical && !shippingAddress && !guestSession.shippingAddress) {
        return this.toolResponse({
          success: false,
          requiresInfo: true,
          infoType: 'shipping',
          guestSessionId: guestSession.id,
          product: { id: product.id, name: product.name, price: product.price, currency },
          quantity,
          totalPrice,
          message: `「${product.name}」是实物商品，需要收货地址。请提供收件人姓名、电话、地址、城市。`,
        });
      }

      // 创建游客支付
      const paymentResult = await this.guestCheckoutService.createGuestPayment(
        guestSession.id,
        {
          productId: product.id,
          productName: product.name,
          quantity,
          amount: totalPrice,
          currency,
          email: email || guestSession.email,
          shippingAddress: shippingAddress || guestSession.shippingAddress,
        }
      );

      return this.toolResponse(paymentResult);

    } catch (error: any) {
      this.logger.error(`quick_purchase failed: ${error.message}`);
      return this.toolResponse({ success: false, error: 'PURCHASE_FAILED', message: error.message });
    }
  }

  /**
   * Phase 3: 准备结账（创建待确认订单）
   */
  private async handlePrepareCheckout(args: any) {
    const { productId, quantity = 1, email } = args;

    try {
      const product = await this.productService.getProduct(productId);
      if (!product) {
        return this.toolResponse({ success: false, error: 'PRODUCT_NOT_FOUND', message: '商品不存在' });
      }

      const totalPrice = Number(product.price) * quantity;
      const currency = product.metadata?.currency || 'CNY';

      // 创建游客会话
      const guestSession = this.guestCheckoutService.getOrCreateGuestSession();
      if (email) {
        this.guestCheckoutService.updateGuestSession(guestSession.id, { email });
      }

      // 创建支付意图（待确认状态）
      const intentId = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 存储到 guest session
      this.guestCheckoutService.updateGuestSession(guestSession.id, {
        pendingPayment: {
          productId: product.id,
          productName: product.name,
          quantity,
          amount: totalPrice,
          currency,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分钟过期
        }
      });

      return this.toolResponse({
        success: true,
        intentId,
        guestSessionId: guestSession.id,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          currency,
        },
        quantity,
        totalPrice,
        expiresIn: '10分钟',
        message: `订单已准备就绪！\n\n📦 商品：${product.name}\n📊 数量：${quantity}\n💰 总价：${totalPrice} ${currency}\n\n请回复「确认支付」或「确认」完成购买。`,
        confirmationRequired: true,
      });

    } catch (error: any) {
      this.logger.error(`prepare_checkout failed: ${error.message}`);
      return this.toolResponse({ success: false, error: 'CHECKOUT_FAILED', message: error.message });
    }
  }

  /**
   * Phase 3: 确认支付
   */
  private async handleConfirmPayment(args: any) {
    const { intentId, guestSessionId } = args;

    try {
      if (!guestSessionId) {
        return this.toolResponse({
          success: false,
          error: 'SESSION_REQUIRED',
          message: '需要提供 guestSessionId',
        });
      }

      const session = this.guestCheckoutService.getGuestSession(guestSessionId);
      if (!session) {
        return this.toolResponse({
          success: false,
          error: 'SESSION_EXPIRED',
          message: '会话已过期，请重新开始购物',
        });
      }

      if (!session.pendingPayment) {
        return this.toolResponse({
          success: false,
          error: 'NO_PENDING_PAYMENT',
          message: '没有待支付的订单，请先选择商品',
        });
      }

      if (session.pendingPayment.expiresAt < new Date()) {
        return this.toolResponse({
          success: false,
          error: 'PAYMENT_EXPIRED',
          message: '支付已过期，请重新下单',
        });
      }

      // 检查邮箱
      if (!session.email) {
        return this.toolResponse({
          success: false,
          requiresInfo: true,
          infoType: 'email',
          guestSessionId,
          message: '请先提供您的邮箱地址以完成支付',
        });
      }

      // 创建支付链接
      const paymentResult = await this.guestCheckoutService.createGuestPayment(
        guestSessionId,
        {
          productId: session.pendingPayment.productId,
          productName: session.pendingPayment.productName,
          quantity: session.pendingPayment.quantity,
          amount: session.pendingPayment.amount,
          currency: session.pendingPayment.currency,
          email: session.email,
          shippingAddress: session.shippingAddress,
        }
      );

      return this.toolResponse(paymentResult);

    } catch (error: any) {
      this.logger.error(`confirm_payment failed: ${error.message}`);
      return this.toolResponse({ success: false, error: 'CONFIRM_FAILED', message: error.message });
    }
  }

  /**
   * 收集用户信息
   */
  private async handleCollectUserInfo(args: any) {
    const { infoType, email, shippingAddress, guestSessionId } = args;

    try {
      // 获取或创建 guest session
      let session;
      if (guestSessionId) {
        session = this.guestCheckoutService.getGuestSession(guestSessionId);
      }
      if (!session) {
        session = this.guestCheckoutService.getOrCreateGuestSession();
      }

      const updates: any = {};
      const collected: string[] = [];

      if ((infoType === 'email' || infoType === 'both') && email) {
        updates.email = email;
        collected.push('邮箱');
      }

      if ((infoType === 'shipping' || infoType === 'both') && shippingAddress) {
        updates.shippingAddress = shippingAddress;
        collected.push('收货地址');
      }

      if (Object.keys(updates).length > 0) {
        this.guestCheckoutService.updateGuestSession(session.id, updates);
      }

      return this.toolResponse({
        success: true,
        guestSessionId: session.id,
        collected,
        email: updates.email || session.email,
        hasShipping: !!(updates.shippingAddress || session.shippingAddress),
        message: collected.length > 0 
          ? `已保存${collected.join('和')}。您可以继续购物了。`
          : '请提供邮箱或收货地址信息。',
      });

    } catch (error: any) {
      this.logger.error(`collect_user_info failed: ${error.message}`);
      return this.toolResponse({ success: false, error: 'COLLECT_FAILED', message: error.message });
    }
  }

  /**
   * 查询支付状态
   */
  private async handleCheckPaymentStatus(args: any) {
    const { intentId, guestSessionId } = args;

    try {
      if (guestSessionId) {
        const status = await this.guestCheckoutService.checkGuestPaymentStatus(guestSessionId);
        return this.toolResponse({
          success: true,
          ...status,
        });
      }

      return this.toolResponse({
        success: false,
        error: 'NO_SESSION',
        message: '请提供 guestSessionId 或 intentId 查询支付状态',
      });

    } catch (error: any) {
      this.logger.error(`check_payment_status failed: ${error.message}`);
      return this.toolResponse({ success: false, error: 'CHECK_FAILED', message: error.message });
    }
  }

  /**
   * 设置快速支付授权
   */
  private async handleSetupQuickPay(args: any) {
    const { maxAmount = 100, dailyLimit = 500, paymentMethod = 'stripe' } = args;

    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://agentrix.top';
      
      // 由于 MCP 场景下通常没有认证，引导用户到网页设置
      return this.toolResponse({
        success: true,
        requiresAuth: true,
        setupUrl: `${frontendUrl}/app/quickpay/setup?maxAmount=${maxAmount}&dailyLimit=${dailyLimit}&method=${paymentMethod}`,
        message: `快速支付授权需要登录 Agentrix 账户进行设置。\n\n设置后，您可以在对话中直接完成支付，无需每次确认。\n\n👉 点击链接完成设置：${frontendUrl}/app/quickpay/setup\n\n设置内容：\n• 单笔限额：${maxAmount} 元\n• 每日限额：${dailyLimit} 元\n• 支付方式：${paymentMethod}`,
        suggestedLimits: { maxAmount, dailyLimit, paymentMethod },
      });

    } catch (error: any) {
      this.logger.error(`setup_quickpay failed: ${error.message}`);
      return this.toolResponse({ success: false, error: 'SETUP_FAILED', message: error.message });
    }
  }

  /**
   * Phase 2: 处理动态商品工具（buy_xxx / skill_xxx）
   */
  private async handleDynamicProductTool(name: string, args: any) {
    try {
      const result = await this.dynamicToolAdapter.executeTool(name, args, {});
      
      if (!result.success && result.message?.includes('支付')) {
        // 如果需要支付，走游客支付流程
        const guestSession = this.guestCheckoutService.getOrCreateGuestSession();
        return this.toolResponse({
          ...result,
          guestSessionId: guestSession.id,
        });
      }

      return this.toolResponse(result);

    } catch (error: any) {
      this.logger.error(`Dynamic product tool ${name} failed: ${error.message}`);
      return this.toolResponse({ success: false, error: 'TOOL_FAILED', message: error.message });
    }
  }

  // ============ 钱包与支付工具实现 ============

  /**
   * 创建钱包
   */
  private async handleCreateWallet(args: any) {
    const { email } = args;
    try {
      const session = this.agentWalletService.getOrCreateSession();
      const result = await this.agentWalletService.createWalletInChat(session.id, email);
      return this.toolResponse(result);
    } catch (error: any) {
      return this.toolResponse({ success: false, error: 'WALLET_CREATE_FAILED', message: error.message });
    }
  }

  /**
   * 查询钱包余额
   */
  private async handleGetWalletBalance(args: any) {
    try {
      const session = this.agentWalletService.getOrCreateSession();
      const result = await this.agentWalletService.getBalance(session.id);
      return this.toolResponse(result);
    } catch (error: any) {
      return this.toolResponse({ success: false, error: 'BALANCE_QUERY_FAILED', message: error.message });
    }
  }

  /**
   * 充值钱包
   */
  private async handleTopupWallet(args: any) {
    const { amount, currency = 'CNY', method } = args;
    try {
      const session = this.agentWalletService.getOrCreateSession();
      const result = await this.agentWalletService.topUp(session.id, amount, currency, method);
      return this.toolResponse(result);
    } catch (error: any) {
      return this.toolResponse({ success: false, error: 'TOPUP_FAILED', message: error.message });
    }
  }

  /**
   * 设置 Agent 授权
   */
  private async handleSetupAgentAuthorization(args: any) {
    const { type = 'both', singleLimit, dailyLimit } = args;
    try {
      const session = this.agentWalletService.getOrCreateSession();
      const result = await this.agentWalletService.setupAuthorization(
        session.id, 
        type, 
        { singleLimit, dailyLimit }
      );
      return this.toolResponse(result);
    } catch (error: any) {
      return this.toolResponse({ success: false, error: 'AUTH_SETUP_FAILED', message: error.message });
    }
  }

  /**
   * 钱包支付
   */
  private async handlePayWithWallet(args: any) {
    const { amount, currency = 'USDC', productId, description } = args;
    try {
      const session = this.agentWalletService.getOrCreateSession();
      const result = await this.agentWalletService.executePayment(
        session.id, amount, currency, productId, description
      );
      return this.toolResponse(result);
    } catch (error: any) {
      return this.toolResponse({ success: false, error: 'PAYMENT_FAILED', message: error.message });
    }
  }

  /**
   * 订阅服务
   */
  private async handleSubscribeService(args: any) {
    const { serviceId, plan = 'monthly', autoRenew = true } = args;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://agentrix.top';
    
    // 模拟订阅服务（实际应查询服务信息并创建订阅）
    return this.toolResponse({
      success: true,
      subscriptionId: `sub_${Date.now()}`,
      serviceId,
      plan,
      autoRenew,
      setupUrl: `${frontendUrl}/subscribe/${serviceId}?plan=${plan}`,
      message: `📋 订阅服务\n\n服务ID: ${serviceId}\n周期: ${plan === 'monthly' ? '月付' : '年付'}\n自动续费: ${autoRenew ? '是' : '否'}\n\n👉 点击链接完成订阅设置`,
    });
  }

  /**
   * 支付 API 费用
   */
  private async handlePayApiUsage(args: any) {
    const { apiId, usage, usageType = 'calls' } = args;
    try {
      const session = this.agentWalletService.getOrCreateSession();
      
      // 计算费用（模拟）
      const pricePerUnit = usageType === 'tokens' ? 0.0001 : 0.01;
      const amount = usage * pricePerUnit;
      
      const result = await this.agentWalletService.executePayment(
        session.id, amount, 'USDC', apiId, `API usage: ${usage} ${usageType}`
      );
      
      if (result.success) {
        return this.toolResponse({
          ...result,
          apiId,
          usage,
          usageType,
          unitPrice: pricePerUnit,
          message: `✅ API 费用支付成功\n\n🔧 API: ${apiId}\n📊 用量: ${usage} ${usageType}\n💰 费用: ${amount.toFixed(4)} USDC`,
        });
      }
      return this.toolResponse(result);
    } catch (error: any) {
      return this.toolResponse({ success: false, error: 'API_PAY_FAILED', message: error.message });
    }
  }

  /**
   * 查询订阅状态
   */
  private async handleCheckSubscriptionStatus(args: any) {
    const { serviceId } = args;
    
    // 模拟订阅状态查询
    const subscriptions = [
      { id: 'sub_1', serviceId: 'gpt-4-api', name: 'GPT-4 API', plan: 'monthly', status: 'active', nextBilling: '2024-02-01', amount: 20 },
      { id: 'sub_2', serviceId: 'claude-api', name: 'Claude API', plan: 'monthly', status: 'active', nextBilling: '2024-02-15', amount: 15 },
    ];
    
    const filtered = serviceId 
      ? subscriptions.filter(s => s.serviceId === serviceId)
      : subscriptions;
    
    return this.toolResponse({
      success: true,
      subscriptions: filtered,
      totalMonthly: filtered.reduce((sum, s) => sum + s.amount, 0),
      message: filtered.length > 0
        ? `📋 订阅状态\n\n${filtered.map(s => `• ${s.name}: ${s.status} (${s.plan}, ¥${s.amount}/月)`).join('\n')}`
        : '暂无活跃订阅',
    });
  }

  /**
   * X402 支付
   */
  private async handleX402Pay(args: any) {
    const { resourceUrl, maxPrice } = args;
    try {
      const session = this.agentWalletService.getOrCreateSession();
      const sessionData = this.agentWalletService.getSession(session.id);
      
      // 检查 X402 授权
      if (!sessionData?.x402Authorized) {
        return this.toolResponse({
          success: false,
          requiresAuthorization: true,
          message: `访问此资源需要 X402 授权。\n\n回复「设置 X402 授权」开启自动微支付功能。`,
        });
      }
      
      // 模拟 X402 支付
      const price = 0.01; // 模拟价格
      if (maxPrice && price > maxPrice) {
        return this.toolResponse({
          success: false,
          error: 'PRICE_EXCEEDS_MAX',
          message: `资源价格 ${price} USDC 超过您设置的最大价格 ${maxPrice} USDC`,
        });
      }
      
      const result = await this.agentWalletService.executePayment(
        session.id, price, 'USDC', undefined, `X402: ${resourceUrl}`
      );
      
      return this.toolResponse({
        ...result,
        resourceUrl,
        price,
        protocol: 'X402',
      });
    } catch (error: any) {
      return this.toolResponse({ success: false, error: 'X402_PAY_FAILED', message: error.message });
    }
  }

  /**
   * X402 授权设置
   */
  private async handleX402Authorize(args: any) {
    const { singleLimit = 1, dailyLimit = 10, allowedDomains } = args;
    try {
      const session = this.agentWalletService.getOrCreateSession();
      const result = await this.agentWalletService.setupAuthorization(
        session.id, 'x402', { singleLimit, dailyLimit }
      );
      
      return this.toolResponse({
        ...result,
        x402Config: {
          singleLimit,
          dailyLimit,
          allowedDomains: allowedDomains || ['*'],
        },
        message: `✅ X402 授权已设置\n\n` +
          `💰 单次限额: ${singleLimit} USDC\n` +
          `📅 每日限额: ${dailyLimit} USDC\n` +
          `🌐 允许域名: ${allowedDomains?.join(', ') || '全部'}\n\n` +
          `现在可以自动支付符合条件的 X402 请求。`,
      });
    } catch (error: any) {
      return this.toolResponse({ success: false, error: 'X402_AUTH_FAILED', message: error.message });
    }
  }

  // ============ Agent 生态标准化支付工具处理 ============

  /**
   * Agent 支付技能 - 主入口
   * 支持三种模式：自然语言意图、直接支付、分账支付
   */
  private async handleAgentPayment(args: any) {
    try {
      const { intent, amount, recipientAgentId, recipientAddress, taskId, sessionId, currency, description, splitConfig } = args;
      
      // 获取当前会话用户
      const session = this.agentWalletService.getOrCreateSession();
      const userId = session.userId || 'guest';
      
      // 模式1: 自然语言意图支付
      if (intent) {
        return this.handleIntentPayment(userId, intent, args);
      }
      
      // 模式2: 分账支付
      if (splitConfig) {
        return this.handleSplitPayment(userId, splitConfig, args);
      }
      
      // 模式3: 直接支付
      if (amount && (recipientAgentId || recipientAddress)) {
        return this.handleDirectAgentPayment(userId, args);
      }
      
      // 缺少必要参数
      return this.toolResponse({
        success: false,
        error: 'INVALID_REQUEST',
        message: '请提供以下其中一项：\n' +
          '1. intent: 自然语言描述（如"支付100U给翻译Agent"）\n' +
          '2. amount + recipientAgentId/recipientAddress: 直接支付\n' +
          '3. splitConfig: 多方分账配置',
        examples: [
          '🗣️ 意图支付: "支付 50 USDC 给 @translator-agent 完成翻译任务"',
          '💰 直接支付: { amount: 100, recipientAgentId: "agent_xxx" }',
          '📊 分账支付: { splitConfig: { totalAmount: 100, recipients: [...] } }',
        ],
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'AGENT_PAYMENT_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * 处理自然语言意图支付
   */
  private async handleIntentPayment(userId: string, intent: string, args: any) {
    this.logger.log(`处理意图支付: ${intent}`);
    
    // 解析意图（简化版，实际应调用 NaturalLanguageIntentService）
    const parsedIntent = this.parsePaymentIntent(intent);
    
    // 生成交易预览
    const preview = {
      type: 'payment',
      title: '支付确认',
      description: parsedIntent.description || intent,
      totalAmount: parsedIntent.amount || 0,
      currency: parsedIntent.currency || 'USDC',
      recipients: parsedIntent.recipientName ? [{
        name: parsedIntent.recipientName,
        amount: (parsedIntent.amount || 0) * 0.99,
        role: 'recipient',
        percentage: 99,
      }] : [],
      fees: {
        platformFee: (parsedIntent.amount || 0) * 0.01,
        gasFee: 0.1,
      },
      source: {
        type: parsedIntent.sessionRef ? 'session' : 'wallet',
        label: parsedIntent.sessionRef || 'Agentrix 钱包',
      },
      estimatedTime: '约 30 秒',
    };
    
    // 检查缺失信息
    if (parsedIntent.missingFields && parsedIntent.missingFields.length > 0) {
      return this.toolResponse({
        success: false,
        requiresMoreInfo: true,
        missingFields: parsedIntent.missingFields,
        parsedSoFar: parsedIntent,
        message: `🔍 解析您的支付意图...\n\n` +
          `还需要以下信息：\n` +
          parsedIntent.missingFields.map(f => `• ${this.getFieldLabel(f)}`).join('\n') +
          `\n\n请补充完整后重新发送。`,
      });
    }
    
    // 小额支付自动确认
    const autoConfirmThreshold = 10; // USDC
    if (parsedIntent.amount && parsedIntent.amount <= autoConfirmThreshold) {
      // 直接执行
      return this.executeAgentPayment(userId, parsedIntent);
    }
    
    // 大额支付需要确认
    const confirmationId = `icf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 缓存待确认支付（实际应使用 IntentConfirmationService）
    this.pendingAgentPayments = this.pendingAgentPayments || new Map();
    this.pendingAgentPayments.set(confirmationId, {
      userId,
      parsedIntent,
      args,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    
    return this.toolResponse({
      success: true,
      requiresConfirmation: true,
      confirmationId,
      preview,
      message: `💳 **支付预览**\n\n` +
        `📝 ${preview.description}\n` +
        `💰 金额: ${preview.totalAmount} ${preview.currency}\n` +
        `👤 收款方: ${preview.recipients[0]?.name || '待确认'}\n` +
        `💸 手续费: ${preview.fees.platformFee.toFixed(2)} ${preview.currency}\n` +
        `📱 支付来源: ${preview.source.label}\n` +
        `⏱️ 预计: ${preview.estimatedTime}\n\n` +
        `回复「确认支付」完成交易，或「取消」放弃。`,
    });
  }

  // 临时存储待确认支付
  private pendingAgentPayments: Map<string, any> = new Map();

  /**
   * 简化版意图解析
   */
  private parsePaymentIntent(intent: string): any {
    const result: any = {
      type: 'pay',
      amount: 0,
      currency: 'USDC',
      confidence: 0.6,
      missingFields: [],
    };
    
    // 提取金额
    const amountMatch = intent.match(/(\d+(?:\.\d+)?)\s*(?:u|usdc|usdt|美元|刀)/i);
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[1]);
    } else {
      result.missingFields.push('amount');
    }
    
    // 提取收款方
    const recipientMatch = intent.match(/(?:给|支付给|转给)\s*([^\s,，。]+)/);
    if (recipientMatch) {
      result.recipientName = recipientMatch[1];
    } else {
      result.missingFields.push('recipient');
    }
    
    // 检查 Session 引用
    if (intent.match(/(?:预存|存的|上周|之前)/)) {
      result.sessionRef = '预存款 Session';
      result.type = 'pay_from_deposit';
    }
    
    // 提取任务类型
    const taskTypes = ['翻译', '修图', '代码', '设计', '写作'];
    for (const t of taskTypes) {
      if (intent.includes(t)) {
        result.taskType = t;
        result.description = `${t}服务费`;
        break;
      }
    }
    
    return result;
  }

  /**
   * 获取字段标签
   */
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      amount: '💰 支付金额',
      recipient: '👤 收款方（Agent ID 或钱包地址）',
      currency: '💵 币种',
    };
    return labels[field] || field;
  }

  /**
   * 执行 Agent 支付
   */
  private async executeAgentPayment(userId: string, parsedIntent: any): Promise<any> {
    const session = this.agentWalletService.getOrCreateSession();
    
    try {
      // 执行支付
      const result = await this.agentWalletService.executePayment(
        session.id,
        parsedIntent.amount,
        parsedIntent.currency || 'USDC',
        undefined,
        parsedIntent.description || `Agent 支付: ${parsedIntent.recipientName}`,
      );
      
      return this.toolResponse({
        success: true,
        paymentId: result.transactionId || 'pending',
        transactionHash: result.transactionId || 'pending',
        amount: parsedIntent.amount,
        currency: parsedIntent.currency || 'USDC',
        recipient: parsedIntent.recipientName,
        message: `✅ **支付成功**\n\n` +
          `💰 ${parsedIntent.amount} ${parsedIntent.currency || 'USDC'}\n` +
          `👤 收款方: ${parsedIntent.recipientName}\n` +
          `🔗 交易: ${result.transactionId || 'pending'}\n\n` +
          `${parsedIntent.taskType ? `任务类型: ${parsedIntent.taskType}` : ''}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'PAYMENT_FAILED',
        message: `❌ 支付失败: ${error.message}`,
      });
    }
  }

  /**
   * 处理分账支付
   */
  private async handleSplitPayment(userId: string, splitConfig: any, args: any) {
    const { totalAmount, recipients } = splitConfig;
    
    // 验证分账比例
    const totalShares = recipients?.reduce((sum: number, r: any) => sum + (r.share || 0), 0) || 0;
    if (totalShares !== 10000) {
      return this.toolResponse({
        success: false,
        error: 'INVALID_SPLIT_CONFIG',
        message: `分账比例必须等于 100% (10000 basis points)\n当前总和: ${totalShares / 100}%`,
      });
    }
    
    // 生成分账预览
    const splitDetails = recipients.map((r: any) => ({
      address: r.address,
      amount: (totalAmount * r.share) / 10000,
      role: r.role,
      percentage: r.share / 100,
    }));
    
    return this.toolResponse({
      success: true,
      requiresConfirmation: true,
      splitDetails,
      message: `📊 **分账支付预览**\n\n` +
        `💰 总金额: ${totalAmount} ${args.currency || 'USDC'}\n\n` +
        `分账明细:\n` +
        splitDetails.map((s: any) => 
          `• ${s.role}: ${s.amount.toFixed(2)} (${s.percentage}%)`
        ).join('\n') +
        `\n\n回复「确认」执行分账。`,
    });
  }

  /**
   * 处理直接 Agent 支付
   */
  private async handleDirectAgentPayment(userId: string, args: any) {
    const { amount, recipientAgentId, recipientAddress, currency = 'USDC', description } = args;
    
    const recipient = recipientAddress || `Agent: ${recipientAgentId}`;
    
    // 小额直接执行
    if (amount <= 10) {
      return this.executeAgentPayment(userId, {
        amount,
        currency,
        recipientName: recipient,
        description,
      });
    }
    
    // 大额需要确认
    return this.toolResponse({
      success: true,
      requiresConfirmation: true,
      preview: {
        amount,
        currency,
        recipient,
        description,
      },
      message: `💳 **直接支付确认**\n\n` +
        `💰 金额: ${amount} ${currency}\n` +
        `👤 收款方: ${recipient}\n` +
        `${description ? `📝 说明: ${description}\n` : ''}` +
        `\n回复「确认」完成支付。`,
    });
  }

  /**
   * 确认 Agent 支付
   */
  private async handleAgentPaymentConfirm(args: any) {
    const { confirmationId } = args;
    
    if (!this.pendingAgentPayments) {
      return this.toolResponse({
        success: false,
        error: 'NO_PENDING_PAYMENT',
        message: '没有待确认的支付',
      });
    }
    
    const pending = this.pendingAgentPayments.get(confirmationId);
    if (!pending) {
      return this.toolResponse({
        success: false,
        error: 'INVALID_CONFIRMATION_ID',
        message: '确认ID无效或已过期。请重新发起支付。',
      });
    }
    
    // 检查过期
    if (new Date() > pending.expiresAt) {
      this.pendingAgentPayments.delete(confirmationId);
      return this.toolResponse({
        success: false,
        error: 'EXPIRED',
        message: '支付已过期，请重新发起。',
      });
    }
    
    // 执行支付
    const result = await this.executeAgentPayment(pending.userId, pending.parsedIntent);
    
    // 清理缓存
    this.pendingAgentPayments.delete(confirmationId);
    
    return result;
  }

  /**
   * 拒绝 Agent 支付
   */
  private async handleAgentPaymentReject(args: any) {
    const { confirmationId, reason } = args;
    
    if (this.pendingAgentPayments?.has(confirmationId)) {
      this.pendingAgentPayments.delete(confirmationId);
    }
    
    return this.toolResponse({
      success: true,
      status: 'rejected',
      reason,
      message: `❌ 支付已取消${reason ? `\n原因: ${reason}` : ''}`,
    });
  }

  /**
   * 提交 Audit Proof
   */
  private async handleSubmitAuditProof(args: any) {
    const { taskId, orderId, resultHash, proofData, signatures } = args;
    
    // 验证必要参数
    if (!taskId || !orderId || !resultHash) {
      return this.toolResponse({
        success: false,
        error: 'MISSING_PARAMS',
        message: '请提供 taskId、orderId 和 resultHash',
      });
    }
    
    // TODO: 实际调用合约验证 Proof 并触发分账
    // 这里先返回模拟结果
    const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    return this.toolResponse({
      success: true,
      proofId,
      taskId,
      orderId,
      resultHash,
      status: 'submitted',
      message: `✅ **Audit Proof 已提交**\n\n` +
        `📋 任务ID: ${taskId}\n` +
        `🧾 订单ID: ${orderId}\n` +
        `🔐 结果哈希: ${resultHash.substring(0, 10)}...\n` +
        `${proofData?.quality ? `⭐ 质量评分: ${proofData.quality}/100\n` : ''}` +
        `\n等待验证后将自动触发分账。`,
    });
  }

  /**
   * 工具响应格式化
   */
  private toolResponse(data: any) {
    return {
      content: [{ type: 'text', text: JSON.stringify(data) }],
    };
  }

  // ============ UCP MCP Tool Handlers ============

  /**
   * Create UCP checkout session
   */
  private async handleUCPCreateCheckout(args: any) {
    try {
      const lineItems = (args.line_items || []).map((item: any, index: number) => ({
        id: `li_${index + 1}`,
        quantity: item.quantity || 1,
        item: {
          id: `item_${index + 1}`,
          title: item.name,
          description: item.description || '',
          price: item.unit_price,
          product_id: item.product_id,
        },
        subtotal: (item.unit_price * (item.quantity || 1)),
      }));

      const dto: any = {
        currency: args.currency || 'USD',
        line_items: lineItems,
        buyer: args.buyer,
      };

      // Construct fulfillment with proper structure if shipping address provided
      if (args.shipping_address) {
        dto.fulfillment = {
          methods: [{
            id: 'shipping_1',
            type: 'shipping',
            groups: [{
              id: 'group_1',
              options: [{
                id: 'standard_shipping',
                type: 'shipping',
                label: 'Standard Shipping',
                destination: args.shipping_address,
                totals: [{ type: 'total', amount: 0 }],
              }],
              selected_option_id: 'standard_shipping',
            }],
          }],
        };
      }

      const session = await this.ucpService.createCheckout(dto);

      return this.toolResponse({
        success: true,
        checkout_id: session.id,
        status: session.status,
        currency: session.currency,
        totals: session.totals,
        payment_handlers: session.payment?.handlers?.map(h => ({
          id: h.id,
          name: h.name,
        })) || [],
        message: `✅ UCP Checkout created successfully!\n` +
          `Session ID: ${session.id}\n` +
          `Total: ${session.totals.find(t => t.type === 'total')?.amount || 0} ${session.currency}`,
      });
    } catch (error: any) {
      this.logger.error(`UCP create checkout failed: ${error.message}`);
      return this.toolResponse({
        success: false,
        error: 'CREATE_CHECKOUT_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Get UCP checkout session
   */
  private async handleUCPGetCheckout(args: any) {
    try {
      const session = await this.ucpService.getCheckout(args.checkout_id);
      return this.toolResponse({
        success: true,
        checkout_id: session.id,
        status: session.status,
        currency: session.currency,
        line_items: session.line_items,
        totals: session.totals,
        buyer: session.buyer,
        fulfillment: session.fulfillment,
        order_id: session.order?.id,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'NOT_FOUND',
        message: error.message,
      });
    }
  }

  /**
   * Update UCP checkout session
   */
  private async handleUCPUpdateCheckout(args: any) {
    try {
      const dto: any = {};
      if (args.buyer) dto.buyer = args.buyer;
      if (args.shipping_address) {
        dto.fulfillment = {
          methods: [{
            id: 'shipping_1',
            type: 'shipping',
            groups: [{
              id: 'group_1',
              options: [{
                id: 'standard_shipping',
                type: 'shipping',
                label: 'Standard Shipping',
                destination: args.shipping_address,
                totals: [{ type: 'total', amount: 0 }],
              }],
              selected_option_id: 'standard_shipping',
            }],
          }],
        };
      }
      if (args.add_line_items) {
        // Fetch current session first
        const currentSession = await this.ucpService.getCheckout(args.checkout_id);
        dto.line_items = [
          ...currentSession.line_items,
          ...args.add_line_items.map((item: any, idx: number) => ({
            id: `li_new_${idx}`,
            quantity: item.quantity || 1,
            item: {
              id: `item_new_${idx}`,
              title: item.name,
              price: item.unit_price,
            },
            subtotal: item.unit_price * (item.quantity || 1),
          })),
        ];
      }

      const session = await this.ucpService.updateCheckout(args.checkout_id, dto);
      return this.toolResponse({
        success: true,
        checkout_id: session.id,
        status: session.status,
        totals: session.totals,
        message: `Checkout session updated. Status: ${session.status}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'UPDATE_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Complete UCP checkout with payment
   */
  private async handleUCPCompleteCheckout(args: any) {
    try {
      const paymentData: any = {
        id: `pay_${Date.now()}`,
        handler_id: args.payment_handler,
        type: 'token',
        credential: {
          type: 'PAYMENT_GATEWAY',
          token: '',
        },
      };

      // Map payment-specific data
      if (args.payment_data) {
        if (args.payment_data.google_pay_token) {
          paymentData.credential.token = args.payment_data.google_pay_token;
        }
        if (args.payment_data.paypal_order_id) {
          paymentData.paypal_order_id = args.payment_data.paypal_order_id;
        }
        if (args.payment_data.stripe_payment_method_id) {
          paymentData.credential.token = args.payment_data.stripe_payment_method_id;
        }
        if (args.payment_data.x402_tx_hash) {
          paymentData.credential.token = args.payment_data.x402_tx_hash;
          paymentData.wallet_address = args.payment_data.wallet_address;
        }
      }

      const dto = {
        payment_data: paymentData,
      };

      const session = await this.ucpService.completeCheckout(args.checkout_id, dto);
      return this.toolResponse({
        success: true,
        checkout_id: session.id,
        status: session.status,
        order_id: session.order?.id,
        message: session.status === 'complete'
          ? `✅ Payment successful! Order ID: ${session.order?.id}`
          : `⚠️ Checkout status: ${session.status}. ${session.error?.message || ''}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'PAYMENT_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Cancel UCP checkout session
   */
  private async handleUCPCancelCheckout(args: any) {
    try {
      const session = await this.ucpService.cancelCheckout(args.checkout_id);
      return this.toolResponse({
        success: true,
        checkout_id: session.id,
        status: session.status,
        message: 'Checkout session cancelled.',
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'CANCEL_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Discover external UCP business
   */
  private async handleUCPDiscoverBusiness(args: any) {
    try {
      // Fetch /.well-known/ucp from the business URL
      const businessUrl = args.business_url.replace(/\/$/, '');
      const ucpUrl = `${businessUrl}/.well-known/ucp`;

      const response = await fetch(ucpUrl);
      if (!response.ok) {
        return this.toolResponse({
          success: false,
          error: 'NOT_UCP_COMPATIBLE',
          message: `${businessUrl} does not appear to be UCP-compatible. No /.well-known/ucp found.`,
        });
      }

      const profile = await response.json();
      return this.toolResponse({
        success: true,
        business_url: businessUrl,
        profile: {
          name: profile.business?.name,
          description: profile.business?.description,
          logo: profile.business?.logo,
          capabilities: profile.ucp?.capabilities?.map((c: any) => c.name),
          payment_handlers: profile.payment?.handlers?.map((h: any) => h.name),
        },
        raw_profile: profile,
        message: `✅ Discovered UCP business: ${profile.business?.name}\n` +
          `Capabilities: ${profile.ucp?.capabilities?.map((c: any) => c.name).join(', ')}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'DISCOVERY_FAILED',
        message: `Failed to discover UCP business: ${error.message}`,
      });
    }
  }

  /**
   * Get available payment handlers
   */
  private async handleUCPGetPaymentHandlers(args: any) {
    try {
      const handlers = this.ucpService.getPaymentHandlers();
      return this.toolResponse({
        success: true,
        handlers: handlers.map(h => ({
          id: h.id,
          name: h.name,
          supports: h.instrument_schemas,
        })),
        message: `Available payment handlers: ${handlers.map(h => h.name).join(', ')}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'GET_HANDLERS_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Get order details (placeholder)
   */
  private async handleUCPGetOrder(args: any) {
    // TODO: Implement order lookup from database
    return this.toolResponse({
      success: true,
      order_id: args.order_id,
      status: 'pending',
      message: 'Order lookup not yet implemented. Please check back later.',
    });
  }

  /**
   * List orders (placeholder)
   */
  private async handleUCPListOrders(args: any) {
    // TODO: Implement order listing from database
    return this.toolResponse({
      success: true,
      orders: [],
      total: 0,
      message: 'Order listing not yet implemented.',
    });
  }

  /**
   * Create AP2 mandate for agent payments
   */
  private async handleUCPCreateMandate(args: any) {
    try {
      const mandateId = `mandate_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const validUntil = args.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Store mandate (in production, persist to database)
      const mandate = {
        id: mandateId,
        agent_id: args.agent_id,
        max_amount: args.max_amount,
        currency: args.currency || 'USD',
        valid_until: validUntil,
        allowed_merchants: args.allowed_merchants || [],
        allowed_categories: args.allowed_categories || [],
        status: 'active',
        created_at: new Date().toISOString(),
      };

      // TODO: Store in database or cache

      return this.toolResponse({
        success: true,
        mandate_id: mandateId,
        agent_id: args.agent_id,
        max_amount: args.max_amount,
        currency: args.currency || 'USD',
        valid_until: validUntil,
        message: `✅ AP2 Mandate created!\n` +
          `Agent ${args.agent_id} can now make purchases up to ${args.max_amount} ${args.currency || 'USD'} per transaction.`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'CREATE_MANDATE_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Verify AP2 mandate
   */
  private async handleUCPVerifyMandate(args: any) {
    try {
      const result = await this.ucpService.verifyMandate(
        args.mandate_id,
        args.amount || 0,
        args.merchant_id,
        args.category,
      );
      return this.toolResponse({
        success: true,
        mandate_id: args.mandate_id,
        is_valid: result.valid,
        remaining_amount: result.remaining_amount,
        reason: result.reason,
        message: result.valid
          ? `✅ Mandate ${args.mandate_id} is valid. Remaining: ${result.remaining_amount}`
          : `❌ Mandate invalid: ${result.reason}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        mandate_id: args.mandate_id,
        is_valid: false,
        error: error.message,
        message: `Failed to verify mandate: ${error.message}`,
      });
    }
  }

  /**
   * Revoke AP2 mandate
   */
  private async handleUCPRevokeMandate(args: any) {
    try {
      const mandate = await this.ucpService.revokeMandate(args.mandate_id);
      return this.toolResponse({
        success: true,
        mandate_id: mandate.id,
        status: mandate.status,
        message: `✅ Mandate ${mandate.id} has been revoked.`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        mandate_id: args.mandate_id,
        error: error.message,
        message: `Failed to revoke mandate: ${error.message}`,
      });
    }
  }

  // ============ Platform Capability Handlers (Phase 3) ============

  /**
   * Discover external UCP merchant
   */
  private async handleUCPPlatformDiscover(args: any) {
    try {
      const merchant = await this.ucpService.discoverMerchant(args.merchant_url);
      return this.toolResponse({
        success: merchant.verified,
        merchant_url: merchant.url,
        merchant_name: merchant.name,
        description: merchant.description,
        ucp_version: merchant.ucp_version,
        capabilities: merchant.capabilities,
        payment_handlers: merchant.payment_handlers,
        services: merchant.services,
        verified: merchant.verified,
        error: merchant.error,
        message: merchant.verified
          ? `✅ Discovered UCP merchant: ${merchant.name}\nCapabilities: ${merchant.capabilities.join(', ')}`
          : `❌ ${args.merchant_url} is not UCP-compatible: ${merchant.error}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'DISCOVERY_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Create checkout on external merchant
   */
  private async handleUCPPlatformCreateCheckout(args: any) {
    try {
      const lineItems = (args.line_items || []).map((item: any, index: number) => ({
        id: `li_${index + 1}`,
        quantity: item.quantity || 1,
        item: {
          name: item.name,
          description: item.description || '',
          price: item.unit_price,
        },
        subtotal: (item.unit_price * (item.quantity || 1)),
      }));

      const dto = {
        currency: args.currency || 'USD',
        line_items: lineItems,
        buyer: args.buyer,
      };

      const result = await this.ucpService.createExternalCheckout(args.merchant_url, dto);
      
      if (!result.success) {
        return this.toolResponse({
          success: false,
          error: result.error,
          message: result.message,
        });
      }

      return this.toolResponse({
        success: true,
        merchant_url: result.merchant_url,
        merchant_name: result.merchant_name,
        checkout_id: result.session?.id,
        status: result.session?.status,
        totals: result.session?.totals,
        message: `✅ Created checkout on ${result.merchant_name}!\nSession ID: ${result.session?.id}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'CREATE_CHECKOUT_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Get checkout from external merchant
   */
  private async handleUCPPlatformGetCheckout(args: any) {
    try {
      const result = await this.ucpService.getExternalCheckout(args.merchant_url, args.checkout_id);
      
      if (!result.success) {
        return this.toolResponse({
          success: false,
          error: result.error,
          message: result.message,
        });
      }

      return this.toolResponse({
        success: true,
        merchant_url: result.merchant_url,
        checkout_id: result.session?.id,
        status: result.session?.status,
        totals: result.session?.totals,
        buyer: result.session?.buyer,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'GET_CHECKOUT_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Complete checkout on external merchant
   */
  private async handleUCPPlatformCompleteCheckout(args: any) {
    try {
      const dto = {
        payment_data: {
          id: `pay_${Date.now()}`,
          handler_id: args.payment_handler,
          type: 'token',
          credential: {
            type: 'PLATFORM',
            token: 'agentrix_platform_token',
          },
          ...args.payment_data,
        },
      };

      const result = await this.ucpService.completeExternalCheckout(
        args.merchant_url,
        args.checkout_id,
        dto
      );
      
      if (!result.success) {
        return this.toolResponse({
          success: false,
          error: result.error,
          message: result.message,
        });
      }

      return this.toolResponse({
        success: true,
        merchant_url: result.merchant_url,
        checkout_id: result.session?.id,
        status: result.session?.status,
        order_id: result.session?.merchant_order_id,
        message: result.session?.status === 'complete'
          ? `✅ Payment successful on external merchant!`
          : `Status: ${result.session?.status}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'COMPLETE_CHECKOUT_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * List discovered merchants
   */
  private async handleUCPPlatformListMerchants(args: any) {
    try {
      const merchants = await this.ucpService.listDiscoveredMerchants();
      return this.toolResponse({
        success: true,
        merchants: merchants.map(m => ({
          url: m.url,
          name: m.name,
          verified: m.verified,
          capabilities: m.capabilities,
          payment_handlers: m.payment_handlers,
        })),
        total: merchants.length,
        message: `Found ${merchants.length} discovered UCP merchants.`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'LIST_MERCHANTS_FAILED',
        message: error.message,
      });
    }
  }

  // ============ Identity Linking Handlers ============

  /**
   * Link UCP buyer identity to Agentrix user
   */
  private async handleUCPLinkIdentity(args: any) {
    try {
      const link = await this.ucpService.linkIdentity({
        ucp_buyer_email: args.ucp_buyer_email,
        agentrix_user_id: args.agentrix_user_id,
        verification_method: args.verification_method,
      });

      return this.toolResponse({
        success: true,
        link_id: link.id,
        ucp_buyer_email: link.ucp_buyer_email,
        agentrix_user_id: link.agentrix_user_id,
        verified: link.verified,
        message: `Identity link created. ${link.verified ? 'Verified!' : 'Pending verification.'}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'LINK_IDENTITY_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * Find Agentrix user linked to UCP buyer
   */
  private async handleUCPFindLinkedUser(args: any) {
    try {
      const userId = await this.ucpService.findLinkedUser(args.ucp_buyer_email);
      
      if (!userId) {
        return this.toolResponse({
          success: false,
          found: false,
          message: `No Agentrix user linked to ${args.ucp_buyer_email}`,
        });
      }

      return this.toolResponse({
        success: true,
        found: true,
        ucp_buyer_email: args.ucp_buyer_email,
        agentrix_user_id: userId,
        message: `Found linked user: ${userId}`,
      });
    } catch (error: any) {
      return this.toolResponse({
        success: false,
        error: 'FIND_USER_FAILED',
        message: error.message,
      });
    }
  }

  // ============ Commerce MCP Tool Handlers ============

  /**
   * Unified commerce tool handler
   * Routes to CommerceService.execute() based on action
   */
  private async handleCommerceTool(args: any) {
    const { action, mode = 'PAY_AND_SPLIT', params = {}, ...rest } = args;

    if (!action) {
      return this.toolResponse({
        success: false,
        error: 'MISSING_ACTION',
        message: 'Please provide an action. Available actions: create_split_plan, get_split_plan, update_split_plan, activate_split_plan, archive_split_plan, list_split_plans, preview_allocation, create_budget_pool, get_budget_pool, fund_budget_pool, activate_budget_pool, cancel_budget_pool, list_budget_pools, create_milestone, get_milestone, start_milestone, submit_milestone, approve_milestone, reject_milestone, release_milestone_funds, calculate_fees, get_fee_structure',
      });
    }

    try {
      // Map commerce tool actions to CommerceService actions
      const actionMap: Record<string, CommerceAction> = {
        'create_split_plan': 'createSplitPlan',
        'get_split_plan': 'getSplitPlan',
        'update_split_plan': 'updateSplitPlan',
        'activate_split_plan': 'activateSplitPlan',
        'archive_split_plan': 'archiveSplitPlan',
        'list_split_plans': 'getSplitPlans',
        'preview_allocation': 'previewAllocation',
        'create_budget_pool': 'createBudgetPool',
        'get_budget_pool': 'getBudgetPool',
        'fund_budget_pool': 'fundBudgetPool',
        'activate_budget_pool': 'fundBudgetPool',
        'cancel_budget_pool': 'cancelBudgetPool',
        'list_budget_pools': 'getBudgetPools',
        'create_milestone': 'createMilestone',
        'get_milestone': 'getMilestone',
        'start_milestone': 'startMilestone',
        'submit_milestone': 'submitMilestone',
        'approve_milestone': 'approveMilestone',
        'reject_milestone': 'rejectMilestone',
        'release_milestone_funds': 'releaseMilestone',
        'calculate_fees': 'previewAllocation',
        'get_fee_structure': 'previewAllocation',
      };

      const commerceAction = actionMap[action];
      if (!commerceAction) {
        return this.toolResponse({
          success: false,
          error: 'UNKNOWN_ACTION',
          message: `Unknown commerce action: ${action}. Available: ${Object.keys(actionMap).join(', ')}`,
        });
      }

      // Extract userId from context if available
      const userId = args._mcpContext?.userId || rest.userId;

      const result = await this.commerceService.execute(
        commerceAction,
        mode as CommerceMode,
        { ...params, ...rest },
        userId,
        rest.idempotencyKey,
      );

      return this.toolResponse({
        success: true,
        action,
        mode,
        data: result,
      });
    } catch (error: any) {
      this.logger.error(`Commerce tool [${action}] failed: ${error.message}`);
      return this.toolResponse({
        success: false,
        error: 'COMMERCE_ERROR',
        action,
        message: error.message,
      });
    }
  }

  /**
   * Split plan tool handler
   */
  private async handleSplitPlanTool(args: any) {
    const { action, planId, ...params } = args;

    if (!action) {
      return this.toolResponse({
        success: false,
        error: 'MISSING_ACTION',
        message: 'Please provide an action: create, get, update, activate, archive, list, preview',
      });
    }

    try {
      const actionMap: Record<string, CommerceAction> = {
        'create': 'createSplitPlan',
        'get': 'getSplitPlan',
        'update': 'updateSplitPlan',
        'activate': 'activateSplitPlan',
        'archive': 'archiveSplitPlan',
        'list': 'getSplitPlans',
        'preview': 'previewAllocation',
      };

      const commerceAction = actionMap[action];
      if (!commerceAction) {
        return this.toolResponse({
          success: false,
          error: 'UNKNOWN_ACTION',
          message: `Unknown split_plan action: ${action}`,
        });
      }

      const userId = args._mcpContext?.userId || params.userId;
      const executeParams = planId ? { id: planId, ...params } : params;

      const result = await this.commerceService.execute(
        commerceAction,
        'SPLIT_ONLY',
        executeParams,
        userId,
      );

      return this.toolResponse({
        success: true,
        action: `split_plan.${action}`,
        data: result,
      });
    } catch (error: any) {
      this.logger.error(`Split plan tool [${action}] failed: ${error.message}`);
      return this.toolResponse({
        success: false,
        error: 'SPLIT_PLAN_ERROR',
        action,
        message: error.message,
      });
    }
  }

  /**
   * Budget pool tool handler
   */
  private async handleBudgetPoolTool(args: any) {
    const { action, poolId, ...params } = args;

    if (!action) {
      return this.toolResponse({
        success: false,
        error: 'MISSING_ACTION',
        message: 'Please provide an action: create, get, fund, activate, cancel, list',
      });
    }

    try {
      const actionMap: Record<string, CommerceAction> = {
        'create': 'createBudgetPool',
        'get': 'getBudgetPool',
        'fund': 'fundBudgetPool',
        'activate': 'fundBudgetPool',
        'cancel': 'cancelBudgetPool',
        'list': 'getBudgetPools',
      };

      const commerceAction = actionMap[action];
      if (!commerceAction) {
        return this.toolResponse({
          success: false,
          error: 'UNKNOWN_ACTION',
          message: `Unknown budget_pool action: ${action}`,
        });
      }

      const userId = args._mcpContext?.userId || params.userId;
      const executeParams = poolId ? { id: poolId, ...params } : params;

      const result = await this.commerceService.execute(
        commerceAction,
        'PAY_AND_SPLIT',
        executeParams,
        userId,
      );

      return this.toolResponse({
        success: true,
        action: `budget_pool.${action}`,
        data: result,
      });
    } catch (error: any) {
      this.logger.error(`Budget pool tool [${action}] failed: ${error.message}`);
      return this.toolResponse({
        success: false,
        error: 'BUDGET_POOL_ERROR',
        action,
        message: error.message,
      });
    }
  }

  /**
   * Milestone tool handler
   */
  private async handleMilestoneTool(args: any) {
    const { action, milestoneId, poolId, ...params } = args;

    if (!action) {
      return this.toolResponse({
        success: false,
        error: 'MISSING_ACTION',
        message: 'Please provide an action: create, get, start, submit, approve, reject, release',
      });
    }

    try {
      const actionMap: Record<string, CommerceAction> = {
        'create': 'createMilestone',
        'get': 'getMilestone',
        'start': 'startMilestone',
        'submit': 'submitMilestone',
        'approve': 'approveMilestone',
        'reject': 'rejectMilestone',
        'release': 'releaseMilestone',
      };

      const commerceAction = actionMap[action];
      if (!commerceAction) {
        return this.toolResponse({
          success: false,
          error: 'UNKNOWN_ACTION',
          message: `Unknown milestone action: ${action}`,
        });
      }

      const userId = args._mcpContext?.userId || params.userId;
      const executeParams = {
        ...(milestoneId ? { id: milestoneId } : {}),
        ...(poolId ? { budgetPoolId: poolId } : {}),
        ...params,
      };

      const result = await this.commerceService.execute(
        commerceAction,
        'PAY_AND_SPLIT',
        executeParams,
        userId,
      );

      return this.toolResponse({
        success: true,
        action: `milestone.${action}`,
        data: result,
      });
    } catch (error: any) {
      this.logger.error(`Milestone tool [${action}] failed: ${error.message}`);
      return this.toolResponse({
        success: false,
        error: 'MILESTONE_ERROR',
        action,
        message: error.message,
      });
    }
  }

  /**
   * Fee calculator tool handler
   */
  private async handleCalculateCommerceFees(args: any) {
    const { amount, paymentType = 'CRYPTO_DIRECT' } = args;

    if (!amount || amount <= 0) {
      return this.toolResponse({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Please provide a valid amount in micro units (1 USDC = 1000000)',
      });
    }

    try {
      // Fee calculation based on the unified fee structure
      const fees = {
        amount,
        paymentType,
        breakdown: {
          onrampFee: 0,
          offrampFee: 0,
          splitFee: 0,
          totalFee: 0,
        },
        netAmount: amount,
        currency: 'USDC (micro units)',
      };

      // Onramp: +0.1%
      if (paymentType === 'ONRAMP' || paymentType === 'MIXED') {
        fees.breakdown.onrampFee = Math.floor(amount * 10 / 10000);
      }

      // Offramp: +0.1%
      if (paymentType === 'OFFRAMP' || paymentType === 'MIXED') {
        fees.breakdown.offrampFee = Math.floor(amount * 10 / 10000);
      }

      // Split fee: 0.3%, min 0.1 USDC (100000 micro units)
      fees.breakdown.splitFee = Math.max(
        Math.floor(amount * 30 / 10000),
        100000,
      );

      fees.breakdown.totalFee = fees.breakdown.onrampFee + fees.breakdown.offrampFee + fees.breakdown.splitFee;
      fees.netAmount = amount - fees.breakdown.totalFee;

      // Convert to human-readable
      const toUsdc = (micro: number) => (micro / 1000000).toFixed(6);

      return this.toolResponse({
        success: true,
        fees,
        humanReadable: {
          amount: `${toUsdc(amount)} USDC`,
          onrampFee: `${toUsdc(fees.breakdown.onrampFee)} USDC (0.1%)`,
          offrampFee: `${toUsdc(fees.breakdown.offrampFee)} USDC (0.1%)`,
          splitFee: `${toUsdc(fees.breakdown.splitFee)} USDC (0.3%, min 0.1 USDC)`,
          totalFee: `${toUsdc(fees.breakdown.totalFee)} USDC`,
          netAmount: `${toUsdc(fees.netAmount)} USDC`,
        },
        feeStructure: {
          cryptoDirect: '0% (free)',
          onramp: '+0.1%',
          offramp: '+0.1%',
          split: '0.3% (min 0.1 USDC)',
        },
      });
    } catch (error: any) {
      this.logger.error(`Fee calculation failed: ${error.message}`);
      return this.toolResponse({
        success: false,
        error: 'FEE_CALC_ERROR',
        message: error.message,
      });
    }
  }

  // ========== Commerce Skill Launch Tools (2026-02-08) ==========

  private async handlePublishToMarketplace(args: any): Promise<any> {
    try {
      const userId = args.userId || args._mcpContext?.userId;
      if (!userId) {
        return this.toolResponse({ success: false, error: 'AUTH_REQUIRED', message: 'Authentication required to publish.' });
      }
      const { type, name, description, category, pricing, splitPlan, budgetPool, tags, visibility } = args;
      if (!type || !name || !description) {
        return this.toolResponse({ success: false, error: 'VALIDATION_ERROR', message: 'type, name, and description are required.' });
      }
      const publishDto = {
        name, description, category: category || 'other',
        pricingType: pricing?.model || 'free', pricePerCall: pricing?.price || 0,
        currency: pricing?.currency || 'USD', executorType: type === 'skill' ? 'internal' : 'http',
        tags: tags || [], visibility: visibility || 'public',
        splitPlanTemplate: splitPlan?.template, splitRules: splitPlan?.rules,
        budgetPoolConfig: budgetPool,
      };
      const result = await this.commerceService.execute('createSplitPlan', 'PAY_AND_SPLIT', publishDto, userId);
      return this.toolResponse({
        success: true, message: `Published "${name}" to Agentrix Marketplace!`,
        data: result, platformUrl: `https://www.agentrix.top/marketplace`,
        fees: { walletPayment: 'Free', splitCommission: '0.3%', onramp: '0.1%', offramp: '0.1%' },
      });
    } catch (error: any) {
      this.logger.error(`publish_to_marketplace error: ${error.message}`);
      return this.toolResponse({ success: false, error: 'PUBLISH_FAILED', message: error.message });
    }
  }

  private async handleSearchMarketplace(args: any): Promise<any> {
    try {
      const { query, type, category, priceMin, priceMax, sortBy, page, limit } = args;
      if (!query) {
        return this.toolResponse({ success: false, error: 'VALIDATION_ERROR', message: 'Please provide a search query.' });
      }
      // Search skills
      let skillResults: any[] = [];
      try {
        const skills = await this.skillService.findAll();
        const filtered = (Array.isArray(skills) ? skills : []).filter((s: any) =>
          s.name?.toLowerCase().includes(query.toLowerCase()) ||
          s.description?.toLowerCase().includes(query.toLowerCase())
        );
        skillResults = filtered.map((s: any) => ({
          id: s.id, type: 'skill', name: s.name,
          description: s.description?.substring(0, 200),
          category: s.category, pricing: { model: s.pricingType || 'free', price: s.pricePerCall || 0 },
          rating: s.rating || 0, totalCalls: s.totalCalls || 0,
          executeAction: 'execute_skill',
        }));
      } catch (e) { /* skill search optional */ }
      // Search products
      let productResults: any[] = [];
      try {
        if (!type || type === 'all' || type === 'product') {
          const products = await this.productService.getProducts(query, undefined, 'active');
          productResults = (Array.isArray(products) ? products : []).map((p: any) => ({
            id: p.id, type: 'product', name: p.name,
            description: p.description?.substring(0, 200),
            pricing: { model: 'one_time', price: p.price || 0 },
          }));
        }
      } catch (e) { /* product search optional */ }
      let allResults = [...skillResults, ...productResults];
      if (type && type !== 'all') allResults = allResults.filter(r => r.type === type);
      if (priceMin !== undefined) allResults = allResults.filter(r => r.pricing.price >= priceMin);
      if (priceMax !== undefined) allResults = allResults.filter(r => r.pricing.price <= priceMax);
      if (sortBy === 'price_low') allResults.sort((a, b) => a.pricing.price - b.pricing.price);
      else if (sortBy === 'price_high') allResults.sort((a, b) => b.pricing.price - a.pricing.price);
      else if (sortBy === 'popular') allResults.sort((a, b) => (b.totalCalls || 0) - (a.totalCalls || 0));
      const pageNum = page || 1;
      const limitNum = Math.min(limit || 10, 50);
      const paged = allResults.slice((pageNum - 1) * limitNum, pageNum * limitNum);
      return this.toolResponse({
        success: true, results: paged, total: allResults.length, page: pageNum, query,
        platformUrl: `https://www.agentrix.top/marketplace?q=${encodeURIComponent(query)}`,
        tip: paged.length === 0 ? 'No results. Try broader terms.' : `Found ${allResults.length} results. Use execute_skill with skillId to run a skill.`,
      });
    } catch (error: any) {
      this.logger.error(`search_marketplace error: ${error.message}`);
      return this.toolResponse({ success: false, error: 'SEARCH_FAILED', message: error.message });
    }
  }

  private async handleExecuteSkill(args: any): Promise<any> {
    try {
      const userId = args.userId || args._mcpContext?.userId;
      const { skillId, params, paymentMethod, maxPrice } = args;
      if (!skillId) {
        return this.toolResponse({ success: false, error: 'VALIDATION_ERROR', message: 'skillId is required. Use search_marketplace first.' });
      }
      // Execute via SkillExecutorService
      const result = await this.skillExecutorService.execute(skillId, {
        ...params, userId, paymentMethod: paymentMethod || 'balance', maxPrice,
      });
      return this.toolResponse({
        success: true, message: `Skill executed successfully`,
        result, paymentMethod: paymentMethod || 'balance',
        platformFee: '0.3% on revenue splits',
      });
    } catch (error: any) {
      this.logger.error(`execute_skill error: ${error.message}`);
      return this.toolResponse({ success: false, error: 'EXECUTION_FAILED', message: error.message });
    }
  }

  // ============ A2A Task Management Handlers ============

  private async handleA2ACreateTask(args: any): Promise<any> {
    try {
      const task = await this.a2aService.createTask({
        requesterAgentId: args.requester_agent_id,
        targetAgentId: args.target_agent_id,
        requesterUserId: args.requester_user_id || args._mcpContext?.userId,
        title: args.title,
        description: args.description || '',
        taskType: args.task_type,
        params: args.params,
        priority: args.priority,
        maxPrice: args.max_price ? String(args.max_price) : undefined,
        currency: args.currency,
        mandateId: args.mandate_id,
        budgetPoolId: args.budget_pool_id,
        skillId: args.skill_id,
        deadline: args.deadline,
        callback: args.callback,
        parentTaskId: args.parent_task_id,
        metadata: args.metadata,
      });
      return this.toolResponse({
        success: true,
        task_id: task.id,
        status: task.status,
        message: `✅ A2A task created: ${task.id} → agent ${args.target_agent_id}`,
      });
    } catch (error: any) {
      return this.toolResponse({ success: false, error: error.message, message: `Failed to create A2A task: ${error.message}` });
    }
  }

  private async handleA2AGetTask(args: any): Promise<any> {
    try {
      const task = await this.a2aService.getTask(args.task_id);
      return this.toolResponse({
        success: true,
        task: {
          id: task.id, status: task.status, title: task.title,
          requester: task.requesterAgentId, target: task.targetAgentId,
          priority: task.priority, currency: task.currency,
          agreed_price: task.agreedPrice, deliverables_count: task.deliverables?.length || 0,
          quality_score: task.qualityAssessment?.score,
          created_at: task.createdAt, accepted_at: task.acceptedAt,
          delivered_at: task.deliveredAt, completed_at: task.completedAt,
        },
      });
    } catch (error: any) {
      return this.toolResponse({ success: false, error: error.message });
    }
  }

  private async handleA2AListTasks(args: any): Promise<any> {
    try {
      const result = await this.a2aService.listTasks({
        agentId: args.agent_id,
        role: args.role,
        status: args.status,
        taskType: args.task_type,
        page: args.page,
        limit: args.limit,
      });
      return this.toolResponse({
        success: true,
        tasks: result.tasks.map(t => ({
          id: t.id, status: t.status, title: t.title,
          requester: t.requesterAgentId, target: t.targetAgentId,
          priority: t.priority, created_at: t.createdAt,
        })),
        total: result.total,
      });
    } catch (error: any) {
      return this.toolResponse({ success: false, error: error.message });
    }
  }

  private async handleA2AAcceptTask(args: any): Promise<any> {
    try {
      const task = await this.a2aService.acceptTask(args.task_id, args.agent_id, {
        agreedPrice: args.agreed_price ? String(args.agreed_price) : undefined,
        message: args.message,
      });
      return this.toolResponse({
        success: true, task_id: task.id, status: task.status,
        message: `✅ Task ${task.id} accepted by ${args.agent_id}`,
      });
    } catch (error: any) {
      return this.toolResponse({ success: false, error: error.message });
    }
  }

  private async handleA2ADeliverTask(args: any): Promise<any> {
    try {
      const task = await this.a2aService.deliverTask(args.task_id, args.agent_id, {
        deliverables: args.deliverables || [],
        message: args.message,
      });
      return this.toolResponse({
        success: true, task_id: task.id, status: task.status,
        deliverables_count: task.deliverables?.length || 0,
        message: `✅ Deliverables submitted for task ${task.id}`,
      });
    } catch (error: any) {
      return this.toolResponse({ success: false, error: error.message });
    }
  }

  private async handleA2AReviewTask(args: any): Promise<any> {
    try {
      if (args.auto_assess) {
        const result = await this.a2aService.autoApproveIfQualified(args.task_id, args.threshold || 70);
        return this.toolResponse({
          success: true, task_id: args.task_id,
          auto_approved: result.approved,
          quality_score: result.assessment.score,
          message: result.approved
            ? `✅ Auto-approved: score ${result.assessment.score}`
            : `⚠️ Below threshold: score ${result.assessment.score}, manual review needed`,
        });
      }
      const task = await this.a2aService.reviewTask(args.task_id, args.agent_id, {
        approved: args.approved,
        qualityScore: args.quality_score,
        comment: args.comment,
        criteria: args.criteria,
      });
      return this.toolResponse({
        success: true, task_id: task.id, status: task.status,
        quality_score: task.qualityAssessment?.score,
        message: args.approved ? `✅ Task approved` : `❌ Task rejected`,
      });
    } catch (error: any) {
      return this.toolResponse({ success: false, error: error.message });
    }
  }

  private async handleA2ACancelTask(args: any): Promise<any> {
    try {
      const task = await this.a2aService.cancelTask(args.task_id, args.agent_id, args.reason);
      return this.toolResponse({
        success: true, task_id: task.id, status: task.status,
        message: `Task ${task.id} cancelled`,
      });
    } catch (error: any) {
      return this.toolResponse({ success: false, error: error.message });
    }
  }

  private async handleA2AGetReputation(args: any): Promise<any> {
    try {
      const rep = await this.a2aService.getReputation(args.agent_id);
      return this.toolResponse({
        success: true,
        agent_id: rep.agentId,
        overall_score: rep.overallScore,
        tier: rep.tier,
        tasks_completed: rep.tasksCompleted,
        tasks_failed: rep.tasksFailed,
        avg_quality_score: rep.avgQualityScore,
        avg_response_time: rep.avgResponseTime,
        on_time_rate: rep.onTimeRate,
        specializations: rep.specializations,
        message: `Agent ${rep.agentId}: ${rep.tier} tier, score ${rep.overallScore}/100`,
      });
    } catch (error: any) {
      return this.toolResponse({ success: false, error: error.message });
    }
  }
}
