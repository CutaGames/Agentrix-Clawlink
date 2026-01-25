import { Controller, Post, Get, Body, UseGuards, Request, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HqService } from './hq.service';
import { DeveloperService } from './developer.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // 暂时注释掉方便测试，后期开启

@ApiTags('CEO HQ Console')
@Controller('hq')
export class HqController {
  private readonly logger = new Logger(HqController.name);

  constructor(
    private readonly hqService: HqService,
    private readonly developerService: DeveloperService
  ) {}

  @Post('chat')
  @ApiOperation({ summary: '与总部 Agent 对话' })
  async chat(
    @Request() req,
    @Body() body: {
      agentId: string;
      messages: any[];
      workspaceId?: string;
    },
  ) {
    this.logger.log(`收到总部聊天请求: ${body.agentId}`);
    
    // 如果有认证，从 req.user 获取
    const userId = req.user?.id;
    
    return this.hqService.processHqChat(
      body.agentId, 
      body.messages,
      userId
    );
  }

  @Get('knowledge-base')
  @ApiOperation({ summary: '获取总部知识库内容' })
  async getKnowledgeBase() {
    return { content: this.hqService.getKnowledgeBaseContent() };
  }

  @Post('knowledge-base')
  @ApiOperation({ summary: '更新总部知识库内容' })
  async updateKnowledgeBase(@Body() body: { content: string }) {
    this.hqService.updateKnowledgeBaseContent(body.content);
    return { success: true };
  }

  @Get('rag-files')
  @ApiOperation({ summary: '获取本地 RAG 知识库文件列表' })
  async getRagFiles() {
    return this.hqService.getRagFiles();
  }
  // === Workspace IDE APIs ===

  @Get('workspace/tree')
  @ApiOperation({ summary: '获取项目文件树结构' })
  async getWorkspaceTree(@Query('path') path?: string, @Query('depth') depth?: string) {
    const maxDepth = depth ? parseInt(depth) : 3;
    return this.developerService.getProjectTree(path || '.', maxDepth);
  }

  @Get('workspace/info')
  @ApiOperation({ summary: '获取项目概览信息' })
  async getWorkspaceInfo() {
    return this.developerService.getProjectInfo();
  }

  @Get('workspace/search')
  @ApiOperation({ summary: '搜索代码' })
  async searchCode(@Query('query') query: string, @Query('pattern') pattern?: string) {
    return this.developerService.searchCode(query, pattern || '*.ts');
  }

  @Post('workspace/read')
  @ApiOperation({ summary: '读取文件内容' })
  async readFile(@Body() body: { path: string }) {
    const content = await this.developerService.readFile(body.path);
    return { path: body.path, content };
  }

  @Post('workspace/write')
  @ApiOperation({ summary: '写入文件内容' })
  async writeFile(@Body() body: { path: string; content: string }) {
    return this.developerService.writeFile(body.path, body.content);
  }

  @Post('workspace/execute')
  @ApiOperation({ summary: '执行终端命令' })
  async executeCommand(@Body() body: { command: string }) {
    return this.developerService.executeCommand(body.command);
  }}
