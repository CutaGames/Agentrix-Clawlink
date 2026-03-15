import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ClaimDesktopCommandDto,
  CompleteDesktopCommandDto,
  CreateDesktopCommandDto,
  CreateDesktopApprovalDto,
  DesktopHeartbeatDto,
  RespondDesktopApprovalDto,
  UpsertDesktopSessionDto,
  UpsertDesktopTaskDto,
} from './dto/desktop-sync.dto';
import { DesktopSyncService } from './desktop-sync.service';

@ApiTags('Desktop Sync')
@Controller('desktop-sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DesktopSyncController {
  constructor(private readonly desktopSyncService: DesktopSyncService) {}

  @Post('heartbeat')
  @ApiOperation({ summary: 'Update desktop presence and current lightweight context' })
  @ApiResponse({ status: 200, description: 'Desktop heartbeat accepted' })
  async heartbeat(@Request() req, @Body() dto: DesktopHeartbeatDto): Promise<any> {
    return this.desktopSyncService.heartbeat(req.user.id, dto);
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create or update a desktop task session with timeline state' })
  @ApiResponse({ status: 200, description: 'Desktop task synced' })
  async upsertTask(@Request() req, @Body() dto: UpsertDesktopTaskDto): Promise<any> {
    return this.desktopSyncService.upsertTask(req.user.id, dto);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create or update a synchronized desktop/mobile chat session snapshot' })
  @ApiResponse({ status: 200, description: 'Desktop session synced' })
  async upsertSession(@Request() req, @Body() dto: UpsertDesktopSessionDto): Promise<any> {
    return this.desktopSyncService.upsertSession(req.user.id, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List synchronized desktop/mobile session summaries' })
  @ApiResponse({ status: 200, description: 'Desktop session summaries returned' })
  async listSessions(@Request() req): Promise<any> {
    return {
      sessions: this.desktopSyncService.listSessions(req.user.id),
    };
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Fetch a synchronized desktop/mobile session snapshot' })
  @ApiResponse({ status: 200, description: 'Desktop session snapshot returned' })
  async getSession(@Request() req, @Param('sessionId') sessionId: string): Promise<any> {
    return this.desktopSyncService.getSession(req.user.id, sessionId);
  }

  @Post('approvals')
  @ApiOperation({ summary: 'Create a remote approval request for a desktop action' })
  @ApiResponse({ status: 201, description: 'Approval request created' })
  async createApproval(@Request() req, @Body() dto: CreateDesktopApprovalDto): Promise<any> {
    return this.desktopSyncService.createApproval(req.user.id, dto);
  }

  @Post('commands')
  @ApiOperation({ summary: 'Queue a remote desktop command for execution on a paired desktop device' })
  @ApiResponse({ status: 201, description: 'Desktop command queued' })
  async createCommand(@Request() req, @Body() dto: CreateDesktopCommandDto): Promise<any> {
    return this.desktopSyncService.createCommand(req.user.id, dto);
  }

  @Get('commands')
  @ApiOperation({ summary: 'List recent remote desktop commands' })
  @ApiResponse({ status: 200, description: 'Desktop commands returned' })
  async listCommands(@Request() req, @Query('deviceId') deviceId?: string): Promise<any> {
    return {
      commands: this.desktopSyncService.listCommands(req.user.id, deviceId),
    };
  }

  @Get('commands/pending')
  @ApiOperation({ summary: 'List pending remote desktop commands for a device' })
  @ApiResponse({ status: 200, description: 'Pending desktop commands returned' })
  async getPendingCommands(@Request() req, @Query('deviceId') deviceId?: string): Promise<any> {
    return {
      commands: this.desktopSyncService.getPendingCommands(req.user.id, deviceId),
    };
  }

  @Post('commands/:commandId/claim')
  @ApiOperation({ summary: 'Claim a pending remote desktop command for execution' })
  @ApiResponse({ status: 200, description: 'Desktop command claimed' })
  async claimCommand(
    @Request() req,
    @Param('commandId') commandId: string,
    @Body() dto: ClaimDesktopCommandDto,
  ): Promise<any> {
    return this.desktopSyncService.claimCommand(req.user.id, commandId, dto);
  }

  @Post('commands/:commandId/complete')
  @ApiOperation({ summary: 'Complete a remote desktop command with a result payload' })
  @ApiResponse({ status: 200, description: 'Desktop command completion accepted' })
  async completeCommand(
    @Request() req,
    @Param('commandId') commandId: string,
    @Body() dto: CompleteDesktopCommandDto,
  ): Promise<any> {
    return this.desktopSyncService.completeCommand(req.user.id, commandId, dto);
  }

  @Post('approvals/:approvalId/respond')
  @ApiOperation({ summary: 'Approve or reject a remote desktop approval request' })
  @ApiResponse({ status: 200, description: 'Approval response accepted' })
  async respondToApproval(
    @Request() req,
    @Param('approvalId') approvalId: string,
    @Body() dto: RespondDesktopApprovalDto,
  ): Promise<any> {
    return this.desktopSyncService.respondToApproval(req.user.id, approvalId, dto);
  }

  @Get('approvals/pending')
  @ApiOperation({ summary: 'List pending remote approvals for the current user' })
  @ApiResponse({ status: 200, description: 'Pending approvals returned' })
  async getPendingApprovals(@Request() req, @Query('deviceId') deviceId?: string): Promise<any> {
    return {
      approvals: this.desktopSyncService.getPendingApprovals(req.user.id, deviceId),
    };
  }

  @Get('state')
  @ApiOperation({ summary: 'Get current desktop sync snapshot for devices, tasks, and approvals' })
  @ApiResponse({ status: 200, description: 'Desktop sync snapshot returned' })
  async getState(@Request() req): Promise<any> {
    return this.desktopSyncService.getState(req.user.id);
  }
}