# PayMind SDK 文档

## 📚 SDK 文档位置

### 1. README 文档（主要文档）

**位置**: `sdk-js/README.md`

**内容**:
- 安装指南
- 快速开始
- API 参考
- 使用示例
- 配置说明

**访问方式**:
```bash
# 在项目根目录
cat sdk-js/README.md

# 或在浏览器中打开
# 文件路径: /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website/sdk-js/README.md
```

---

### 2. 示例代码

**位置**: `sdk-js/examples/`

**包含的示例**:
- `nodejs-basic.ts` - Node.js 基础使用
- `ai-agent.ts` - AI Agent 集成
- `merchant.ts` - 商户集成
- `webhook-express.ts` - Webhook 处理
- `browser-basic.html` - 浏览器使用
- `marketplace-agent.ts` - Marketplace Agent 集成
- `marketplace-merchant.ts` - Marketplace 商户集成
- `semantic-search.ts` - 语义搜索
- `crypto-payment.ts` - 加密货币支付
- `intent-payment.ts` - 意图支付
- `payment-links.ts` - 支付链接

**访问方式**:
```bash
cd sdk-js/examples
ls -la
```

---

### 3. TypeScript 类型定义

**位置**: `sdk-js/src/` 和编译后的 `sdk-js/dist/index.d.ts`

**内容**:
- 所有接口和类型定义
- 完整的 TypeScript 类型支持

**访问方式**:
```bash
# 查看源码类型定义
cd sdk-js/src
ls -la

# 查看编译后的类型定义
cd sdk-js/dist
cat index.d.ts
```

---

### 4. 在线文档（建议创建）

目前 SDK 没有像后端 API 那样的 Swagger 在线文档。建议创建以下方式之一：

#### 选项 A: 使用 TypeDoc 生成 API 文档

1. **安装 TypeDoc**:
   ```bash
   cd sdk-js
   npm install --save-dev typedoc
   ```

2. **配置 TypeDoc**:
   创建 `typedoc.json`:
   ```json
   {
     "entryPoints": ["src/index.ts"],
     "out": "docs",
     "theme": "default",
     "includeVersion": true,
     "readme": "README.md"
   }
   ```

3. **添加构建脚本**:
   在 `package.json` 中添加:
   ```json
   {
     "scripts": {
       "docs:generate": "typedoc",
       "docs:serve": "npx serve docs"
     }
   }
   ```

4. **生成文档**:
   ```bash
   npm run docs:generate
   ```

5. **访问文档**:
   ```bash
   npm run docs:serve
   # 访问: http://localhost:3000
   ```

#### 选项 B: 集成到后端 Swagger

在后端 API 文档中添加 SDK 使用说明和链接。

#### 选项 C: 创建独立的文档页面

在 `paymindfrontend` 中创建一个 SDK 文档页面。

---

## 🚀 快速访问 SDK 文档

### 方法 1: 查看 README

```bash
# 在项目根目录
cat sdk-js/README.md

# 或使用 less 查看
less sdk-js/README.md
```

### 方法 2: 查看示例代码

```bash
cd sdk-js/examples
ls -la
cat semantic-search.ts  # 查看语义搜索示例
```

### 方法 3: 查看类型定义

```bash
cd sdk-js/src
ls -la resources/  # 查看所有资源类
cat resources/payments.ts  # 查看支付资源类型定义
```

---

## 📖 SDK 文档内容概览

### 核心功能

1. **支付操作** (`payments`)
   - 创建支付
   - 查询支付状态
   - 取消支付
   - 获取路由推荐

2. **AI Agent 操作** (`agents`)
   - 自动支付授权
   - 收益查询
   - 佣金管理

3. **商户操作** (`merchants`)
   - 商品管理
   - 订单管理

4. **Marketplace** (`marketplace`)
   - 语义搜索
   - 商品检索
   - 订单创建

5. **加密货币支付** (`cryptoPayment`)
   - 多链支持
   - 交易构建
   - Gas 估算

6. **X402 协议** (`x402`)
   - 会话创建
   - 支付执行

---

## 🔧 生成在线文档（推荐）

### 使用 TypeDoc 生成

```bash
cd sdk-js

# 安装 TypeDoc
npm install --save-dev typedoc

# 生成文档
npx typedoc --entryPoints src/index.ts --out docs --readme README.md

# 启动本地服务器查看
npx serve docs
# 访问: http://localhost:3000
```

### 集成到网站

可以将生成的文档部署到：
- GitHub Pages
- Netlify
- Vercel
- 或集成到 `paymindfrontend` 中

---

## 📝 当前文档结构

```
sdk-js/
├── README.md              # 主要文档
├── CHANGELOG.md           # 更新日志
├── examples/              # 示例代码
│   ├── README.md          # 示例说明
│   ├── nodejs-basic.ts
│   ├── ai-agent.ts
│   ├── semantic-search.ts
│   └── ...
├── src/                   # 源代码
│   ├── index.ts           # 入口文件
│   ├── client.ts           # 客户端
│   └── resources/         # 资源类
│       ├── payments.ts
│       ├── agents.ts
│       ├── marketplace.ts
│       └── ...
└── dist/                  # 编译输出
    ├── index.js
    ├── index.d.ts         # TypeScript 类型定义
    └── ...
```

---

## 🎯 建议

1. **立即访问**: 查看 `sdk-js/README.md`
2. **查看示例**: 浏览 `sdk-js/examples/` 目录
3. **长期方案**: 使用 TypeDoc 生成在线 API 文档

---

**最后更新**: 2025-01-XX

