/**
 * Knowledge Document Entity
 * 
 * 知识库文档实体
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DocumentCategory {
  PRD = 'prd',                    // 产品需求文档
  TECH_DESIGN = 'tech_design',    // 技术设计
  ARCHITECTURE = 'architecture',   // 架构设计
  API = 'api',                    // API 文档
  GUIDE = 'guide',                // 使用指南
  PAYMENT = 'payment',            // 支付系统
  AI_ECOSYSTEM = 'ai_ecosystem',  // AI 生态
  INTEGRATION = 'integration',    // 集成文档
  DEPLOYMENT = 'deployment',      // 部署文档
  TESTING = 'testing',            // 测试文档
  OTHER = 'other',                // 其他
}

export enum DocumentStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

@Entity('hq_knowledge_documents')
@Index(['category'])
@Index(['status'])
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ length: 500 })
  filePath: string;

  @Column({
    type: 'enum',
    enum: DocumentCategory,
    default: DocumentCategory.OTHER,
  })
  category: DocumentCategory;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.ACTIVE,
  })
  status: DocumentStatus;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  wordCount: number;

  @Column({ type: 'jsonb', nullable: true })
  embedding: number[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
