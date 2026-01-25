/**
 * AI Ecosystem Integration Tools
 * 为主流AI生态（GPTs、Claude MCP等）提供集成接口
 */

import { AgentAuthorizationResource } from './agent-authorization';
import { AirdropResource } from './airdrop';
import { AutoEarnResource } from './auto-earn';
import { MPCWalletResource } from './mpc-wallet';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// ========== MCP (Model Context Protocol) 工具定义 ==========

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * 生成MCP工具定义，用于Claude等支持MCP的AI系统
 */
export function generateMCPTools(): MCPTool[] {
  return [
    // Agent授权工具
    {
      name: 'agent_create_authorization',
      description: '为AI Agent创建支付授权，设置单笔限额、每日限额和策略权限。授权后Agent可以自主执行交易。',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent的唯一标识符' },
          singleLimit: { type: 'number', description: '单笔交易限额（USDT）' },
          dailyLimit: { type: 'number', description: '每日交易限额（USDT）' },
          expiryDays: { type: 'number', description: '授权有效期（天）' },
          allowedStrategies: {
            type: 'array',
            items: { type: 'string', enum: ['dca', 'grid', 'arbitrage', 'market_making', 'rebalancing'] },
            description: '允许的策略类型'
          }
        },
        required: ['agentId', 'singleLimit', 'dailyLimit']
      }
    },
    {
      name: 'agent_check_authorization',
      description: '检查Agent当前的授权状态和剩余额度',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent的唯一标识符' }
        },
        required: ['agentId']
      }
    },
    {
      name: 'agent_revoke_authorization',
      description: '撤销Agent的授权，停止其执行交易的能力',
      inputSchema: {
        type: 'object',
        properties: {
          authorizationId: { type: 'string', description: '授权ID' }
        },
        required: ['authorizationId']
      }
    },

    // 空投检测工具
    {
      name: 'airdrop_discover',
      description: '扫描和发现可领取的加密货币空投机会',
      inputSchema: {
        type: 'object',
        properties: {
          chains: {
            type: 'array',
            items: { type: 'string' },
            description: '要扫描的区块链（如bsc, ethereum）'
          },
          minValue: { type: 'number', description: '最小估值（USD）' }
        }
      }
    },
    {
      name: 'airdrop_check_eligibility',
      description: '检查用户是否有资格领取特定空投',
      inputSchema: {
        type: 'object',
        properties: {
          airdropId: { type: 'string', description: '空投ID' }
        },
        required: ['airdropId']
      }
    },
    {
      name: 'airdrop_claim',
      description: '领取符合条件的空投',
      inputSchema: {
        type: 'object',
        properties: {
          airdropId: { type: 'string', description: '空投ID' }
        },
        required: ['airdropId']
      }
    },
    {
      name: 'airdrop_claim_all',
      description: '批量领取所有符合条件的空投',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },

    // 自动收益工具
    {
      name: 'autoearn_get_stats',
      description: '获取自动收益统计数据，包括总收益、各类型收益分布',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'autoearn_scan_arbitrage',
      description: '扫描跨交易所套利机会',
      inputSchema: {
        type: 'object',
        properties: {
          pairs: {
            type: 'array',
            items: { type: 'string' },
            description: '交易对（如BTC/USDT, ETH/USDT）'
          },
          minProfit: { type: 'number', description: '最小利润百分比' }
        }
      }
    },
    {
      name: 'autoearn_execute_arbitrage',
      description: '执行套利交易',
      inputSchema: {
        type: 'object',
        properties: {
          opportunityId: { type: 'string', description: '套利机会ID' },
          amount: { type: 'number', description: '投入金额' }
        },
        required: ['opportunityId', 'amount']
      }
    },
    {
      name: 'autoearn_create_strategy',
      description: '创建自动交易策略（定投、网格等）',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['dca', 'grid', 'arbitrage', 'copy_trading'],
            description: '策略类型'
          },
          config: {
            type: 'object',
            description: '策略配置参数'
          }
        },
        required: ['type', 'config']
      }
    },
    {
      name: 'autoearn_launchpad_discover',
      description: '发现Launchpad项目机会',
      inputSchema: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: '平台名称' },
          riskLevel: { type: 'string', enum: ['low', 'medium', 'high'], description: '风险等级' }
        }
      }
    },

    // MPC钱包工具
    {
      name: 'mpc_wallet_create',
      description: '创建MPC多方计算钱包，生成安全的密钥分片',
      inputSchema: {
        type: 'object',
        properties: {
          chain: {
            type: 'string',
            enum: ['bsc', 'ethereum', 'polygon'],
            description: '目标区块链'
          }
        }
      }
    },
    {
      name: 'mpc_wallet_get_balance',
      description: '获取MPC钱包余额',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'mpc_wallet_setup_auto_split',
      description: '设置自动分账规则，当收到资金时自动分配给多个地址',
      inputSchema: {
        type: 'object',
        properties: {
          triggerAmount: { type: 'number', description: '触发金额' },
          triggerToken: { type: 'string', description: '触发代币' },
          recipients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                address: { type: 'string' },
                percentage: { type: 'number' }
              }
            },
            description: '分账接收者列表'
          }
        },
        required: ['triggerAmount', 'triggerToken', 'recipients']
      }
    }
  ];
}

// ========== OpenAPI Schema for GPTs ==========

export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description?: string }>;
  paths: Record<string, any>;
  components: {
    securitySchemes: Record<string, any>;
    schemas: Record<string, any>;
  };
  security: Array<Record<string, any[]>>;
}

/**
 * 生成OpenAPI Schema，用于GPTs Actions集成
 */
export function generateOpenAPISchema(baseUrl: string = 'https://api.agentrix.com'): OpenAPISchema {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Agentrix Agent API',
      version: '1.0.0',
      description: 'Agentrix AI Agent支付与收益管理API，支持Agent授权、空投检测、自动收益、MPC钱包等功能。'
    },
    servers: [{ url: baseUrl, description: 'Agentrix API Server' }],
    paths: {
      // Agent授权
      '/api/agent-authorization': {
        post: {
          operationId: 'createAgentAuthorization',
          summary: '创建Agent授权',
          description: '为AI Agent创建支付授权，设置限额和策略权限',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateAuthorizationRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: '授权创建成功',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Authorization' }
                }
              }
            }
          }
        }
      },
      '/api/agent-authorization/agent/{agentId}/active': {
        get: {
          operationId: 'getActiveAuthorization',
          summary: '获取Agent活跃授权',
          parameters: [
            { name: 'agentId', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: '返回活跃授权信息',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Authorization' }
                }
              }
            }
          }
        }
      },

      // 空投
      '/api/auto-earn/airdrops/discover': {
        post: {
          operationId: 'discoverAirdrops',
          summary: '发现空投机会',
          description: '扫描和发现可领取的加密货币空投',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    chains: { type: 'array', items: { type: 'string' } },
                    minValue: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: '返回空投列表',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Airdrop' }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auto-earn/airdrops/{airdropId}/claim': {
        post: {
          operationId: 'claimAirdrop',
          summary: '领取空投',
          parameters: [
            { name: 'airdropId', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: '领取结果',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ClaimResult' }
                }
              }
            }
          }
        }
      },

      // 自动收益
      '/api/auto-earn/stats': {
        get: {
          operationId: 'getEarningsStats',
          summary: '获取收益统计',
          responses: {
            '200': {
              description: '收益统计数据',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/EarningsStats' }
                }
              }
            }
          }
        }
      },
      '/api/auto-earn/arbitrage/opportunities': {
        get: {
          operationId: 'scanArbitrageOpportunities',
          summary: '扫描套利机会',
          parameters: [
            { name: 'pairs', in: 'query', schema: { type: 'string' }, description: '交易对，逗号分隔' },
            { name: 'minProfit', in: 'query', schema: { type: 'number' } }
          ],
          responses: {
            '200': {
              description: '套利机会列表',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ArbitrageOpportunity' }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auto-earn/arbitrage/execute': {
        post: {
          operationId: 'executeArbitrage',
          summary: '执行套利',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    opportunityId: { type: 'string' },
                    amount: { type: 'number' }
                  },
                  required: ['opportunityId', 'amount']
                }
              }
            }
          },
          responses: {
            '200': {
              description: '交易结果',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TradeResult' }
                }
              }
            }
          }
        }
      },

      // MPC钱包
      '/api/mpc-wallet': {
        get: {
          operationId: 'getMPCWallet',
          summary: '获取MPC钱包信息',
          responses: {
            '200': {
              description: 'MPC钱包信息',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MPCWallet' }
                }
              }
            }
          }
        }
      },
      '/api/mpc-wallet/balances': {
        get: {
          operationId: 'getMPCWalletBalances',
          summary: '获取MPC钱包余额',
          responses: {
            '200': {
              description: '余额列表',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/WalletBalance' }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        CreateAuthorizationRequest: {
          type: 'object',
          properties: {
            agentId: { type: 'string' },
            type: { type: 'string', enum: ['erc8004_session', 'mpc_wallet', 'api_key'] },
            limit: {
              type: 'object',
              properties: {
                singleLimit: { type: 'number' },
                dailyLimit: { type: 'number' },
                totalLimit: { type: 'number' }
              }
            },
            expiresAt: { type: 'string', format: 'date-time' },
            allowedStrategies: { type: 'array', items: { type: 'string' } }
          },
          required: ['agentId', 'type', 'limit']
        },
        Authorization: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            agentId: { type: 'string' },
            status: { type: 'string', enum: ['active', 'revoked', 'expired'] },
            limit: { $ref: '#/components/schemas/AuthorizationLimit' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        AuthorizationLimit: {
          type: 'object',
          properties: {
            singleLimit: { type: 'number' },
            dailyLimit: { type: 'number' },
            usedToday: { type: 'number' }
          }
        },
        Airdrop: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            projectName: { type: 'string' },
            tokenSymbol: { type: 'string' },
            estimatedValue: { type: 'number' },
            status: { type: 'string' },
            eligible: { type: 'boolean' }
          }
        },
        ClaimResult: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transactionHash: { type: 'string' },
            amount: { type: 'number' },
            error: { type: 'string' }
          }
        },
        EarningsStats: {
          type: 'object',
          properties: {
            totalEarnings: { type: 'number' },
            todayEarnings: { type: 'number' },
            weekEarnings: { type: 'number' },
            monthEarnings: { type: 'number' }
          }
        },
        ArbitrageOpportunity: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            pair: { type: 'string' },
            buyVenue: { type: 'string' },
            sellVenue: { type: 'string' },
            profitPercentage: { type: 'number' },
            riskLevel: { type: 'string' }
          }
        },
        TradeResult: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transactionHash: { type: 'string' },
            profit: { type: 'number' },
            error: { type: 'string' }
          }
        },
        MPCWallet: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            address: { type: 'string' },
            chain: { type: 'string' },
            status: { type: 'string' }
          }
        },
        WalletBalance: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            symbol: { type: 'string' },
            balance: { type: 'string' },
            balanceUsd: { type: 'number' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }, { apiKey: [] }]
  };
}

// ========== 导出AI集成工具类 ==========

export class AIEcosystemIntegration {
  /**
   * 生成MCP工具定义
   */
  static getMCPTools(): MCPTool[] {
    return generateMCPTools();
  }

  /**
   * 创建一个本地 MCP Server
   * 允许开发者将 Agent 功能暴露给 Claude Desktop 等
   */
  static createMcpServer(options: {
    name: string;
    version: string;
  }) {
    const server = new Server(
      { name: options.name, version: options.version },
      { capabilities: { tools: {} } }
    );

    const tools = this.getMCPTools();

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: tools
    }));

    return {
      server,
      async start() {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log(`MCP Server "${options.name}" started via Stdio`);
      }
    };
  }

  /**
   * 生成OpenAPI Schema（用于GPTs）
   */
  static getOpenAPISchema(baseUrl?: string): OpenAPISchema {
    return generateOpenAPISchema(baseUrl);
  }

  /**
   * 生成GPTs Actions配置
   */
  static getGPTsActionsConfig(baseUrl: string = 'https://api.agentrix.com'): {
    schema: OpenAPISchema;
    instructions: string;
  } {
    return {
      schema: generateOpenAPISchema(baseUrl),
      instructions: `
# Agentrix Agent API 使用说明

你是一个AI Agent助手，可以帮助用户管理加密货币相关操作。

## 可用能力：

### 1. Agent授权管理
- 创建支付授权：设置单笔/每日限额
- 查看授权状态：检查剩余额度
- 撤销授权：停止Agent交易能力

### 2. 空投检测
- 发现空投：扫描可领取的空投
- 检查资格：验证是否符合领取条件
- 领取空投：执行领取操作

### 3. 自动收益
- 查看收益：获取总收益统计
- 套利机会：扫描跨交易所价差
- 执行套利：在合适时机执行交易
- 创建策略：设置定投、网格等策略

### 4. MPC钱包
- 查看余额：获取钱包资产
- 设置分账：自动分配收入

## 安全提示：
- 执行交易前请确认用户意图
- 大额操作需要二次确认
- 始终显示风险提示
      `.trim()
    };
  }

  /**
   * 生成Claude MCP配置
   */
  static getClaudeMCPConfig(): {
    tools: MCPTool[];
    systemPrompt: string;
  } {
    return {
      tools: generateMCPTools(),
      systemPrompt: `
你是Agentrix AI Agent助手，具备以下能力：

1. **Agent授权管理** (agent_create_authorization, agent_check_authorization, agent_revoke_authorization)
   - 创建和管理AI Agent的支付授权
   - 设置单笔限额、每日限额、策略权限

2. **空投检测** (airdrop_discover, airdrop_check_eligibility, airdrop_claim, airdrop_claim_all)
   - 扫描发现空投机会
   - 检查领取资格
   - 自动领取符合条件的空投

3. **自动收益** (autoearn_*)
   - 查看收益统计
   - 扫描套利机会
   - 创建和管理交易策略
   - 发现Launchpad项目

4. **MPC钱包** (mpc_wallet_*)
   - 管理MPC多方计算钱包
   - 查看余额
   - 设置自动分账规则

使用这些工具时：
- 始终向用户解释操作含义
- 涉及资金操作时请求确认
- 显示相关风险提示
      `.trim()
    };
  }
}
