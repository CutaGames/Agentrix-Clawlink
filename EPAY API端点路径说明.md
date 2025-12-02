# EPAY API 端点路径说明

## 📋 测试环境配置

**测试环境Base URL**: `https://29597375fx.epaydev.xyz/epayweb`

**注意**: 
- Base URL已经包含 `/epayweb` 路径
- API端点路径需要根据EPAY官方文档确定
- 当前代码中的API路径可能需要根据实际文档调整

## 🔍 API端点路径（需要根据文档确认）

根据EPAY文档（https://opendocs.epay.com/gateway/cn/），API端点路径可能是：

### 可能的路径格式

1. **相对路径**（如果baseUrl已包含基础路径）:
   ```
   /api/v1/payment/checkout
   /api/v1/calculate-rate
   /api/v1/payout/bank
   /api/v1/query-order
   ```

2. **完整路径**（如果baseUrl只是域名）:
   ```
   /epayweb/api/v1/payment/checkout
   /epayweb/api/v1/calculate-rate
   /epayweb/api/v1/payout/bank
   /epayweb/api/v1/query-order
   ```

## ⚠️ 重要提示

1. **需要查看EPAY官方文档确认实际API路径**
2. **测试环境可能需要不同的路径格式**
3. **生产环境的路径可能与测试环境不同**

## 🧪 测试建议

1. **先配置IP白名单**（必须）
2. **使用EPAY文档中的示例请求测试**
3. **根据实际响应调整API路径**
4. **记录正确的API路径到代码注释中**

## 📝 当前代码实现

代码中已经添加了日志输出，可以在运行时查看实际调用的API端点：

```typescript
this.logger.log(`EPAY API Endpoint: ${apiEndpoint}`);
```

如果API调用失败，检查日志中的实际端点路径，与EPAY文档对比确认。

