# PayMind Agent Builder & SDK 扩展说明

**更新日期**: 2025-11-21  
**版本**: V2.2.0

---

## 🧰 新增：Agent Template SDK 资源

在 `sdk-js` 中新增 `AgentTemplateResource`，统一封装 Agent Builder 相关 API，方便 ISV / 开发者以编程方式管理模板与实例。

```ts
import PayMind from '@paymind/sdk';

const sdk = new PayMind({ apiKey: process.env.PAYMIND_API_KEY! });

// 列出公开模板
const templates = await sdk.agentTemplates.listTemplates({ category: 'shopping' });

// 创建模板
const template = await sdk.agentTemplates.createTemplate({
  name: '空投捕捉助手',
  category: 'airdrop',
  tags: ['airdrop', 'auto-earn'],
  config: {
    capabilities: ['search', 'auto_task'],
  },
});

// 发布模板
await sdk.agentTemplates.publishTemplate(template.id);

// 基于模板生成 Agent
const agent = await sdk.agentTemplates.instantiateTemplate(template.id, {
  name: '捕手 v1',
  publish: true,
  settings: {
    payoutWallet: '0xabc...',
  },
});
```

### 支持的方法

| 方法 | 说明 |
|------|------|
| `listTemplates(params?)` | 查询公开模板（支持搜索/分类/标签/可见性） |
| `listMyTemplates()` | 查询当前用户创建的模板 |
| `createTemplate(payload)` | 创建模板 |
| `updateTemplate(templateId, payload)` | 更新模板 |
| `publishTemplate(templateId)` | 发布模板（公开 + Featured） |
| `instantiateTemplate(templateId, payload)` | 基于模板生成 Agent |
| `listMyAgents()` | 查询当前账号生成的 Agent 实例 |

---

## 📦 测试环境模板 & 数据

运行脚本 `backend/scripts/seed-test-data.ts` 后，将生成：

- 3 个测试账号（个人 / 商家 / 开发者），密码 `Test@123`
- 3 个公开模板（购物比价、商家运营、开发者 SDK）
- 每类商品 1 个（实物 / 服务 / NFT），已自动索引到语义搜索
- 个人用户针对每个商品生成的订单，方便测试订单/物流流程

---

## 🧱 Agent Builder 前端体验优化

1. **模板库回退数据**：`AgentTemplateLibrary` 支持后端无数据时的本地样板，便于快速预览。
2. **全局模板播种**：运行播种脚本后，Builder 将展示真实模板卡片，可直接进入多步骤生成流程。
3. **工作流 + 导出**：`AgentGenerator` 保持五步流程（模板 → 能力 → 工作流 → 授权 → 预览 & 导出），并在最后一步集成：
   - 代码预览 / 下载
   - Agent 导出（Docker / Serverless / Edge / 独立界面）
   - 工作流定义持久化

---

## ✅ 下一步建议

1. **SDK**：结合 `PayMind` 主实例，将 Agent Template API 与原有 `agents` / `marketplace` 功能串联，构建自定义 Builder。
2. **前端**：在 `/agent-builder` 中引导用户登录后保存模板，利用 SDK API 显示“我的模板 / 我的 Agent”。
3. **后端**：如需更多官方模板，可在 `seed-test-data.ts` 中追加定义或接入管理后台。

---

如需更多示例或集成帮助，请随时告诉我。👏

