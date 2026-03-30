import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { McpServerRegistryService } from './mcp-server-registry.service';
import { McpTransport } from '../../entities/mcp-server.entity';

@ApiTags('mcp-servers')
@Controller('mcp-servers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class McpServerRegistryController {
  constructor(private readonly registry: McpServerRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'List registered MCP servers' })
  async listServers(@Request() req: any) {
    return this.registry.listServers(req.user.id);
  }

  @Get(':serverId')
  @ApiOperation({ summary: 'Get MCP server details' })
  async getServer(@Param('serverId') serverId: string) {
    const server = await this.registry.getServer(serverId);
    if (!server) return { error: 'Server not found' };
    return server;
  }

  @Post()
  @ApiOperation({ summary: 'Register a new MCP server' })
  async registerServer(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      transport: McpTransport;
      url?: string;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      auth?: { type?: string; token?: string; clientId?: string; clientSecret?: string };
    },
  ) {
    return this.registry.registerServer(req.user.id, body as any);
  }

  @Put(':serverId')
  @ApiOperation({ summary: 'Update MCP server config' })
  async updateServer(
    @Param('serverId') serverId: string,
    @Body() body: any,
  ) {
    const server = await this.registry.updateServer(serverId, body);
    if (!server) return { error: 'Server not found' };
    return server;
  }

  @Delete(':serverId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete MCP server' })
  async deleteServer(@Param('serverId') serverId: string) {
    const ok = await this.registry.deleteServer(serverId);
    return { ok };
  }

  @Post(':serverId/discover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discover tools from MCP server' })
  async discoverTools(@Param('serverId') serverId: string) {
    return this.registry.discoverTools(serverId);
  }

  @Post(':serverId/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable/disable MCP server' })
  async toggleServer(
    @Param('serverId') serverId: string,
    @Body() body: { enabled: boolean },
  ) {
    const server = await this.registry.toggleServer(serverId, body.enabled);
    if (!server) return { error: 'Server not found' };
    return server;
  }

  @Get('tools/all')
  @ApiOperation({ summary: 'Get all discovered MCP tools for user' })
  async getAllTools(@Request() req: any) {
    return this.registry.getUserMcpTools(req.user.id);
  }
}
