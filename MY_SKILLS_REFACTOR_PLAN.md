# 「我的技能」模块重构优化计划（待确认）

版本：v1.0  
日期：2026-01-24  
定位：**Agent 能力资产的经营控制台**

---

## 1. 重构目标

1. **从“列表页”升级为“资产经营台”**
2. **统一 Skill 生命周期操作入口（发布→审核→上线→分发→变现）**
3. **信息密度高但可读性强（卡片+表格混合）**
4. **支持 100+ Skill 的高效管理与筛选**

---

## 2. 信息架构（IA）

### 页面结构
- 顶部：**资产总览（Portfolio Summary）**
- 中部：**技能列表（Card / Table 混合视图）**
- 右侧：**Skill 详情抽屉 / 详情页**

---

## 3. 页面模块分解

### 3.1 顶部 | 资产总览区

**标题**：我的技能  
**副标题**：你已发布的所有可交易能力资产

**四个指标卡**
1. 已发布技能数
   - 已上线的 Skill / Capability
2. 近 30 天调用次数
   - 所有 Agent 的累计调用
3. 近 30 天收入
   - 已结算收益（含分佣后）
4. 覆盖 Agent / 平台数
   - 当前正在使用你技能的 Agent / 生态

---

### 3.2 中部 | 技能列表区

**视图模式**
- 默认：Card
- 切换：Table（支持排序）

**支持的筛选维度**
- 状态：已发布 / 审核中 / 已下线
- 类型：API / Agent / 商品 / Workflow
- 定价方式：按次 / 订阅 / 免费 / 商品
- 发布平台：UCP / MCP / ACP / X402 / Marketplace

**单个 Skill Card 文案结构**

1. **基本信息**
   - Skill 名称
   - 类型标签（API / Agent / 商品 / Workflow）
   - 状态标签（已发布 / 审核中 / 已下线）

2. **商业摘要**
   - 定价方式：按次 / 订阅 / 免费 / 商品
   - 当前价格：$0.05 / call 或 $29 / month
   - 分佣模式：平台默认分佣

3. **7天数据快照**
   - 调用次数：1,248 calls
   - 收入：$312.40
   - 使用 Agent 数：17 agents

4. **快捷操作**
   - 查看详情
   - 编辑
   - 推广
   - 更多（···）

---

### 3.3 详情抽屉 / 详情页

**Tab 结构**
- 概览 Overview
- 商业与定价 Pricing
- 分发渠道 Distribution
- 确权与授权 Ownership
- 数据与分析 Analytics
- 设置 Settings

#### Overview
- 状态
- 当前定价
- 30天调用趋势
- 30天收入趋势

#### Pricing
- 修改定价模式
- 分佣说明（固定 10%）
- 收益结算说明

#### Distribution
- Claude Skills Registry
- ChatGPT / GPTs
- Google UCP
- Agentrix Marketplace
- 状态标签：已接入 / 待接入

#### Ownership
- Capability NFT 状态
- NFT ID / Hash
- 作者钱包地址
- 授权方式
  - 仅本人使用
  - 授权 Agent 使用
  - 授权第三方转售（未来）

#### Analytics
- 调用来源 Agent 排名
- 调用场景分类
- 收入来源占比
- 免费 / 付费调用比例

#### Settings
- 下线 / 重新发布
- 复制 Skill ID / Capability ID
- 删除（仅未产生交易）

---

## 4. 数据模型与接口需求（建议）

### 4.1 列表接口字段
- id
- name
- type
- status
- pricingType
- price
- currency
- callCount7d
- revenue7d
- agentCount7d
- platforms

### 4.2 详情接口字段
- status
- pricing
- revenue30d
- calls30d
- trendData
- distributionStatus
- ownershipInfo
- analytics

---

## 5. 重构阶段计划

### Phase 1（结构与信息架构）
- 顶部资产总览区
- Card 视图 + 核心字段
- 状态与筛选

### Phase 2（详情抽屉）
- 详情页 Tabs
- 基础统计图表
- 分发状态面板

### Phase 3（分析与优化）
- Analytics 面板
- Ownership 模块
- 高级批量操作

---

## 6. 实施风险与注意事项

- 数据模型需补齐“7天快照”“30天趋势”字段
- 分发状态需对接协议模块状态
- 详情面板要避免信息过载

---

## 7. 需要确认的关键点

1. 是否接受“卡片为主 + 表格可切换”的布局？
2. 是否允许在详情页提供“下线/重新发布/删除”一站式操作？
3. Ownership 模块是否一期实现？
4. Analytics 维度是否需要精简？

---

> 请确认此重构计划。确认后我将进入详细 UI/组件开发与接口对接阶段。
