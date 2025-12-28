import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SkillService } from '../skill/skill.service';
import { SkillExecutorService } from '../skill/skill-executor.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
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

  constructor(
    private readonly configService: ConfigService,
    private readonly skillService: SkillService,
    private readonly skillExecutorService: SkillExecutorService,
    private readonly marketplaceService: MarketplaceService,
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
          // ChatGPT 可能会寻找顶层的 authentication
          authentication: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://api.agentrix.top/api/oauth/authorize',
                tokenUrl: 'https://api.agentrix.top/api/oauth/token',
                scopes: {
                  all: 'Full access to Agentrix'
                }
              }
            }
          },
          experimental: {
            authentication: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: 'https://api.agentrix.top/api/oauth/authorize',
                  tokenUrl: 'https://api.agentrix.top/api/oauth/token',
                  scopes: {
                    all: 'Full access to Agentrix'
                  }
                }
              }
            }
          }
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
    const authConfig = {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: 'https://agentrix.top/api/oauth/authorize',
          tokenUrl: 'https://agentrix.top/api/oauth/token',
          scopes: {
            'read:tools': 'Read available tools',
            'use:tools': 'Execute tools',
          },
        },
      },
    };

    return {
      tools: {},
      resources: {},
      prompts: {},
      logging: {},
      authentication: authConfig,
      experimental: {
        authentication: authConfig,
      },
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
        description: 'Search products in Agentrix Marketplace',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            assetType: { type: 'string', enum: ['physical', 'service', 'nft', 'ft', 'game_asset', 'rwa'] },
            limit: { type: 'number', default: 10 }
          },
          required: ['query']
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
   * 统一处理 Tool 调用逻辑
   */
  private async handleCallTool(name: string, args: any) {
    this.logger.log(`Tool Call: ${name} with args: ${JSON.stringify(args)}`);

    try {
      if (name === 'search_products') {
        const results = await this.marketplaceService.getAssets({
          search: (args as any).query,
          type: (args as any).assetType,
          pageSize: (args as any).limit
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(results) }],
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
   * 连接 Transport
   */
  async connectTransport(transport: any) {
    await this.server.connect(transport);
  }

  /**
   * REST 桥接：执行 Tool 调用
   */
  async callTool(name: string, args: any) {
    return this.handleCallTool(name, args);
  }

  /**
   * 获取 OpenAPI Schema (用于 Gemini/Grok)
   */
  async getOpenApiSchema() {
    const tools = await this.getAllTools();

    const paths = {};
    for (const tool of tools) {
      paths[`/api/mcp/tool/${tool.name}`] = {
        post: {
          operationId: tool.name,
          summary: tool.description,
          requestBody: {
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
                  schema: { type: 'object' },
                },
              },
            },
          },
        },
      };
    }

    return {
      openapi: '3.1.0',
      info: {
        title: 'Agentrix MCP Tools API',
        version: '1.0.0',
        description: 'REST API bridge for Agentrix MCP Tools',
      },
      paths,
    };
  }
}

