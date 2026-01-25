# Agentrix 自动化测试架构设计

## 📋 测试范围

### 1. 前端网页功能测试 (E2E)
- 用户注册/登录流程
- 支付流程（所有支付方式）
- 商户管理功能
- Agent管理功能
- 用户中心功能
- 26个新功能页面

### 2. API功能测试
- 支付API
- 商户API
- Agent API
- 市场API
- Webhook API

### 3. SDK功能测试
- JavaScript/TypeScript SDK
- Python SDK
- React SDK

### 4. 交付物测试
- 文档完整性
- 示例代码可运行性
- 构建产物

---

## 🏗️ 技术栈

### E2E测试
- **Playwright** - 跨浏览器测试，支持Chrome、Firefox、Safari
- **优势**: 速度快、稳定、支持多浏览器、自动截图

### API测试
- **Jest** - 测试框架
- **Axios** - HTTP客户端
- **Supertest** - API测试工具

### SDK测试
- **Jest** - JavaScript/TypeScript SDK
- **pytest** - Python SDK
- **React Testing Library** - React SDK

### 报告生成
- **Playwright HTML Report** - E2E测试报告
- **Jest HTML Reporter** - 单元/集成测试报告
- **Allure** - 统一测试报告（可选）

---

## 📁 目录结构

```
agentrix-website/
├── tests/
│   ├── e2e/                    # E2E测试
│   │   ├── auth.spec.ts        # 认证流程
│   │   ├── payment.spec.ts     # 支付流程
│   │   ├── merchant.spec.ts    # 商户功能
│   │   ├── agent.spec.ts       # Agent功能
│   │   ├── user.spec.ts        # 用户功能
│   │   └── new-features.spec.ts # 26个新功能
│   ├── api/                     # API测试
│   │   ├── payment.api.test.ts
│   │   ├── merchant.api.test.ts
│   │   ├── agent.api.test.ts
│   │   └── marketplace.api.test.ts
│   ├── sdk/                     # SDK测试
│   │   ├── js-sdk.test.ts
│   │   ├── python-sdk.test.py
│   │   └── react-sdk.test.tsx
│   ├── fixtures/               # 测试数据
│   ├── utils/                  # 测试工具
│   └── reports/                # 测试报告
├── playwright.config.ts        # Playwright配置
├── jest.config.js             # Jest配置
└── test-all.sh                # 一键测试脚本
```

---

## 🚀 实现计划

### 阶段1: 基础框架搭建
1. 安装依赖
2. 配置文件
3. 基础工具函数

### 阶段2: E2E测试
1. 认证流程测试
2. 支付流程测试
3. 功能页面测试

### 阶段3: API测试
1. 支付API测试
2. 商户API测试
3. Agent API测试

### 阶段4: SDK测试
1. JavaScript SDK测试
2. Python SDK测试
3. React SDK测试

### 阶段5: 报告生成
1. HTML报告
2. JSON报告
3. 统一报告合并

---

## 📊 测试报告格式

### 报告内容
- 测试概览（总数、通过、失败、跳过）
- 测试详情（每个测试用例）
- 截图和视频（失败用例）
- 性能指标
- 覆盖率报告

### 报告格式
- HTML报告（可交互）
- JSON报告（CI/CD集成）
- Markdown报告（文档）

---

## ✅ 下一步

开始实现测试框架...

