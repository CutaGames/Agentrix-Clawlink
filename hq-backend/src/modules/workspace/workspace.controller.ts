/**
 * Workspace Controller
 * 
 * IDE 工作区 API 控制器
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  WorkspaceService,
  CreateWorkspaceDto,
  AgentChatDto,
} from './workspace.service';

@ApiTags('Workspace IDE')
@Controller('hq/workspace')
export class WorkspaceController {
  private readonly logger = new Logger(WorkspaceController.name);

  constructor(private readonly workspaceService: WorkspaceService) {}

  // ========== Legacy API (兼容现有前端) ==========

  @Get('tree')
  @ApiOperation({ summary: '获取文件树 (简化版)' })
  async getTree(@Query('depth') depth?: string) {
    const tree = await this.workspaceService.getWorkspaceTree(
      depth ? parseInt(depth) : 3,
    );
    return { tree };
  }

  @Get('info')
  @ApiOperation({ summary: '获取工作区信息' })
  async getInfo() {
    return this.workspaceService.getWorkspaceInfo();
  }

  @Post('read')
  @ApiOperation({ summary: '读取文件 (简化版)' })
  async readFileLegacy(@Body() body: { path: string }) {
    return this.workspaceService.readFileByPath(body.path);
  }

  @Post('write')
  @ApiOperation({ summary: '写入文件 (简化版)' })
  async writeFileLegacy(@Body() body: { path: string; content: string }) {
    return this.workspaceService.writeFileByPath(body.path, body.content);
  }

  @Post('execute')
  @ApiOperation({ summary: '执行终端命令' })
  async executeCommand(@Body() body: { command: string }) {
    return this.workspaceService.executeCommand(body.command);
  }

  @Post('search')
  @ApiOperation({ summary: '搜索文件内容' })
  async searchFiles(@Body() body: { query: string; caseSensitive?: boolean }) {
    return this.workspaceService.searchInFiles(body.query, body.caseSensitive);
  }

  // ========== Standard API ==========

  @Get()
  @ApiOperation({ summary: '获取所有工作区' })
  async findAll() {
    return this.workspaceService.findAllWorkspaces();
  }

  @Post()
  @ApiOperation({ summary: '创建工作区' })
  async create(@Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.createWorkspace(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个工作区' })
  async findOne(@Param('id') id: string) {
    return this.workspaceService.findWorkspace(id);
  }

  @Get(':id/files')
  @ApiOperation({ summary: '获取文件树' })
  async getFileTree(
    @Param('id') id: string,
    @Query('path') subPath?: string,
  ) {
    return this.workspaceService.getFileTree(id, subPath);
  }

  @Get(':id/file')
  @ApiOperation({ summary: '读取文件内容' })
  async readFile(
    @Param('id') id: string,
    @Query('path') filePath: string,
  ) {
    return this.workspaceService.readFile(id, filePath);
  }

  @Put(':id/file')
  @ApiOperation({ summary: '保存文件' })
  async saveFile(
    @Param('id') id: string,
    @Body() body: { filePath: string; content: string },
  ) {
    return this.workspaceService.saveFile(id, body.filePath, body.content);
  }

  @Get(':id/open-files')
  @ApiOperation({ summary: '获取打开的文件列表' })
  async getOpenFiles(@Param('id') id: string) {
    return this.workspaceService.getOpenFiles(id);
  }

  @Delete(':id/file')
  @ApiOperation({ summary: '关闭文件' })
  async closeFile(
    @Param('id') id: string,
    @Query('path') filePath: string,
  ) {
    await this.workspaceService.closeFile(id, filePath);
    return { success: true };
  }

  @Post(':id/chat')
  @ApiOperation({ summary: '与 Agent 聊天' })
  async chatWithAgent(
    @Param('id') id: string,
    @Body() body: Omit<AgentChatDto, 'workspaceId'>,
  ) {
    return this.workspaceService.chatWithAgent({
      ...body,
      workspaceId: id,
    });
  }

  @Post('switch/:id')
  @ApiOperation({ summary: '切换工作区' })
  async switchWorkspace(@Param('id') id: string) {
    return this.workspaceService.switchWorkspace(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除工作区' })
  async remove(@Param('id') id: string) {
    await this.workspaceService.removeWorkspace(id);
    return { success: true };
  }
}
