import { Controller, Get, Post, Body, Req, Res, Logger, UseGuards, Param } from '@nestjs/common';
import { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Public } from '../auth/decorators/public.decorator';

@Controller('mcp')
@Public()
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpService: McpService) {}

  /**
   * MCP SSE 端点
   * 用于 ChatGPT 等云端 AI 建立长连接
   */
  @Get('sse')
  async sse(@Req() req: Request, @Res() res: Response) {
    // 如果请求的是 JSON，则返回能力声明（用于探测）
    if (req.headers.accept?.includes('application/json')) {
      this.logger.log('Probing MCP capabilities via JSON');
      return res.json({
        capabilities: this.mcpService.getCapabilities()
      });
    }

    this.logger.log('New MCP SSE connection request');
    
    // 创建一个新的 SSE transport 并连接到 server
    const transport = new (SSEServerTransport as any)('/api/mcp/messages', res);
    const sessionId = await this.mcpService.connectTransport(transport);
    
    this.logger.log(`MCP SSE connection established with sessionId: ${sessionId}`);
  }

  /**
   * 兼容性处理：有些客户端会尝试 POST 到 SSE 端点
   * ChatGPT 会先 GET 建立 SSE 连接，然后 POST 发送消息
   * 但如果没有 sessionId，我们需要特殊处理
   */
  @Post('sse')
  async ssePost(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.query.sessionId as string;
    
    // 如果有 sessionId，正常处理消息
    if (sessionId) {
      this.logger.log(`POST /sse with sessionId: ${sessionId}, redirecting to messages`);
      return this.messages(req, res);
    }
    
    // 如果没有 sessionId，尝试使用最新的 transport
    this.logger.log('POST /sse without sessionId, trying latest transport');
    const transport = this.mcpService.getLatestTransport();
    
    if (transport && (transport as any).handlePostMessage) {
      try {
        await (transport as any).handlePostMessage(req, res);
      } catch (error: any) {
        this.logger.error(`Failed to handle MCP message via POST /sse: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: error.message });
        }
      }
    } else {
      // 没有活跃连接时，返回提示信息而不是 500 错误
      this.logger.warn('No active MCP transport for POST /sse - SSE connection may not be established');
      res.status(400).json({ 
        error: 'SSE connection not established',
        hint: 'Please establish SSE connection first by connecting to GET /api/mcp/sse',
        message: 'No active Server-Sent Events connection found. The AI client should first establish a GET connection to /api/mcp/sse before sending POST messages.'
      });
    }
  }

  /**
   * 处理来自 AI 的消息
   */
  @Post('messages')
  async messages(@Req() req: Request, @Res() res: Response) {
    // 从 query 中获取 sessionId
    const sessionId = req.query.sessionId as string;
    this.logger.log(`Received MCP message for session: ${sessionId}`);

    // 根据 sessionId 查找对应的 transport
    let transport = sessionId ? this.mcpService.getTransport(sessionId) : null;
    
    // 如果找不到，尝试使用最新的 transport（单用户兼容）
    if (!transport) {
      this.logger.warn(`No transport found for sessionId: ${sessionId}, trying latest transport`);
      transport = this.mcpService.getLatestTransport();
    }
    
    if (transport && (transport as any).handlePostMessage) {
      try {
        await (transport as any).handlePostMessage(req, res);
      } catch (error: any) {
        this.logger.error(`Failed to handle MCP message: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: error.message });
        }
      }
    } else {
      this.logger.warn('No active MCP transport found for message');
      res.status(400).json({ 
        error: 'No active MCP transport found',
        hint: 'Please establish SSE connection first by connecting to GET /api/mcp/sse'
      });
    }
  }

  /**
   * 获取 OpenAPI Schema
   * 用于 Gemini Extensions 或 Grok Tools
   */
  @Get('openapi.json')
  async getOpenApi() {
    return this.mcpService.getOpenApiSchema();
  }

  /**
   * REST 桥接：执行 Tool 调用
   * 用于不支持 MCP 的平台通过 REST 调用
   */
  @Post('tool/:name')
  async callTool(@Param('name') name: string, @Body() args: any) {
    return this.mcpService.callTool(name, args);
  }
}
