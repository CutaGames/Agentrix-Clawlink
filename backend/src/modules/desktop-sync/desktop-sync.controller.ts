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
  CreateDesktopApprovalDto,
  DesktopHeartbeatDto,
  RespondDesktopApprovalDto,
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

  @Post('approvals')
  @ApiOperation({ summary: 'Create a remote approval request for a desktop action' })
  @ApiResponse({ status: 201, description: 'Approval request created' })
  async createApproval(@Request() req, @Body() dto: CreateDesktopApprovalDto): Promise<any> {
    return this.desktopSyncService.createApproval(req.user.id, dto);
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