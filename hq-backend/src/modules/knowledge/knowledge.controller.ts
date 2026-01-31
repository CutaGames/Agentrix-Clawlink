/**
 * Knowledge Controller
 * 
 * 知识库 API 控制器
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { KnowledgeService, ImportDocumentDto, SearchDocumentsDto } from './knowledge.service';
import { DocumentCategory } from './entities/knowledge-document.entity';

@ApiTags('Knowledge Base')
@Controller('hq/knowledge')
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name);

  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  @ApiOperation({ summary: '获取所有文档' })
  @ApiQuery({ name: 'category', required: false, enum: DocumentCategory })
  async findAll(@Query('category') category?: DocumentCategory) {
    return this.knowledgeService.findAll(category);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取文档统计' })
  async getStats() {
    return this.knowledgeService.getStats();
  }

  @Get('important-list')
  @ApiOperation({ summary: '获取重要文档列表' })
  async getImportantList() {
    return this.knowledgeService.getImportantDocumentsList();
  }

  @Post('import')
  @ApiOperation({ summary: '导入单个文档' })
  async importDocument(@Body() dto: ImportDocumentDto) {
    return this.knowledgeService.importDocument(dto);
  }

  @Post('import-important')
  @ApiOperation({ summary: '批量导入重要文档' })
  async importImportant(@Body() body: { projectRoot: string }) {
    this.logger.log(`Importing important documents from: ${body.projectRoot}`);
    return this.knowledgeService.importImportantDocuments(body.projectRoot);
  }

  @Post('search')
  @ApiOperation({ summary: '搜索文档' })
  async search(@Body() dto: SearchDocumentsDto) {
    return this.knowledgeService.search(dto);
  }

  @Get('context/:agentCode')
  @ApiOperation({ summary: '获取 Agent 相关上下文' })
  async getContextForAgent(
    @Param('agentCode') agentCode: string,
    @Query('query') query: string,
  ) {
    return this.knowledgeService.getContextForAgent(agentCode, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个文档' })
  async findOne(@Param('id') id: string) {
    return this.knowledgeService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文档' })
  async remove(@Param('id') id: string) {
    await this.knowledgeService.remove(id);
    return { success: true };
  }
}
