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
    // 注意：ChatGPT 可能会尝试 POST 到这个同一个 URL
    const transport = new (SSEServerTransport as any)('/api/mcp/messages', res);
    await this.mcpService.connectTransport(transport);
    
    this.logger.log('MCP SSE connection established');
  }

  /**
   * 兼容性处理：有些客户端会尝试 POST 到 SSE 端点
   */
  @Post('sse')
  async ssePost(@Req() req: Request, @Res() res: Response) {
    this.logger.log('Received POST request on SSE endpoint, redirecting to messages');
    return this.messages(req, res);
  }

  /**
   * 处理来自 AI 的消息
   */
  @Post('messages')
  async messages(@Req() req: Request, @Res() res: Response) {
    // 从 query 中获取 sessionId
    const sessionId = req.query.sessionId as string;
    this.logger.log(`Received MCP message for session: ${sessionId}`);

    // 这里需要找到对应的 transport 实例来处理消息
    // 暂时使用 service 中最后连接的 transport (仅适用于单用户测试)
    const transport = (this.mcpService as any).server.transport;
    if (transport && (transport as any).handlePostMessage) {
      await (transport as any).handlePostMessage(req, res);
    } else {
      this.logger.warn('No active MCP transport found for message');
      res.status(404).send('No active MCP transport found');
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
