# PayMind 统一产品数据标准 - 实施路线图

## 1. 实施阶段

### 阶段1：核心标准定义（1-2周）
- ✅ 完成核心数据结构设计
- ✅ 定义统一元数据格式
- ✅ 建立类型扩展机制
- ✅ 编写标准文档

### 阶段2：数据库迁移（1周）
- 扩展 Product 实体
- 迁移现有数据到新格式
- 建立数据验证规则
- 创建索引和约束

### 阶段3：API实现（2周）
- 实现统一上传接口
- 实现简化上传接口
- 实现批量上传
- 实现数据验证服务

### 阶段4：AI生态对接（2-3周）
- 实现 OpenAI 适配器
- 实现 Claude 适配器
- 实现 Gemini 适配器
- 实现自动格式生成

### 阶段5：前端集成（1-2周）
- 更新商户上传界面
- 支持新数据格式
- 实现类型特定表单
- 优化用户体验

### 阶段6：测试与优化（1-2周）
- 单元测试
- 集成测试
- 性能测试
- 文档完善

## 2. 技术实现

### 2.1 数据库变更

```sql
-- 扩展 products 表
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS unified_metadata JSONB,
ADD COLUMN IF NOT EXISTS standard_version VARCHAR(10) DEFAULT 'v1.0';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_metadata ON products USING GIN(unified_metadata);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
```

### 2.2 服务层实现

```typescript
// backend/src/modules/product/unified-product.service.ts
@Injectable()
export class UnifiedProductService {
  async create(data: CreateProductRequest): Promise<UnifiedProduct> {
    // 1. 验证数据
    const validation = await this.validator.validate(data);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }
    
    // 2. 转换为统一格式
    const product = this.converter.toUnified(data);
    
    // 3. 生成AI兼容字段
    product.metadata.aiCompatible = await this.aiGenerator.generate(product);
    
    // 4. 保存到数据库
    return await this.repository.save(product);
  }
}
```

### 2.3 数据迁移脚本

```typescript
// backend/src/migrations/xxx-migrate-to-unified-format.ts
export class MigrateToUnifiedFormat implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // 迁移现有产品数据
    const products = await queryRunner.query('SELECT * FROM products');
    
    for (const product of products) {
      const unified = this.convertToUnified(product);
      await queryRunner.query(
        'UPDATE products SET unified_metadata = $1 WHERE id = $2',
        [JSON.stringify(unified.metadata), product.id]
      );
    }
  }
}
```

## 3. 优先级

### P0（必须）
- ✅ 核心数据结构
- ✅ 基础验证规则
- ✅ 统一上传接口
- ✅ 数据迁移

### P1（重要）
- ✅ AI生态对接（OpenAI、Claude）
- ✅ 简化上传接口
- ✅ 批量上传
- ✅ 前端集成

### P2（优化）
- ✅ Gemini对接
- ✅ 高级验证规则
- ✅ 性能优化
- ✅ 文档完善

## 4. 风险与应对

### 4.1 数据迁移风险
- **风险**：现有数据格式不一致
- **应对**：编写详细迁移脚本，分批次迁移，保留备份

### 4.2 兼容性风险
- **风险**：新格式与现有系统不兼容
- **应对**：保持向后兼容，逐步迁移，提供适配层

### 4.3 性能风险
- **风险**：JSONB查询性能问题
- **应对**：创建合适的索引，优化查询，使用缓存

## 5. 成功指标

### 5.1 功能指标
- ✅ 所有商品类型支持统一格式
- ✅ AI生态对接成功率 > 95%
- ✅ 数据验证通过率 > 99%

### 5.2 性能指标
- ✅ 产品创建响应时间 < 500ms
- ✅ 批量上传（100条）< 10s
- ✅ AI格式生成 < 100ms

### 5.3 用户体验
- ✅ 商户上传成功率 > 98%
- ✅ 上传界面易用性评分 > 4.5/5
- ✅ 文档完整性 > 90%

## 6. 后续优化

### 6.1 短期（1-3个月）
- 支持更多AI平台
- 优化上传流程
- 增强数据验证
- 完善文档

### 6.2 中期（3-6个月）
- 支持更多商品类型
- 实现智能推荐
- 优化搜索性能
- 增强分析功能

### 6.3 长期（6-12个月）
- 支持自定义商品类型
- 实现商品模板系统
- 支持多语言扩展
- 建立商品生态

## 7. 相关文档

- `PayMind-产品数据标准-01-核心规范.md` - 核心数据结构
- `PayMind-产品数据标准-02-类型扩展规范.md` - 各类型字段定义
- `PayMind-产品数据标准-03-AI生态对接.md` - AI平台对接
- `PayMind-产品数据标准-04-商户上传接口.md` - 上传API文档

