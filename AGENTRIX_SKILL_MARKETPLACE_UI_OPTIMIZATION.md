# Agentrix Skill Marketplace 交互优化与UI改进方案

**日期**: 2026-01-12  
**状态**: 提案 (Proposal)  
**目标**: 解决"万物皆Skill"架构下，商品类(Resource) Skill与工具类(Logic/Infra) Skill在Marketplace中展示形式单一、对普通用户不友好的痛点。

---

## 1. 核心问题诊断

### 1.1 现状痛点
- **认知错位**: 普通用户想买"咖啡"或"显卡"，看到的是一个带有 `inputSchema` 和 `APIVersion` 的 "Skill卡片"。
- **展示单一**: 目前Marketplace可能采用了统一的元数据展示模板，导致商品缺乏吸引力（无大图、无价格显著标识）。
- **流程割裂**: 商家上架商品需要填写"Skill定义"，而非"商品详情"，门槛过高。

### 1.2 优化核心理念：自适应表现层 (Adaptive Presentation Layer)
虽然底层协议统一使用 `Agentrix Skill Protocol (ASP)`，但在用户界面层（UI），必须根据 **Skill Layer** 和 **Category** 采用自适应的展示组件。

- **Layer 1/3 (Infra/Logic)** → **工具/插件形态** (类似 Chrome Store / GPT Store)
- **Layer 2 (Resource)** → **商品/资产形态** (类似 Amazon / OpenSea)

---

## 2. 用户端 (Consumer) 交互优化

### 2.1 Marketplace 首页分区设计

建议将 Marketplace 首页改为 **"分频道聚合"** 结构，而非单一列表。

#### 方案 A：双视图切换 (推荐)
在 Marketplace 顶部设置一级 Tab：
- **🧩不仅是工具 (Tools & Apps)**: 聚合 Logic, Infra, Composite Skills。
- **🛍️ 资源与商品 (Resources & Goods)**: 聚合 Resource Skills (Physical, Digital, Service)。

#### 方案 B：混合楼层
- **推荐专区 (Featured)**: 混合展示高热度 Skill。
- **热门商品 (Trending Products)**: 网格展示 Resource Skill (大图模式)。
- **效率工具 (Productivity Tools)**: 列表展示 Logic Skill (紧凑模式)。

---

### 2.2 Skill 卡片样式的差异化设计

系统应根据 Skill 的 `layer` 和 `category` 字段自动渲染不同类型的卡片组件。

#### A 类：商品卡片 (Resource Skill)
*适用于: Physical Goods, Services, Digital Assets*

**视觉元素**:
- **封面**: 16:9 或 1:1 大图 (来自 Skill metadata 中的 `image` 或 `thumbnail`)。
- **标题**: 商品名称 (DisplayName)，弱化技术 ID。
- **价格**: 显著展示 `pricing.pricePerCall` 或固定价格 (如 "$5.99")。
- **行动点**: "购买" (Buy Now) 或 "订阅" (Subscribe)。
- **辅助信息**: 销量 (Sold)、评分 (Rating)、商家名称。
- **隐藏信息**: API Schema、Version (放入详情页底部的"开发者信息"折叠区)。

**交互逻辑**:
> 点击 → 进入类似电商的详情页（轮播图、富文本详情、评价） → 下单 → 触发 `create_order` Skill。

#### B 类：工具卡片 (Logic/Infra/Composite Skill)
*适用于: Analysis, Payment, Workflow*

**视觉元素**:
- **图标**: 1:1 Logo (类似 App 图标)。
- **标题**: 工具名称 + 版本号 (v1.2)。
- **标签**: 类别 (e.g., "Finance", "Dev Tool")。
- **行动点**: "安装" (Install) 或 "授权" (Enable)。
- **辅助信息**: 调用次数 (Used 10k+ times)、开发者认证标识。
- **核心展示**: 一句话能力描述 ("自动分析以太坊链上交易数据")。

**交互逻辑**:
> 点击 → 进入工具详情页（API文档、参数示例、Playground） → 安装 → 授权给 User Agent。

---

## 3. 商家端 (Merchant) 交互优化

### 3.1 "所见即所得" 的发布流程

商家不应感知 "Skill Protocol" 的复杂性。系统应提供 **"面向场景的发布向导"**。

#### 流程拆解：
1. **选择发布类型**:
   - 📦 **发布商品/服务** (Resource Skill)
   - 🧩 **发布工具/算法** (Logic Skill)
   - 🤖 **发布工作流** (Composite Skill)

2. **商品发布模式 (针对 Resource)**:
   - **界面**: 传统的电商后台表单（商品图、库存、价格、SKU、配送方式）。
   - **自动化转化**: 填写完毕后，前端/后端自动将其 Warp 成符合 ASP 标准的 JSON。
     - `name` -> `skill_name`
     - `price` -> `pricing`
     - `stock` -> 内部逻辑
   - **Schema 生成**: 自动生成标准的 `get_details`, `create_order` 等 Action 定义，商家无需手写。

3. **工具发布模式 (针对 Logic/Infra)**:
   - **界面**: 开发者模式（输入 API Endpoint, 定义 OpenAPI Schema, 配置 Auth）。
   - **调试**: 提供在线 API Test 面板。

### 3.2 商家控制台仪表板
- **商品视图**: 销量、GMV、库存预警。
- **API 视图**: 接口调用成功率、延迟、错误日志（针对有开发能力的商家）。

---

## 4. 详情页 (Detail Page) 深度优化

### 4.1 Resource Skill 详情页 (电商化)
- **Header**: 商品大图画廊。
- **Info**: 价格、SKU 选择、配送预估。
- **Description**: 这里的描述来自 metadata 的富文本字段，而非 JSON Schema 说明。
- **Agent Action**: "让 Agent 帮我买" (Delegate to Agent) 按钮 —— 这是 Agentrix 的特色。点击后，唤起侧边栏 Agent 对话框，自动填入购买意图 prompt。

### 4.2 Logic Skill 详情页 (文档化)
- **Header**: 工具图标、安装量、Github 链接(如有)。
- **Tab 1: 介绍**: 功能说明、使用案例。
- **Tab 2: 这里是 Playground**: 允许用户直接在 UI 上输入参数运行一次（Mock 或实盘），体验 "Input -> Output" 的过程。
- **Tab 3: 集成**: 如何在 ChatGPT / Claude 中使用的配置代码。

---

## 5. Mobile / 小程序端适配建议
- 在移动端，Resource Skill 列表应完全呈现为 "流式购物 App" 体验。
- 工具类 Skill 主要以 "已启用的插件列表" 形式存在，弱化移动端的配置操作，强调使用。

---

## 6. 下一步行动建议
1. **UI 组件库扩充**: 新增 `ProductCard` 组件，与现有的 `SkillCard` 并行。
2. **元数据扩充**: 在 ASP 协议的 `metadata` 字段中增加 `visual_assets` (image_urls, gallery) 和 `ui_template` (指定渲染模板) 字段。
3. **发布向导开发**: 开发 `Wizard` 组件，根据选择的类型渲染不同的表单。
