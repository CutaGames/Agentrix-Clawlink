# AI Skill Store & Marketplace 调研与竞品分析报告 (2026)

## 1. 行业概览
随着 LLM 能力的边界从“生成”转向“执行”，AI Skill (能力、插件、工具) 的分发形式正在经历从 **API 聚合** 到 **原生 Agent 商店** 的演进。目前市场呈现三足鼎立的态势：官方旗舰商店、垂直开发者社区、以及综合性 Agent 平台。

## 2. 竞品分类调研与分析

### 2.1 官方旗舰类 (Platform Official)
| 竞品 | 定位 | 特点 | 启示 |
| :--- | :--- | :--- | :--- |
| **OpenAI GPT Store** | Agent 级分发 | 强调 Persona (人格化)，而非原子工具。用户消费的是“解决问题的方案”。 | 品牌化与信任度是核心。技能应被包装成“专家”。 |
| **Claude MCP (Directory)** | 协议级标准 | 极度强调 **原子化** 和 **互操作性**。通过 MCP 协议，开发者只需写一次，即可在 Claude 中无缝调用。 | 协议统一是降低交易摩擦的关键。Agentrix ASP 应深度兼容 MCP。 |
| **Coze (ByteDance)** | 插件级生态 | 全球最成熟的插件商店。支持工作流编排，将 API 转化为 Agent 直接可用的 Plugin。 | 提供图形化的 API 转换工具极大降低了商家入驻门槛。 |

### 2.2 垂直与非官方合集 (Niche & Community)
| 竞品 | 定位 | 特点 | 启示 |
| :--- | :--- | :--- | :--- |
| **Smithery.ai / MCP.run** | 开发者工具库 | 专注 MCP Server 托管与搜索。极简 UI，侧重技术指标 (调用次数、成功率)。 | 开发者需要的是快速部署和文档。提供一键托管 (Serverless) 是加分项。 |
| **GPT Hunters / There's an AI for that** | 流量聚合器 | 搜索引擎式 UI。通过极其详细的分类 (Category) 和标签 (Tags) 解决发现痛点。 | 搜索引擎质量和 SEO 流量是第三方商店生存的核心。 |

### 2.3 综合性 Agent 平台 (Super App)
| 竞品 | 定位 | 特点 | 启示 |
| :--- | :--- | :--- | :--- |
| **Poe (Quora)** | 机器人即服务 (BaaS) | 社区互动性强，支持用户根据现有 Bot 创建子 Bot。移动端适配极佳。 | 社交传播与分享机制 (Fork) 能带来病毒式增长。 |
| **Dify / LangFlow** | 工作流应用集 | 将“能力”以“蓝图 (Template)”形式分发，而非单一 API。 | 复杂任务需要的是 Skills 的组合 (Composite)。 |

---

## 3. 对 Agentrix Marketplace 的启示

### 3.1 从“技术卡片”转向“场景服务”
调研发现，普通用户对 `InputSchema` 无感，但对“帮我买咖啡”或“分析财报”有极强需求。
- **启示**: Marketplace 需要 **“双重人格”**。
  - **Human 面向**: 传统的电商展示 (图片、评价、价格、SLA)。
  - **Agent 面向**: 结构化的 Schema 定义 (JSON, MCP, OAPS)。

### 3.2 Skill 的“原子化”与“复合化”并重
- **启示**: 目前 Agentrix 过于强调原子 Skill (Layer 1-3)。未来应重点推行 **Composite Skill (Layer 4)**。用户不应去商店买“快递接口”和“支付接口”，而应买“全球代购工作流”。

### 3.3 构建“信用与履约”的护城河
- **竞品痛点**: 大多数 Skill Store (如 GPT Store) 只管“对话”，不管“结果”。
- **我们的优势**: 结合 **UCP (商业协议)**，Agentrix 是唯一能闭环“物理交付”的市场。
- **启示**: 在 UI 中应显著标识 **“Verified Delivery (已验证履约)”** 标签。

---

## 4. 优化建议：Agentrix Marketplace 3.0

### 4.1 定位优化：从“工具店”到“价值分发网络”
Agentrix 不应仅仅是一个 Skill Store，而应定位为 **“AI 时代的商贸中转站”**。
- **新口号**: "Every Skill Generates Value." (让每个技能都产生商业价值)

### 4.2 呈现方式优化 (Presentation Layer)
- **卡片自适应**: 
  - **商品类 (Resource)**: 采用 **电商列表模式** (淘宝/Amazon 风格)，突出物理属性。
  - **工具类 (Logic)**: 采用 **开发者组件模式** (npm/GitHub 风格)，突出技术参数。
- **Playground 集成**: 在详情页提供“即时试用”拨盘，用户/开发者无需安装即可看到输出结果。
- **Intent-based Discovery (意图驱动搜索)**: 搜索框不应搜关键词，而应搜意图 (“我想赚钱”、“我想省事”、“我需要分析”)。

### 4.3 开发者入驻体验优化 (Onboarding)
- **一键 Skill 化引擎**: 学习 Coze，提供一个输入 OpenAPI 文档 URL 即可自动生成 ASP Skill 的发布工具。
- **收益可视化**: 开发者后台应实时显示他的 Skill 在全球 Agent 网络中被调用的频次和产生的分成收益。

---

## 5. 结论
Agentrix 拥有行业领先的 **UCP+X402** 底层协议，补齐了“物质交付”的一环。现阶段的重点应是将这些硬核协议**包装成更具呼吸感、更符合人类商业直觉的 UI/UX**，并借助 **MCP 协议** 的爆发期，将 Agentrix 打造为 MCP 生态中唯一的“实物贸易枢纽”。
