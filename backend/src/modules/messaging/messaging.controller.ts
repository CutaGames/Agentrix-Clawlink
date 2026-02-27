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
}
