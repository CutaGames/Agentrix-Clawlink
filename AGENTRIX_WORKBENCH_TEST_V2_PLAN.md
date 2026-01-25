# Agentrix Workbench 重构质量保障与测试方案 (V2.0)

为了确保重构后的工作台达到“直接上线”标准，我们需要建立一套覆盖 **五大画像、三层架构、双重协议** 的全量测试体系。

---

## 1. 测试策略矩阵 (Testing Strategy Box)

| 测试维度 | 核心工具 | 目标 | 关键指标 |
| :--- | :--- | :--- | :--- |
| **功能 E2E** | Playwright | 模拟五类真实用户在 L1-L3 导航中的操作全流。 | 核心路径覆盖率 100% |
| **账户安全性** | Jest | 测试 Account V2 的资金充提、Agent 限额拦截、多链对账。 | 资金逻辑零误差 |
| **AI 封装质量** | Manual + Prompt | 验证 AI 自动生成 JSON Schema 和 Skill 描述的准确性。 | 技能可执行率 > 95% |
| **协议符合性** | Hardhat / Script | 确认 UCP 实物履约和 X402 微支付在多链（BNB/Base）的表现。 | 结算延迟 < 10s |
| **压力与并发** | k6 / autocannon | 模拟大量 Agent 并发调用 API 后的分账与速率限制。 | 响应时间 (P95) < 500ms |

---

## 2. 五类画像核心验收用例 (UAT Checklist)

### 2.1 [API 厂商] - API 资产化链路
- [ ] **OpenAPI 导入**：粘贴 cURL/Swagger URL，AI 是否正确提取了 `parameters` 和 `endpoint`？
- [ ] **Schema 验证**：生成的 `JSON Schema` 是否通过了标准的验证，能否在预览区成功调用？
- [ ] **收益分账**：调用该 API 后，`Earnings Account` 是否按照配置比例（如 75%）实时增加？

### 2.2 [实物/服务商] - 自动化履约链路
- [ ] **店铺同步**：模拟导入 10 个 Shopify 商品，检查 UCP 元数据是否包含“下单所需字段”。
- [ ] **UCP 指令发送**：测试当 Agent 下单时，商户后台能否正确生成 `Order Record` 并标记为 `Pending Shipment`。
- [ ] **资金到账**：订单核销（Fulfillment）完成后，资金是否从托管账户释放到商户余额？

### 2.3 [行业专家] - 知识资产化链路
- [ ] **能力卡配置**：填写“审计服务”描述，AI 是否生成了正确的文件上传要求（Proof Requirement）。
- [ ] **SLA 监控**：模拟服务超时，检查系统是否触发了 SLA 预警或佣金扣除。

### 2.4 [数据持有方] - 碎片化分账链路
- [ ] **X402 结算**：执行一次数据查询，检查是否通过 X402 协议自动完成了 $0.01 级别的微支付。
- [ ] **向量化检查**：上传 CSV，验证 RAG 索引是否建立，AI 助手能否根据该数据回答问题。

### 2.5 [个人/全能开发者] - Agent 经济链路
- [ ] **Agent 钱包创建**：新建 Agent 后，是否自动关联了一个独立子账户（Account）。
- [ ] **限额拦截**：设置 Agent 日限额 $10，尝试执行一次 $15 的技能调用，检查是否被 ERC8004 逻辑成功拦截。
- [ ] **多空间切换**：在 Workspace A 和 B 之间切换，资源和成员权限是否隔离正确。

---

## 3. 技术专项测试方案

### 3.1 统一资金账户 (Account V2) 测试
*   **多链对账测试**：
    *   在 BNB Chain 充值 10 USDT -> 检查 `Account.balance` 递增。
    *   在 Base Chain 充值 10 USDC -> 检查后端是否正确处理了不同精度（18 vs 6 decimals）。
*   **并发转账测试**：模拟 10 个 Agent 同时购买技能，检查全局账户余额是否发生死锁或负值。

### 3.2 导航与交互 (UI/UX) 测试
*   **L1-L2 联动测试**：点击“商户版”，左侧 L2 导航应立即刷新为 `products`, `orders`, `fulfillment` 等菜单。
*   **R1 AI 指令增强**：输入“转账 50 给我的翻译 Agent”，检查 R1 是否自动填充了转账表单并等待用户确认。

---

## 4. 如何执行测试 (自动化脚本)

### 步骤 A：后端 API 与 逻辑单元测试
```bash
# 运行新账户体系与画像核心逻辑测试
npm run test:api -- tests/api/account-v2.spec.ts
npm run test:api -- tests/api/expert-profile.spec.ts
```

### 步骤 B：前端 E2E 流程测试 (Playwright)
```bash
# 执行完整工作台重构 E2E
npx playwright test tests/e2e/workbench-restructuring.spec.ts --project=chromium --headed
```

### 步骤 C：协议与区块链集成测试
```bash
# 验证多链结算与 ERC8004 额度管理
npx ts-node scripts/verify-multichain-settlement.ts --network bsc-testnet
```

---

## 5. 上线“直接使用”判定标准 (Definition of Done)

1.  **零阻塞性故障**：所有核心画像的 `Create -> Publish -> Earning` 闭环必须 100% 跑通。
2.  **安全性审计**：未授权用户通过 URL 直接访问其他角色的控制台（如非开发者访问 API 门户）必须被 403 拦截。
3.  **对账一致性**：数据库 `Account` 表余额与链上 `ERC8004SessionManager` 的余量必须匹配。
4.  **性能标准**：工作台首页加载时间 < 1.5s，角色切换响应 < 300ms。

---
**Agentrix 质量保障部 - 2026.01**
