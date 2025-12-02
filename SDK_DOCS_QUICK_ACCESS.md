# PayMind SDK 文档快速访问

## 📚 文档位置

### 后端 API 文档
**Swagger UI**: http://0.0.0.0:3001/api/docs  
**或**: http://localhost:3001/api/docs  
**或**: http://172.22.252.176:3001/api/docs

---

### SDK 文档

#### 1. README 文档（主要文档）✅

**文件位置**: `sdk-js/README.md`

**访问方式**:
```bash
# 命令行查看
cat sdk-js/README.md

# 或使用 less
less sdk-js/README.md

# 在编辑器中打开
code sdk-js/README.md
```

**内容**:
- 安装指南
- 快速开始
- API 参考
- 完整的使用示例
- 配置说明

---

#### 2. 示例代码 ✅

**目录**: `sdk-js/examples/`

**访问方式**:
```bash
cd sdk-js/examples
ls -la
```

**包含的示例**:
- `nodejs-basic.ts` - Node.js 基础使用
- `ai-agent.ts` - AI Agent 集成
- `merchant.ts` - 商户集成
- `semantic-search.ts` - 语义搜索 ⭐
- `crypto-payment.ts` - 加密货币支付 ⭐
- `intent-payment.ts` - 意图支付 ⭐
- `payment-links.ts` - 支付链接 ⭐
- `marketplace-agent.ts` - Marketplace Agent 集成
- `marketplace-merchant.ts` - Marketplace 商户集成
- `webhook-express.ts` - Webhook 处理
- `browser-basic.html` - 浏览器使用

---

#### 3. TypeScript 类型定义 ✅

**源码位置**: `sdk-js/src/`

**编译后位置**: `sdk-js/dist/index.d.ts`

**访问方式**:
```bash
# 查看源码
cd sdk-js/src
ls -la resources/

# 查看类型定义
cat sdk-js/dist/index.d.ts
```

---

#### 4. 在线 API 文档（使用 TypeDoc 生成）🆕

**生成文档**:
```bash
cd sdk-js

# 安装 TypeDoc（如果未安装）
npm install --save-dev typedoc

# 生成文档
npm run docs:generate

# 启动本地服务器查看
npm run docs:serve
```

**访问地址**:
- http://localhost:3002
- http://0.0.0.0:3002
- http://172.22.252.176:3002

**文档位置**: `sdk-js/docs/`

---

## 🚀 快速开始

### 查看 README
```bash
cat sdk-js/README.md
```

### 查看示例
```bash
cd sdk-js/examples
cat semantic-search.ts
```

### 生成在线文档
```bash
cd sdk-js
npm install --save-dev typedoc
npm run docs:generate
npm run docs:serve
# 然后访问 http://localhost:3002
```

---

## 📋 文档对比

| 文档类型 | 后端 API | SDK |
|---------|---------|-----|
| **在线文档** | ✅ Swagger UI<br/>http://localhost:3001/api/docs | ⚠️ 需要生成<br/>使用 TypeDoc |
| **README** | ❌ | ✅ sdk-js/README.md |
| **示例代码** | ❌ | ✅ sdk-js/examples/ |
| **类型定义** | ✅ Swagger 自动生成 | ✅ TypeScript .d.ts |

---

## 💡 建议

1. **立即查看**: 阅读 `sdk-js/README.md`
2. **查看示例**: 浏览 `sdk-js/examples/` 目录
3. **生成在线文档**: 使用 TypeDoc 生成完整的 API 文档
4. **集成到网站**: 可以将生成的文档部署到网站或 GitHub Pages

---

**最后更新**: 2025-01-XX

