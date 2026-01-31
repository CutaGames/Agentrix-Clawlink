/**
 * Knowledge Service
 * 
 * 知识库服务 - 管理项目文档
 */

import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { KnowledgeDocument, DocumentCategory, DocumentStatus } from './entities/knowledge-document.entity';
import { HqAIService } from '../ai/hq-ai.service';
import * as fs from 'fs';
import * as path from 'path';

export interface ImportDocumentDto {
  filePath: string;
  title?: string;
  category?: DocumentCategory;
  tags?: string[];
}

export interface SearchDocumentsDto {
  query: string;
  category?: DocumentCategory;
  limit?: number;
}

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);

  // Agentrix 项目重要文档列表
  private readonly importantDocuments = [
    // PRD 文档
    { path: 'AGENTRIX_MCP_ECOSYSTEM_PRD.md', category: DocumentCategory.PRD, title: 'Agentrix MCP 生态 PRD' },
    { path: 'AGENTRIX_WORKBENCH_PRD_V3.md', category: DocumentCategory.PRD, title: 'Agentrix Workbench PRD V3' },
    { path: 'AGENTRIX_PAYMENT_V1_PRD.md', category: DocumentCategory.PRD, title: 'Agentrix 支付系统 PRD V1' },
    { path: 'Personal-Agent-PRD-V1.0.md', category: DocumentCategory.PRD, title: 'Personal Agent PRD V1.0' },
    { path: 'PayMind-Pentagonal-Architecture-PRD-V1.0.md', category: DocumentCategory.PRD, title: 'PayMind 五角架构 PRD' },
    
    // 技术设计
    { path: 'AGENTRIX_MCP_TECH_DESIGN.md', category: DocumentCategory.TECH_DESIGN, title: 'Agentrix MCP 技术设计' },
    { path: 'AGENTRIX_PAYMENT_V1_ARCH_DESIGN.md', category: DocumentCategory.TECH_DESIGN, title: '支付系统架构设计' },
    { path: 'AGENTRIX_SKILL_ECOSYSTEM_STRATEGIC_PLAN_V2.md', category: DocumentCategory.TECH_DESIGN, title: 'Skill 生态战略计划 V2' },
    
    // 架构设计
    { path: 'AGENTRIX_UI_INFORMATION_ARCHITECTURE_V3.md', category: DocumentCategory.ARCHITECTURE, title: 'UI 信息架构 V3' },
    { path: 'AGENTRIX_UI_SYSTEMATIC_OPTIMIZATION_PLAN_V4.md', category: DocumentCategory.ARCHITECTURE, title: 'UI 系统优化计划 V4' },
    { path: 'AGENTRIX_HQ_REFACTOR_V2.md', category: DocumentCategory.ARCHITECTURE, title: 'HQ 重构方案 V2' },
    
    // 支付系统
    { path: 'SmartCheckout支付系统文档-V8.0.md', category: DocumentCategory.PAYMENT, title: 'SmartCheckout 支付系统 V8' },
    { path: '统一支付引擎时序图-V3.0.md', category: DocumentCategory.PAYMENT, title: '统一支付引擎时序图' },
    { path: 'STRIPE_V5_SETTLEMENT_MODEL.md', category: DocumentCategory.PAYMENT, title: 'Stripe V5 结算模型' },
    { path: 'Agentrix生态分成机制详细设计-V4.0.md', category: DocumentCategory.PAYMENT, title: '生态分成机制设计 V4' },
    
    // AI 生态
    { path: 'Agent-SDK-AI-Ecosystem-Integration-Guide.md', category: DocumentCategory.AI_ECOSYSTEM, title: 'Agent SDK AI 生态集成指南' },
    { path: 'Agentrix-AI-Ecosystem-Analysis.md', category: DocumentCategory.AI_ECOSYSTEM, title: 'Agentrix AI 生态分析' },
    { path: 'AI-Platform-Integration-Guide.md', category: DocumentCategory.AI_ECOSYSTEM, title: 'AI 平台集成指南' },
    { path: 'AI生态快速集成指南.md', category: DocumentCategory.AI_ECOSYSTEM, title: 'AI 生态快速集成指南' },
    { path: 'AGENTRIX_MCP_DEVELOPMENT_PLAN.md', category: DocumentCategory.AI_ECOSYSTEM, title: 'MCP 开发计划' },
    
    // 集成文档
    { path: 'ChatGPT-GPTs配置指南.md', category: DocumentCategory.INTEGRATION, title: 'ChatGPT GPTs 配置指南' },
    { path: 'CLAUDE_DESKTOP_INTEGRATION_GUIDE.md', category: DocumentCategory.INTEGRATION, title: 'Claude Desktop 集成指南' },
    { path: 'Google-AI-Studio官方聊天框集成-剩余工作.md', category: DocumentCategory.INTEGRATION, title: 'Google AI Studio 集成' },
    { path: 'OAUTH_INTEGRATION_GUIDE.md', category: DocumentCategory.INTEGRATION, title: 'OAuth 集成指南' },
    
    // 用户指南
    { path: 'AGENTRIX_USER_PERSONAS_ONBOARDING.md', category: DocumentCategory.GUIDE, title: '用户画像与入驻流程' },
    { path: 'QUICK_START.md', category: DocumentCategory.GUIDE, title: '快速开始指南' },
    { path: 'README.md', category: DocumentCategory.GUIDE, title: '项目 README' },
    
    // 部署文档
    { path: 'DEPLOYMENT_GUIDE.md', category: DocumentCategory.DEPLOYMENT, title: '部署指南' },
    { path: 'PRODUCTION_READINESS.md', category: DocumentCategory.DEPLOYMENT, title: '生产就绪检查' },
    
    // 测试文档
    { path: 'TESTING_GUIDE.md', category: DocumentCategory.TESTING, title: '测试指南' },
    { path: 'TESTING_ARCHITECTURE.md', category: DocumentCategory.TESTING, title: '测试架构' },
    
    // 竞品分析
    { path: 'AGENTRIX_COMPETITIVE_ANALYSIS_2026.md', category: DocumentCategory.OTHER, title: '竞品分析 2026' },
    { path: 'COMPETITIVE_ANALYSIS_SKILL_STORE.md', category: DocumentCategory.OTHER, title: 'Skill Store 竞品分析' },
  ];

  constructor(
    @InjectRepository(KnowledgeDocument)
    private documentRepo: Repository<KnowledgeDocument>,
    private aiService: HqAIService,
  ) {}

  /**
   * 模块初始化时自动导入重要文档
   */
  async onModuleInit() {
    this.logger.log('📚 Knowledge Service initializing...');
    
    // 检查是否已有文档
    const existingCount = await this.documentRepo.count();
    if (existingCount > 0) {
      this.logger.log(`✅ Knowledge base already has ${existingCount} documents`);
      return;
    }

    // 自动导入重要文档
    const projectRoot = this.findProjectRoot();
    if (projectRoot) {
      this.logger.log(`📂 Auto-importing documents from: ${projectRoot}`);
      const result = await this.importImportantDocuments(projectRoot);
      this.logger.log(`📚 Knowledge base initialized: ${result.success} docs imported, ${result.failed.length} failed`);
    } else {
      this.logger.warn('⚠️ Could not find project root for auto-import');
    }
  }

  /**
   * 查找项目根目录
   */
  private findProjectRoot(): string | null {
    // 尝试从当前工作目录向上查找
    const candidates = [
      process.cwd(),
      path.resolve(process.cwd(), '..'),
      path.resolve(__dirname, '../../../../..'),
      '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website',
      'd:\\wsl\\Ubuntu-24.04\\Code\\Agentrix\\Agentrix-website',
    ];

    for (const dir of candidates) {
      const readmePath = path.join(dir, 'README.md');
      const agentrixPath = path.join(dir, 'AGENTRIX_HQ_REFACTOR_V2.md');
      if (fs.existsSync(readmePath) || fs.existsSync(agentrixPath)) {
        return dir;
      }
    }

    return null;
  }

  /**
   * 获取重要文档列表
   */
  getImportantDocumentsList(): typeof this.importantDocuments {
    return this.importantDocuments;
  }

  /**
   * 导入单个文档
   */
  async importDocument(dto: ImportDocumentDto): Promise<KnowledgeDocument> {
    const { filePath, title, category, tags } = dto;
    
    // 读取文件内容
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const wordCount = content.split(/\s+/).length;
    const fileName = path.basename(filePath);

    // 检查是否已存在
    const existing = await this.documentRepo.findOne({
      where: { filePath },
    });

    if (existing) {
      // 更新现有文档
      existing.content = content;
      existing.wordCount = wordCount;
      existing.updatedAt = new Date();
      if (title) existing.title = title;
      if (category) existing.category = category;
      if (tags) existing.tags = tags;
      
      return this.documentRepo.save(existing);
    }

    // 创建新文档
    const doc = this.documentRepo.create({
      title: title || fileName.replace('.md', ''),
      content,
      filePath,
      category: category || DocumentCategory.OTHER,
      tags: tags || [],
      wordCount,
      status: DocumentStatus.ACTIVE,
    });

    return this.documentRepo.save(doc);
  }

  /**
   * 批量导入重要文档
   */
  async importImportantDocuments(projectRoot: string): Promise<{ success: number; failed: string[] }> {
    const results = { success: 0, failed: [] as string[] };

    for (const doc of this.importantDocuments) {
      try {
        const fullPath = path.join(projectRoot, doc.path);
        await this.importDocument({
          filePath: fullPath,
          title: doc.title,
          category: doc.category,
        });
        results.success++;
        this.logger.log(`Imported: ${doc.title}`);
      } catch (error) {
        results.failed.push(doc.path);
        this.logger.warn(`Failed to import ${doc.path}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * 获取所有文档
   */
  async findAll(category?: DocumentCategory): Promise<KnowledgeDocument[]> {
    const where: any = { status: DocumentStatus.ACTIVE };
    if (category) {
      where.category = category;
    }
    return this.documentRepo.find({
      where,
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * 获取单个文档
   */
  async findOne(id: string): Promise<KnowledgeDocument> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Document not found: ${id}`);
    }
    return doc;
  }

  /**
   * 搜索文档
   */
  async search(dto: SearchDocumentsDto): Promise<KnowledgeDocument[]> {
    const { query, category, limit = 10 } = dto;
    
    const qb = this.documentRepo.createQueryBuilder('doc')
      .where('doc.status = :status', { status: DocumentStatus.ACTIVE });

    if (category) {
      qb.andWhere('doc.category = :category', { category });
    }

    // 简单文本搜索
    if (query) {
      qb.andWhere(
        '(doc.title ILIKE :query OR doc.content ILIKE :query OR doc.description ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    return qb.take(limit).getMany();
  }

  /**
   * 获取文档统计
   */
  async getStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    totalWords: number;
  }> {
    const docs = await this.documentRepo.find({
      where: { status: DocumentStatus.ACTIVE },
    });

    const byCategory: Record<string, number> = {};
    let totalWords = 0;

    for (const doc of docs) {
      byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
      totalWords += doc.wordCount || 0;
    }

    return {
      total: docs.length,
      byCategory,
      totalWords,
    };
  }

  /**
   * 删除文档
   */
  async remove(id: string): Promise<void> {
    const doc = await this.findOne(id);
    doc.status = DocumentStatus.ARCHIVED;
    await this.documentRepo.save(doc);
  }

  /**
   * 为 Agent 获取相关上下文
   */
  async getContextForAgent(agentCode: string, query: string): Promise<string> {
    // 根据 Agent 类型选择相关文档类别
    const categoryMap: Record<string, DocumentCategory[]> = {
      'ANALYST-01': [DocumentCategory.PRD, DocumentCategory.OTHER, DocumentCategory.GUIDE],
      'ARCHITECT-01': [DocumentCategory.ARCHITECTURE, DocumentCategory.TECH_DESIGN, DocumentCategory.PRD],
      'CODER-01': [DocumentCategory.TECH_DESIGN, DocumentCategory.API, DocumentCategory.INTEGRATION],
      'GROWTH-01': [DocumentCategory.PRD, DocumentCategory.GUIDE, DocumentCategory.OTHER],
      'BD-01': [DocumentCategory.AI_ECOSYSTEM, DocumentCategory.INTEGRATION, DocumentCategory.GUIDE],
    };

    const categories = categoryMap[agentCode] || [DocumentCategory.OTHER];
    
    // 搜索相关文档
    const docs = await this.documentRepo.find({
      where: {
        status: DocumentStatus.ACTIVE,
        category: In(categories),
      },
      take: 5,
    });

    if (docs.length === 0) {
      return '';
    }

    // 构建上下文
    let context = '## 相关项目文档\n\n';
    for (const doc of docs) {
      // 截取前 2000 字符
      const excerpt = doc.content.substring(0, 2000);
      context += `### ${doc.title}\n${excerpt}\n\n---\n\n`;
    }

    return context;
  }
}
