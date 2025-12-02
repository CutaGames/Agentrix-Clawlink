# PayMind 商品数据标准迁移指南

## 概述

为了确保所有上架到 marketplace 的商品都符合统一数据标准，我们需要：

1. **下架不符合统一数据标准的商品**（假数据/旧数据）
2. **迁移符合标准的商品**到统一格式
3. **确保新创建的商品**都使用统一格式

## 统一数据标准要求

符合统一数据标准的商品必须包含：

### 必需字段

1. **`metadata.core`** - 核心元数据结构
2. **`metadata.core.media.images`** - 图片数组（至少一个）
3. **统一格式的价格信息**：
   - `metadata.core.price` 或 `metadata.price` 对象，包含 `amount` 和 `currency`
4. **统一格式的库存信息**（可选）：
   - `metadata.core.inventory` 或 `metadata.inventory` 对象，包含 `type` 和 `quantity`

### 示例

```typescript
{
  name: "商品名称",
  description: "商品描述",
  price: 99.99,  // 数据库字段（向后兼容）
  stock: 100,    // 数据库字段（向后兼容）
  metadata: {
    core: {
      media: {
        images: [
          {
            url: "https://example.com/image.jpg",
            type: "thumbnail"
          }
        ]
      },
      price: {
        amount: 99.99,
        currency: "CNY"
      },
      inventory: {
        type: "finite",
        quantity: 100
      }
    },
    typeSpecific: {
      // 类型特定字段
    },
    extensions: {
      // 扩展字段
    }
  }
}
```

## 迁移步骤

### 步骤 1: 下架不符合标准的商品

运行下架脚本，将所有不符合统一数据标准的商品状态设置为 `INACTIVE`：

```bash
cd backend
npm run ts-node src/scripts/deactivate-non-unified-products.ts
```

**脚本功能：**
- 检查所有上架商品（`status = 'active'`）
- 判断是否符合统一数据标准
- 不符合标准的商品自动下架（`status = 'inactive'`）
- 输出统计信息和下架商品列表

### 步骤 2: 迁移符合标准的商品（可选）

如果需要将符合标准的商品迁移到统一格式，运行迁移脚本：

```bash
cd backend
npm run ts-node src/scripts/migrate-products-to-unified-standard.ts
```

**脚本功能：**
- 检查所有商品
- 将旧格式转换为统一格式
- 更新商品 metadata
- 保持上架状态

### 步骤 3: 验证结果

检查当前上架商品数量：

```sql
SELECT COUNT(*) FROM products WHERE status = 'active';
```

## 脚本说明

### 1. `deactivate-non-unified-products.ts`

**功能：** 下架不符合统一数据标准的商品

**检查标准：**
- ✅ 必须有 `metadata.core` 结构
- ✅ 必须有 `metadata.core.media.images` 数组
- ✅ 必须有统一格式的价格或库存信息

**输出：**
- 符合标准的商品数量
- 已下架的商品列表
- 当前上架商品总数

### 2. `migrate-products-to-unified-standard.ts`

**功能：** 将旧格式商品迁移到统一格式

**迁移逻辑：**
- 将 `metadata.image` 转换为 `metadata.core.media.images`
- 将 `metadata.currency` 转换为 `metadata.core.price.currency`
- 根据 `productType` 确定库存类型
- 保留原有 `typeSpecific` 数据

## 种子数据更新

### 更新种子数据脚本

所有创建商品的脚本都应该使用统一数据标准格式：

1. **`seed-test-data.ts`** - 已更新，使用 `ProductService.createProduct`（自动转换）
2. **`seed-products.ts`** - 需要更新，直接使用 `Repository.save`（需要手动转换）
3. **`create-test-products-for-chatgpt.ts`** - 已更新，通过 API 创建（自动转换）

### 新商品创建规范

使用 `ProductService.createProduct` 方法创建商品时，会自动转换为统一格式：

```typescript
await productService.createProduct(merchantId, {
  name: "商品名称",
  description: "商品描述",
  price: {
    amount: 99.99,
    currency: "CNY"
  },
  inventory: {
    type: "finite",
    quantity: 100
  },
  category: "分类",
  productType: "physical",
  metadata: {
    core: {
      media: {
        images: [{
          url: "https://example.com/image.jpg",
          type: "thumbnail"
        }]
      }
    }
  }
});
```

## 验证清单

迁移完成后，请验证：

- [ ] 所有上架商品都有 `metadata.core` 结构
- [ ] 所有上架商品都有 `metadata.core.media.images` 数组
- [ ] 所有上架商品都有统一格式的价格信息
- [ ] 新创建的商品自动符合统一标准
- [ ] AI 能力注册正常工作
- [ ] 商品搜索功能正常

## 注意事项

1. **数据备份**：运行脚本前建议备份数据库
2. **测试环境**：先在测试环境运行，确认无误后再在生产环境执行
3. **逐步迁移**：如果商品数量较多，可以分批迁移
4. **监控影响**：迁移后监控商品搜索、AI 能力等功能是否正常

## 后续维护

1. **新商品创建**：确保所有新商品都使用统一格式
2. **定期检查**：定期运行检查脚本，确保没有不符合标准的商品上架
3. **文档更新**：保持文档与代码同步

## 问题排查

### 问题 1: 商品下架后无法搜索

**原因：** 商品状态为 `inactive`，搜索接口只返回 `active` 状态的商品

**解决：** 这是预期行为，需要将商品迁移到统一格式后重新上架

### 问题 2: 迁移后商品图片丢失

**原因：** 旧格式的 `metadata.image` 没有正确转换

**解决：** 检查迁移脚本的图片转换逻辑，手动修复数据

### 问题 3: AI 能力注册失败

**原因：** 商品 metadata 格式不正确

**解决：** 确保商品符合统一数据标准，重新注册 AI 能力

## 相关文档

- `PayMind-产品数据标准-01-核心规范.md` - 统一数据标准详细规范
- `PayMind-产品数据标准-04-商户上传接口.md` - 商户上传接口规范
- `PayMind-AI能力接口Phase1实施完成报告.md` - AI 能力接口说明

