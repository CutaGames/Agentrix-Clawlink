import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { McpServer, McpTransport, McpServerStatus } from '../../entities/mcp-server.entity';

@Injectable()
export class McpServerRegistryService {
  private readonly logger = new Logger(McpServerRegistryService.name);

  constructor(
    @InjectRepository(McpServer)
    private readonly mcpServerRepo: Repository<McpServer>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // Server Registration CRUD
  // ═══════════════════════════════════════════════════════════════════════

  async listServers(userId: string): Promise<McpServer[]> {
    return this.mcpServerRepo.find({
      where: { userId },
      order: { name: 'ASC' },
    });
  }

  async getServer(serverId: string): Promise<McpServer | null> {
    return this.mcpServerRepo.findOne({ where: { id: serverId } });
  }

  async registerServer(userId: string, data: {
    name: string;
    description?: string;
    transport: McpTransport;
    url?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    auth?: McpServer['auth'];
  }): Promise<McpServer> {
    const server = this.mcpServerRepo.create({
      ...data,
      userId,
      status: McpServerStatus.DISCONNECTED,
      isEnabled: true,
    });
    return this.mcpServerRepo.save(server);
  }

  async updateServer(serverId: string, data: Partial<McpServer>): Promise<McpServer | null> {
    const server = await this.mcpServerRepo.findOne({ where: { id: serverId } });
    if (!server) return null;
    Object.assign(server, data);
    return this.mcpServerRepo.save(server);
  }

  async deleteServer(serverId: string): Promise<boolean> {
    const result = await this.mcpServerRepo.delete(serverId);
    return (result.affected || 0) > 0;
  }

  async toggleServer(serverId: string, enabled: boolean): Promise<McpServer | null> {
    const server = await this.mcpServerRepo.findOne({ where: { id: serverId } });
    if (!server) return null;
    server.isEnabled = enabled;
    return this.mcpServerRepo.save(server);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tool Discovery
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Connect to an MCP server and discover its tools.
   * For SSE/HTTP: sends a JSON-RPC tools/list request.
   * For stdio: would need a local process (not supported from backend, desktop-only).
   */
  async discoverTools(serverId: string): Promise<McpServer> {
    const server = await this.mcpServerRepo.findOne({ where: { id: serverId } });
    if (!server) throw new Error('Server not found');

    if (server.transport === McpTransport.STDIO) {
      // stdio MCP servers run locally — discovery happens on the desktop client
      this.logger.warn(`stdio transport discovery not supported from backend: ${server.name}`);
      server.status = McpServerStatus.DISCONNECTED;
      server.lastError = 'stdio transport requires desktop client for discovery';
      return this.mcpServerRepo.save(server);
    }

    server.status = McpServerStatus.CONNECTING;
    await this.mcpServerRepo.save(server);

    try {
      const tools = await this.fetchToolsFromServer(server);
      server.discoveredTools = tools;
      server.toolCount = tools.length;
      server.status = McpServerStatus.CONNECTED;
      server.lastConnectedAt = new Date();
      server.lastError = undefined;
      this.logger.log(`Discovered ${tools.length} tools from MCP server "${server.name}"`);
    } catch (err: any) {
      server.status = McpServerStatus.ERROR;
      server.lastError = err.message;
      this.logger.warn(`MCP tool discovery failed for "${server.name}": ${err.message}`);
    }

    return this.mcpServerRepo.save(server);
  }

  /**
   * Get all enabled MCP server tools for a user, formatted as Claude/OpenAI tool schemas.
   */
  async getUserMcpTools(userId: string): Promise<Array<{
    name: string;
    description: string;
    input_schema: Record<string, any>;
    mcpServerId: string;
    mcpServerName: string;
  }>> {
    const servers = await this.mcpServerRepo.find({
      where: { userId, isEnabled: true },
    });

    const tools: Array<{
      name: string;
      description: string;
      input_schema: Record<string, any>;
      mcpServerId: string;
      mcpServerName: string;
    }> = [];

    for (const server of servers) {
      if (!server.discoveredTools?.length) continue;
      for (const tool of server.discoveredTools) {
        tools.push({
          name: `mcp_${server.name.replace(/\s+/g, '_').toLowerCase()}_${tool.name}`,
          description: `[MCP: ${server.name}] ${tool.description || tool.name}`,
          input_schema: tool.inputSchema || { type: 'object', properties: {} },
          mcpServerId: server.id,
          mcpServerName: server.name,
        });
      }
    }

    return tools;
  }

  /**
   * Execute a tool call against an MCP server.
   */
  async executeToolCall(serverId: string, toolName: string, args: Record<string, any>): Promise<any> {
    const server = await this.mcpServerRepo.findOne({ where: { id: serverId } });
    if (!server || !server.url) {
      throw new Error('MCP server not found or has no URL');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (server.auth?.type === 'bearer' && server.auth.token) {
      headers['Authorization'] = `Bearer ${server.auth.token}`;
    }

    const rpcPayload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(server.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcPayload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`MCP server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }

      return data.result;
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Internal
  // ═══════════════════════════════════════════════════════════════════════

  private async fetchToolsFromServer(server: McpServer): Promise<Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, any>;
  }>> {
    if (!server.url) throw new Error('Server URL is required for SSE/HTTP transport');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (server.auth?.type === 'bearer' && server.auth.token) {
      headers['Authorization'] = `Bearer ${server.auth.token}`;
    }

    // JSON-RPC tools/list
    const rpcPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(server.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcPayload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }

      // MCP tools/list response: { result: { tools: [...] } }
      const tools = data.result?.tools || data.tools || [];
      return tools.map((t: any) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }
}
