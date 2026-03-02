import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingService, SendDMDto } from './messaging.service';

// ── In-memory group message store (Phase 1 — replace with DB entity later) ──
interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'system';
  createdAt: string;
}
const groupMessages = new Map<string, GroupMessage[]>();

@ApiTags('Messaging')
@Controller('messaging')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all DM conversations for current user' })
  @ApiResponse({ status: 200, description: 'Returns list of conversation summaries' })
  async getConversations(@Request() req) {
    const conversations = await this.messagingService.getConversations(req.user.id);
    return { success: true, data: conversations };
  }

  @Get('dm/:partnerId')
  @ApiOperation({ summary: 'Get messages in a DM conversation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getConversation(
    @Request() req,
    @Param('partnerId') partnerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const result = await this.messagingService.getConversation(
      req.user.id,
      partnerId,
      Number(page),
      Number(limit),
    );
    return { success: true, ...result };
  }

  @Post('dm/:receiverId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a direct message' })
  async sendDM(
    @Request() req,
    @Param('receiverId') receiverId: string,
    @Body() body: { content: string },
  ) {
    const dto: SendDMDto = {
      receiverId,
      content: body.content,
    };
    const message = await this.messagingService.sendDM(req.user.id, dto);
    return { success: true, data: message };
  }

  @Patch('dm/:partnerId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  async markAsRead(@Request() req, @Param('partnerId') partnerId: string) {
    await this.messagingService.markAsRead(req.user.id, partnerId);
    return { success: true };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread DM count' })
  async getUnreadCount(@Request() req) {
    const count = await this.messagingService.getUnreadCount(req.user.id);
    return { success: true, data: { count } };
  }

  // ── Group Messaging (in-memory Phase 1) ──────────────────────────────

  @Get('groups/:groupId/messages')
  @ApiOperation({ summary: 'Get messages in a group chat' })
  async getGroupMessages(
    @Param('groupId') groupId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const all = groupMessages.get(groupId) ?? [];
    const start = (Number(page) - 1) * Number(limit);
    const messages = all.slice(start, start + Number(limit));
    return { success: true, data: messages, total: all.length };
  }

  @Post('groups/:groupId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message to a group chat' })
  async sendGroupMessage(
    @Request() req,
    @Param('groupId') groupId: string,
    @Body() body: { content: string; type?: string },
  ) {
    const msg: GroupMessage = {
      id: `gm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      groupId,
      senderId: req.user.id,
      senderName: req.user.nickname || req.user.email || req.user.id.substring(0, 8),
      content: body.content,
      type: (body.type as any) || 'text',
      createdAt: new Date().toISOString(),
    };
    if (!groupMessages.has(groupId)) {
      groupMessages.set(groupId, []);
    }
    groupMessages.get(groupId)!.push(msg);
    // Keep max 500 messages per group in memory
    const arr = groupMessages.get(groupId)!;
    if (arr.length > 500) arr.splice(0, arr.length - 500);
    return { success: true, data: msg };
  }
}
