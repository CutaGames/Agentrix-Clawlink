# Agentrix WebMCP 生态集成与商业机会分析报告

## 1. WebMCP 生态现状分析 (2026年2月)

Google 发布的 **WebMCP (Web Model Context Protocol)** 是浏览器生态的一次范式转移。它将网页从“视觉界面”转变为“结构化工具集”。

### 生态现状：
*   **浏览器支持**：Chrome 146+ (Canary 已支持) 原生集成了 WebMCP 握手协议。
*   **主流 Agent 接入**：Claude Code, OpenAI Operator, 以及基于开源框架的 Agent 开始弃用 DOM Scraping，转向 WebMCP 工具调用。
*   **标准化趋势**：正在由 W3C 推动成为 Web 标准，目标是让所有网站都能像提供 API 一样提供网页功能。

---

## 2. 对 Agentrix 的核心影响

### A. 支付流程的革命
*   **现状**：Agent 在移动端/网页端进行支付时，常卡在“连接钱包”、“签名确认”等 UI 交互上。
*   **WebMCP 影响**：Agentrix 可以直接暴露 `request_crypto_payment` 工具。Agent 直接传入 `amount` 和 `token`，浏览器弹出原生确认框，无需 Agent 模拟点击。

### B. 佣金协议的透明分发
*   **现状**：Agent 无法预知任务的分成比例。
*   **WebMCP 影响**：通过 `get_commission_structure` 工具，Agentrix 能在任务开始前向 Agent 发送结构化的分润契约（基于 `Commission.sol` 和 `CommissionV2.sol`）。

---

## 3. Agentrix WebMCP 集成建议方案

### 方案一：命令式集成 (JavaScript API)
适用于我们的 `frontend` 官网和 `mobile-app` 的 Webview 页面。

```javascript
// 在 Agentrix 支付页面注入
if (navigator.modelContext) {
  navigator.modelContext.registerTool({
    name: "agentrix_pay",
    description: "通过 Agentrix 钱包支付加密货币并处理自动分成",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        amount: { type: "string" },
        symbol: { type: "string", enum: ["USDT", "AX"] }
      },
      required: ["orderId", "amount"]
    },
    execute: async (args) => {
      // 触发 Agentrix 内部支付逻辑
      const result = await triggerInternalPayment(args);
      return { success: true, txHash: result.hash };
    }
  });
}
```

### 方案二：声明式集成 (HTML Forms)
最快接入方式，直接在现有的“创建任务”或“购买 Skill”表单上增加属性。

```html
<form 
  toolname="agentrix_buy_skill" 
  tooldescription="购买指定的 AI Skill 并自动结算开发者分成"
>
  <input name="skillId" type="hidden" value="SKILL_001" />
  <input name="price" type="number" />
  <!-- Chrome 会自动将此表单转换为 Agent 可理解的工具 -->
</form>
```

---

## 4. 商业机会总结

1.  **AI 流量优先权**：Agent 搜索时会优先选择“WebMCP Friendly”的站点，Agentrix 将获得大量自动化交易流量。
2.  **分成逻辑上链代理**：将我们的 `BudgetPool` 和 `Commission` 合约逻辑通过 WebMCP 暴露给全球 Agent，成为 **“AI 交易的分成清算标准”**。
3.  **零摩擦支付**：结合 MPC 钱包，Agent 可以实现真正的“一句话支付”，极大提升商城的转化率。

---

> **当前状态更新**：
> *   **Android 构建任务**：已在 GitHub Actions 激活并运行中。
> *   **下一步建议**：待 APK 生成后，我们将测试在移动端 Webview 中预留 WebMCP 接口的可能性。
