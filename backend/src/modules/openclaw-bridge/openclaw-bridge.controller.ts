import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OpenClawBridgeService } from './openclaw-bridge.service';

@ApiTags('openclaw/bridge')
@Controller('openclaw/bridge')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OpenClawBridgeController {
  constructor(private readonly bridge: OpenClawBridgeService) {}

  /**
   * Probe an arbitrary URL to check reachability and gather instance metadata.
   * Used during the "Connect Existing" discovery step before binding.
   */
  @Post('probe')
  @ApiOperation({ summary: 'Probe a URL to check if OpenClaw is reachable' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'http://192.168.1.42:3001' },
        token: { type: 'string', description: 'Optional API token' },
      },
      required: ['url'],
    },
  })
  async probeUrl(
    @Body('url') url: string,
    @Body('token') token?: string,
  ) {
    return this.bridge.probeUrl(url, token);
  }

  /**
   * Migrate data from an already-bound OpenClaw instance into Agentrix.
   * Pulls: agent config, installed skills, memory entries, chat session list.
   */
  @Post(':instanceId/migrate')
  @ApiOperation({ summary: 'Pull skills, memory, config and sessions from an existing instance' })
  async migrate(
    @Request() req: any,
    @Param('instanceId') instanceId: string,
  ) {
    return this.bridge.migrateInstance(req.user.id, instanceId);
  }

  /**
   * Returns the recommended local ports + health paths for client-side LAN scanning.
   * The mobile app scans its own LAN using these parameters — the server cannot
   * reach the user's private network, so scanning is delegated to the client.
   */
  @Get('discover/config')
  @ApiOperation({ summary: 'Get LAN discovery parameters (ports + paths) for mobile-side scanning' })
  async discoverConfig() {
    return this.bridge.getDiscoveryCandidates();
  }
}
