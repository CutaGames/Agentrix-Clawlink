/**
 * Vector Search Service
 * 
 * 使用 pgvector 实现语义搜索
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AgentMemory } from '../../entities/agent-memory.entity';
import { HqAIService } from '../ai/hq-ai.service';

export interface VectorSearchOptions {
  agentId?: string;
  projectId?: string;
  types?: string[];
  limit?: number;
  threshold?: number; // 相似度阈值 (0-1)
}

export interface VectorSearchResult {
  memory: AgentMemory;
  similarity: number;
}

@Injectable()
export class VectorSearchService implements OnModuleInit {
  private readonly logger = new Logger(VectorSearchService.name);
  private pgvectorEnabled = false;
  private embeddingDimension = 1536; // text-embedding-3-small

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(AgentMemory)
    private memoryRepo: Repository<AgentMemory>,
    private configService: ConfigService,
    private aiService: HqAIService,
  ) {}

  async onModuleInit() {
    await this.initializePgVector();
  }

  /**
   * 初始化 pgvector 扩展
   */
  private async initializePgVector(): Promise<void> {
    try {
      // 检查是否已安装 pgvector
      const result = await this.dataSource.query(
        `SELECT * FROM pg_extension WHERE extname = 'vector'`
      );

      if (result.length === 0) {
        // 尝试安装 pgvector
        try {
          await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
          this.logger.log('pgvector extension installed successfully');
        } catch (e) {
          this.logger.warn(`Cannot install pgvector: ${e.message}. Semantic search will use text matching.`);
          return;
        }
      }

      // 检查是否需要添加向量列
      const tableExists = await this.dataSource.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'hq_agent_memory' AND column_name = 'embedding_vector'
      `);

      if (tableExists.length === 0) {
        // 添加向量列
        try {
          await this.dataSource.query(`
            ALTER TABLE hq_agent_memory 
            ADD COLUMN IF NOT EXISTS embedding_vector vector(${this.embeddingDimension})
          `);
          
          // 创建 HNSW 索引
          await this.dataSource.query(`
            CREATE INDEX IF NOT EXISTS hq_memory_embedding_idx 
            ON hq_agent_memory 
            USING hnsw (embedding_vector vector_cosine_ops)
          `);
          
          this.logger.log('Vector column and index created');
        } catch (e) {
          this.logger.warn(`Cannot create vector column: ${e.message}`);
          return;
        }
      }

      this.pgvectorEnabled = true;
      this.logger.log('pgvector semantic search enabled');
    } catch (error) {
      this.logger.warn(`pgvector initialization failed: ${error.message}`);
    }
  }

  /**
   * 检查 pgvector 是否可用
   */
  isEnabled(): boolean {
    return this.pgvectorEnabled;
  }

  /**
   * 为记忆生成并存储嵌入向量
   */
  async generateAndStoreEmbedding(memoryId: string): Promise<boolean> {
    if (!this.pgvectorEnabled) {
      return false;
    }

    try {
      const memory = await this.memoryRepo.findOne({ where: { id: memoryId } });
      if (!memory) {
        return false;
      }

      // 生成嵌入
      const result = await this.aiService.generateEmbedding(memory.content);
      
      // 存储向量
      await this.dataSource.query(
        `UPDATE hq_agent_memory SET embedding_vector = $1 WHERE id = $2`,
        [`[${result.embedding.join(',')}]`, memoryId]
      );

      this.logger.debug(`Generated embedding for memory ${memoryId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      return false;
    }
  }

  /**
   * 批量生成嵌入
   */
  async generateEmbeddingsForAgent(agentId: string, limit = 100): Promise<number> {
    if (!this.pgvectorEnabled) {
      return 0;
    }

    // 获取没有嵌入的记忆
    const memories = await this.dataSource.query(`
      SELECT id, content FROM hq_agent_memory 
      WHERE agent_id = $1 AND embedding_vector IS NULL AND is_active = true
      ORDER BY created_at DESC
      LIMIT $2
    `, [agentId, limit]);

    if (memories.length === 0) {
      return 0;
    }

    let count = 0;
    for (const memory of memories) {
      try {
        const result = await this.aiService.generateEmbedding(memory.content);
        await this.dataSource.query(
          `UPDATE hq_agent_memory SET embedding_vector = $1 WHERE id = $2`,
          [`[${result.embedding.join(',')}]`, memory.id]
        );
        count++;
      } catch (e) {
        this.logger.warn(`Failed to embed memory ${memory.id}: ${e.message}`);
      }
    }

    this.logger.log(`Generated ${count} embeddings for agent ${agentId}`);
    return count;
  }

  /**
   * 语义搜索
   */
  async semanticSearch(
    query: string,
    options: VectorSearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    const { agentId, projectId, types, limit = 10, threshold = 0.7 } = options;

    // 如果 pgvector 不可用，回退到文本搜索
    if (!this.pgvectorEnabled) {
      return this.textFallbackSearch(query, options);
    }

    try {
      // 生成查询嵌入
      const queryResult = await this.aiService.generateEmbedding(query);
      const queryVector = `[${queryResult.embedding.join(',')}]`;

      // 构建查询
      let sql = `
        SELECT 
          m.*,
          1 - (m.embedding_vector <=> $1::vector) as similarity
        FROM hq_agent_memory m
        WHERE m.is_active = true
          AND m.embedding_vector IS NOT NULL
      `;
      const params: any[] = [queryVector];
      let paramIndex = 2;

      if (agentId) {
        sql += ` AND m.agent_id = $${paramIndex}`;
        params.push(agentId);
        paramIndex++;
      }

      if (projectId) {
        sql += ` AND (m.project_id = $${paramIndex} OR m.project_id IS NULL)`;
        params.push(projectId);
        paramIndex++;
      }

      if (types && types.length > 0) {
        sql += ` AND m.type = ANY($${paramIndex})`;
        params.push(types);
        paramIndex++;
      }

      sql += `
        ORDER BY similarity DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const results = await this.dataSource.query(sql, params);

      // 过滤低于阈值的结果
      return results
        .filter((r: any) => r.similarity >= threshold)
        .map((r: any) => ({
          memory: this.mapToMemory(r),
          similarity: r.similarity,
        }));
    } catch (error) {
      this.logger.error(`Semantic search failed: ${error.message}`);
      return this.textFallbackSearch(query, options);
    }
  }

  /**
   * 文本回退搜索
   */
  private async textFallbackSearch(
    query: string,
    options: VectorSearchOptions,
  ): Promise<VectorSearchResult[]> {
    const { agentId, projectId, types, limit = 10 } = options;

    const qb = this.memoryRepo.createQueryBuilder('m')
      .where('m.isActive = :active', { active: true })
      .andWhere('m.content ILIKE :query', { query: `%${query}%` });

    if (agentId) {
      qb.andWhere('m.agentId = :agentId', { agentId });
    }

    if (projectId) {
      qb.andWhere('(m.projectId = :projectId OR m.projectId IS NULL)', { projectId });
    }

    if (types && types.length > 0) {
      qb.andWhere('m.type IN (:...types)', { types });
    }

    qb.orderBy('m.importance', 'DESC')
      .addOrderBy('m.createdAt', 'DESC')
      .take(limit);

    const results = await qb.getMany();

    return results.map(memory => ({
      memory,
      similarity: 0.5, // 文本匹配的固定相似度
    }));
  }

  /**
   * 找到相似记忆
   */
  async findSimilar(memoryId: string, limit = 5): Promise<VectorSearchResult[]> {
    if (!this.pgvectorEnabled) {
      return [];
    }

    try {
      const memory = await this.dataSource.query(`
        SELECT embedding_vector FROM hq_agent_memory WHERE id = $1
      `, [memoryId]);

      if (!memory[0]?.embedding_vector) {
        return [];
      }

      const results = await this.dataSource.query(`
        SELECT 
          m.*,
          1 - (m.embedding_vector <=> $1::vector) as similarity
        FROM hq_agent_memory m
        WHERE m.id != $2
          AND m.is_active = true
          AND m.embedding_vector IS NOT NULL
        ORDER BY similarity DESC
        LIMIT $3
      `, [memory[0].embedding_vector, memoryId, limit]);

      return results.map((r: any) => ({
        memory: this.mapToMemory(r),
        similarity: r.similarity,
      }));
    } catch (error) {
      this.logger.error(`Find similar failed: ${error.message}`);
      return [];
    }
  }

  /**
   * 映射数据库结果到实体
   */
  private mapToMemory(row: any): AgentMemory {
    const memory = new AgentMemory();
    memory.id = row.id;
    memory.agentId = row.agent_id;
    memory.projectId = row.project_id;
    memory.sessionId = row.session_id;
    memory.type = row.type;
    memory.importance = row.importance;
    memory.content = row.content;
    memory.summary = row.summary;
    memory.metadata = row.metadata;
    memory.accessCount = row.access_count;
    memory.lastAccessedAt = row.last_accessed_at;
    memory.expiresAt = row.expires_at;
    memory.isActive = row.is_active;
    memory.createdAt = row.created_at;
    memory.updatedAt = row.updated_at;
    return memory;
  }
}
