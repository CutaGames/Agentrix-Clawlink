/**
 * KnowledgeController — Layer 1: User Knowledge Base Management
 * Provides CRUD for knowledge files backing the ai-rag AiRagService.
 * Files are stored at: {cwd}/knowledge/{userId}/
 *
 * POST   /api/ai-rag/knowledge        — upload/create a knowledge file
 * GET    /api/ai-rag/knowledge        — list files
 * DELETE /api/ai-rag/knowledge/:id   — delete a file
 */
import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, Request, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

interface KnowledgeFileMeta {
  id: string;       // base64 of relative path
  fileName: string;
  sizeBytes: number;
  chunks: number;   // approximate: ⌈sizeBytes / 800⌉
  createdAt: string;
}

@ApiTags('Knowledge (RAG)')
@Controller('ai-rag/knowledge')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name);
  private readonly baseDir = path.join(process.cwd(), 'knowledge');

  private userDir(userId: string): string {
    const dir = path.join(this.baseDir, userId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private encodeId(userId: string, fileName: string): string {
    return Buffer.from(`${userId}/${fileName}`).toString('base64url');
  }

  private decodeId(id: string): { userId: string; fileName: string } {
    const decoded = Buffer.from(id, 'base64url').toString('utf-8');
    const idx = decoded.indexOf('/');
    return {
      userId: decoded.slice(0, idx),
      fileName: decoded.slice(idx + 1),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List knowledge files for the current user' })
  list(@Request() req: any): KnowledgeFileMeta[] {
    const dir = this.userDir(req.user.id);
    let files: string[];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') || f.endsWith('.txt'));
    } catch {
      return [];
    }

    return files.map((f) => {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      return {
        id: this.encodeId(req.user.id, f),
        fileName: f,
        sizeBytes: stat.size,
        chunks: Math.ceil(stat.size / 800),
        createdAt: stat.birthtime.toISOString(),
      };
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create / upload a knowledge file' })
  create(
    @Request() req: any,
    @Body() body: { fileName: string; content: string },
  ): KnowledgeFileMeta {
    const { fileName, content } = body;
    if (!fileName || !content) {
      throw new Error('fileName and content are required');
    }
    // Sanitise filename — allow only alphanumeric, dash, underscore, dot
    const safe = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
    const dir = this.userDir(req.user.id);
    const fp = path.join(dir, safe);
    fs.writeFileSync(fp, content, 'utf-8');
    const stat = fs.statSync(fp);
    this.logger.log(`Knowledge file created: ${fp} (${stat.size} bytes)`);

    return {
      id: this.encodeId(req.user.id, safe),
      fileName: safe,
      sizeBytes: stat.size,
      chunks: Math.ceil(stat.size / 800),
      createdAt: stat.birthtime.toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a knowledge file' })
  remove(@Param('id') id: string, @Request() req: any): void {
    const { userId, fileName } = this.decodeId(id);
    if (userId !== req.user.id) {
      throw new Error('Forbidden');
    }
    const fp = path.join(this.userDir(req.user.id), fileName);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
      this.logger.log(`Knowledge file deleted: ${fp}`);
    }
  }
}
