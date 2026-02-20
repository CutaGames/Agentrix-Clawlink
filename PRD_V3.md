# Agentrix Mobile App PRD V3

**版本**: 3.0  
**日期**: 2026-02-12  
**状态**: Draft  
**基于**: V2.0 (2026-02-01)  
**负责人**: 产品/研发/设计

---

## 修订记录

| 版本 | 日期 | 修订内容 | 作者 |
|-----|------|---------|-----|
| 1.0 | 2026-02-01 | 初稿 | PM |
| 2.0 | 2026-02-01 | 结构重构、补充安全/技术/竞品章节 | Copilot |
| 3.0 | 2026-02-12 | 新增推广中心、三分类市场、社交裂变、ARN 协议集成；更新技术栈与里程碑 | Cascade |

---

## V2 → V3 核心变化

| 问题 | V2 状态 | V3 改进 |
|-----|---------|--------|
| 推广中心缺失 | 仅在商户收款中提及分享 | 新增独立推广中心模块（L1 入口），含链接管理、QR 码、社交裂变 |
| 市场分类过时 | 未定义移动端市场浏览 | 新增三分类市场（Resources / Skills / Tasks）与 Web 端一致 |
| 社交裂变能力弱 | 仅有基础分享 | 新增 Social Referral Split：短链追踪、多级分佣、QR 码生成 |
| ARN 协议未覆盖 | 无 | 新增 ARN 链上分账协议移动端集成 |
| KYC 入口调整 | 独立 Tab | 移至"我的"页面子项（与 Web 端控制台左栏一致） |
| 技术栈更新 | Expo SDK 52 | 升级至 Expo SDK 53 + qrcode.react |

---

## 1. 新增模块概述

本文档为 V2 PRD 的增量补充，仅描述 V3 新增或变更的模块。V2 中已定义的模块（资产管理、空投、AutoEarn、Agent 对话、商户分佣、开发者预算池等）保持不变。

### 1.1 新增模块清单

| 模块 | 层级 | 优先级 | 说明 |
|-----|-----|--------|-----|
| **推广中心** | Layer 1 (个人) | P0 - MVP | 独立顶级入口，管理推广链接、QR 码、社交分享、佣金统计 |
| **技能市场（三分类）** | Layer 1 (个人) | P0 - MVP | Resources / Skills / Tasks 三分类浏览，与 Web MarketplaceView 一致 |
| **Social Referral Split** | Layer 4 (平台) | P1 | 短链生成、点击追踪、多级分佣、转化统计 |
| **ARN 协议集成** | Layer 4 (平台) | P2 | 链上分账查看、Treasury 状态、Fee Splitter 可视化 |

---

## 2. 推广中心（Promotion Center）

### 2.1 定位

推广中心是个人用户的核心增长工具，从原来隐藏在"购物"子菜单中提升为 **底部 Tab 独立入口**（与 Web 端 L1 顶级导航一致）。

### 2.2 导航结构

```
底部 Tab Bar:
  🏠 首页  |  💰 资产  |  📢 推广  |  🛒 市场  |  👤 我的

推广中心内部:
  ├── 推广总览 (Overview)
  ├── 我的链接 (My Links)
  └── 营销素材 (Materials)
```

### 2.3 功能需求

#### 2.3.1 推广总览

| 功能点 | 描述 | MVP | Phase |
|-------|-----|-----|-------|
| 统计卡片 | 累计邀请人数、链接点击数、转化率、累计佣金 | ✅ | P1 |
| 专属推广链接 | 显示用户专属推广链接，支持一键复制 | ✅ | P1 |
| QR 码展示 | 推广链接的实时 QR 码（使用 qrcode.react） | ✅ | P1 |
| 一键分享 | 分享到 Twitter / Telegram / WeChat / 复制链接 | ✅ | P1 |
| 快捷入口 | 跳转到商品推广、社交分享、佣金计算器 | ✅ | P1 |
| 收益趋势图 | 7天/30天佣金收益曲线 | ❌ | P2 |

#### 2.3.2 我的链接

| 功能点 | 描述 | MVP | Phase |
|-------|-----|-----|-------|
| 默认链接 | 系统自动生成 3 条默认推广链接（注册邀请、技能市场、自动赚钱） | ✅ | P1 |
| 自定义链接 | 输入商品名称/Skill ID 生成专属推广短链 | ✅ | P1 |
| 链接列表 | 展示所有推广链接：名称、短链、点击数、转化数、佣金 | ✅ | P1 |
| 链接操作 | 复制、生成 QR 码、社交分享、暂停/恢复 | ✅ | P1 |
| 链接详情 | 点击趋势、转化漏斗、来源分析 | ❌ | P2 |

#### 2.3.3 营销素材

| 功能点 | 描述 | MVP | Phase |
|-------|-----|-----|-------|
| 推广海报 | 高清海报模板（含用户专属 QR 码） | ❌ | P2 |
| 推广文案 | 社交媒体文案模板（可一键复制） | ✅ | P1 |
| 用户评价 | 真实用户好评卡片 | ❌ | P2 |
| 数据报告 | 推广效果分析报告 | ❌ | P3 |

#### 2.3.4 佣金规则（只读展示）

| 功能点 | 描述 | MVP | Phase |
|-------|-----|-----|-------|
| 三层分润架构 | 平台基础 + 佣金池 + 推广者奖励 | ✅ | P1 |
| 资产类型费率 | 实物(3%) / 服务(5%) / 虚拟(3-5%) / 开发者工具(20%) | ✅ | P1 |
| 场景分成 | 推荐+执行(30/70) / 仅执行(0/100) / 无Agent(0/0) | ✅ | P1 |
| 结算周期 | 实物T+7 / 服务T+3 / 虚拟T+1 / 开发者即时 | ✅ | P1 |

### 2.4 用户故事

| ID | 用户故事 | 验收标准 |
|----|---------|---------|
| US-P01 | 我希望在底部 Tab 直接进入推广中心 | 底部 Tab 有"推广"入口，点击进入推广总览 |
| US-P02 | 我希望看到我的专属推广链接和 QR 码 | 总览页展示链接 + 可扫描的 QR 码 |
| US-P03 | 我希望一键分享推广链接到社交平台 | 支持 Twitter/Telegram/WeChat/复制链接 |
| US-P04 | 我希望看到推广效果统计 | 展示邀请人数、点击数、转化率、佣金 |
| US-P05 | 我希望为特定商品生成推广短链 | 输入商品名 → 生成短链 → 自动复制 |
| US-P06 | 我希望查看每条链接的效果数据 | 链接列表展示点击/转化/佣金 |
| US-P07 | 我希望了解佣金规则 | 佣金规则页展示三层架构、费率、结算周期 |

### 2.5 线框图

```
┌────────────────────────────────────┐
│ ← 推广中心                    🔔  │
├────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │ 总览 │ │ 链接 │ │ 素材 │       │ ← 子 Tab
│ └──────┘ └──────┘ └──────┘       │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐│
│ │  👥 128    🔗 2,456   📈 5.2% ││
│ │  邀请      点击       转化率   ││ ← 统计卡片
│ │  💰 $1,234.56                  ││
│ │  累计佣金                       ││
│ └────────────────────────────────┘│
├────────────────────────────────────┤
│ ┌────────────────────────────────┐│
│ │ 🎁 邀请好友，赚取佣金          ││
│ │                                ││
│ │ agentrix.top/r/abc123          ││ ← 推广链接
│ │ [复制]  [QR码]  [分享]         ││
│ │                                ││
│ │  ┌──────────┐                  ││
│ │  │ ████████ │                  ││
│ │  │ ██    ██ │                  ││ ← QR 码
│ │  │ ██    ██ │                  ││
│ │  │ ████████ │                  ││
│ │  └──────────┘                  ││
│ └────────────────────────────────┘│
├────────────────────────────────────┤
│ ⚡ 快捷入口                       │
│ ┌──────┐ ┌──────┐ ┌──────┐      │
│ │商品级│ │社交  │ │佣金  │      │
│ │推广  │ │分享  │ │计算器│      │
│ └──────┘ └──────┘ └──────┘      │
└────────────────────────────────────┘
│  🏠    💰    📢    🛒    👤    │
│ 首页  资产  推广  市场  我的   │
└────────────────────────────────────┘
```

**我的链接页**：

```
┌────────────────────────────────────┐
│ ← 推广中心                    🔔  │
├────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │ 总览 │ │[链接]│ │ 素材 │       │
│ └──────┘ └──────┘ └──────┘       │
├────────────────────────────────────┤
│ 🔍 输入商品名称或 Skill ID...     │
│                       [⚡ 生成]   │
├────────────────────────────────────┤
│ ✨ 我的推广链接 (6)               │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐│
│ │ 注册邀请 / Registration Invite ││
│ │ agentrix.top/r/invite          ││
│ │ 点击 245  转化 12  佣金 $34.5  ││
│ │ [复制] [QR] [分享]             ││
│ └────────────────────────────────┘│
│ ┌────────────────────────────────┐│
│ │ 技能市场 / Skill Marketplace   ││
│ │ agentrix.top/r/marketplace     ││
│ │ 点击 189  转化 8   佣金 $22.0  ││
│ │ [复制] [QR] [分享]             ││
│ └────────────────────────────────┘│
│ ┌────────────────────────────────┐│
│ │ 自动赚钱 / Auto-Earn           ││
│ │ agentrix.top/r/earn            ││
│ │ 点击 312  转化 15  佣金 $56.8  ││
│ │ [复制] [QR] [分享]             ││
│ └────────────────────────────────┘│
│ ...                               │
└────────────────────────────────────┘
```

---

## 3. 技能市场（三分类 Marketplace）

### 3.1 定位

移动端市场浏览与 Web 端 `MarketplaceView` 组件保持一致，采用三分类架构：

| 分类 | 说明 | 对应 Layer |
|-----|-----|-----------|
| **Resources** | 资源型技能（API、数据源、基础设施） | infra + resource |
| **Skills** | 逻辑型技能（AI 模型、自动化工具） | logic + composite |
| **Tasks** | 任务发布（悬赏、外包、里程碑） | 用户发布 |

### 3.2 功能需求

#### 3.2.1 市场浏览

| 功能点 | 描述 | MVP | Phase |
|-------|-----|-----|-------|
| 三分类 Tab | Resources / Skills / Tasks 切换 | ✅ | P1 |
| 搜索 | 关键词搜索技能/资源/任务 | ✅ | P1 |
| 子筛选 | 每个分类下的细分筛选（如 API/数据/AI模型） | ✅ | P1 |
| 卡片展示 | 技能卡片：名称、评分、调用次数、价格、标签 | ✅ | P1 |
| 趋势推荐 | 热门技能/资源推荐横幅 | ❌ | P2 |
| 活动横幅 | 轮播 Banner（新技能上架、限时优惠） | ❌ | P2 |

#### 3.2.2 技能详情

| 功能点 | 描述 | MVP | Phase |
|-------|-----|-----|-------|
| 基本信息 | 名称、描述、作者、评分、价格 | ✅ | P1 |
| 试用 | Logic 层技能支持 Playground 试用 | ❌ | P2 |
| 购买/订阅 | 加入购物车或直接购买 | ✅ | P1 |
| 社交操作 | 分享、评价、打赏 | ❌ | P2 |

#### 3.2.3 任务发布（Tasks Tab）

| 功能点 | 描述 | MVP | Phase |
|-------|-----|-----|-------|
| 任务列表 | 浏览可接任务（预算、截止时间、技能要求） | ✅ | P1 |
| 任务详情 | 需求描述、预算池关联、里程碑拆分 | ✅ | P1 |
| 发布任务 | 创建新任务（保留在 Web 端） | ❌ | - |
| 接单/投标 | 移动端快速接单 | ❌ | P2 |

### 3.3 用户故事

| ID | 用户故事 | 验收标准 |
|----|---------|---------|
| US-M01 | 我希望在移动端浏览技能市场 | 底部 Tab 有"市场"入口，展示三分类 |
| US-M02 | 我希望按分类筛选技能 | Resources/Skills/Tasks Tab 切换正常 |
| US-M03 | 我希望搜索特定技能 | 搜索框输入关键词，实时过滤结果 |
| US-M04 | 我希望查看技能详情并购买 | 点击卡片 → 详情页 → 购买/加入购物车 |
| US-M05 | 我希望浏览可接任务 | Tasks Tab 展示任务列表，按预算/截止时间排序 |

### 3.4 线框图

```
┌────────────────────────────────────┐
│ ← 技能市场                   🔍   │
├────────────────────────────────────┤
│ ┌──────────┐ ┌──────┐ ┌──────┐   │
│ │Resources │ │Skills│ │Tasks │   │ ← 三分类 Tab
│ └──────────┘ └──────┘ └──────┘   │
├────────────────────────────────────┤
│ 🔍 搜索技能、资源或任务...        │
├────────────────────────────────────┤
│ 筛选: [全部] [API] [数据] [AI]   │ ← 子筛选
├────────────────────────────────────┤
│ ┌────────────────────────────────┐│
│ │ 🤖 GPT-4 Translation          ││
│ │ ⭐ 4.8  |  12.5K calls        ││ ← 技能卡片
│ │ $0.02/call  |  #ai #nlp       ││
│ │ [查看详情]  [加入购物车]       ││
│ └────────────────────────────────┘│
│ ┌────────────────────────────────┐│
│ │ 📊 Market Data API             ││
│ │ ⭐ 4.5  |  8.2K calls         ││
│ │ $0.01/call  |  #data #finance ││
│ │ [查看详情]  [加入购物车]       ││
│ └────────────────────────────────┘│
│ ...                               │
└────────────────────────────────────┘
│  🏠    💰    📢    🛒    👤    │
│ 首页  资产  推广  市场  我的   │
└────────────────────────────────────┘
```

**Tasks Tab 线框图**：

```
┌────────────────────────────────────┐
│ ← 技能市场                   🔍   │
├────────────────────────────────────┤
│ ┌──────────┐ ┌──────┐ ┌──────┐   │
│ │Resources │ │Skills│ │[Tasks]│  │
│ └──────────┘ └──────┘ └──────┘   │
├────────────────────────────────────┤
│ 筛选: [全部] [开发] [设计] [运营] │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐│
│ │ 📋 小程序前端开发              ││
│ │ 预算 $3,000  |  截止 3月15日   ││
│ │ 技能: React Native, TypeScript ││ ← 任务卡片
│ │ 里程碑: 3个  |  已投标: 5人    ││
│ │ [查看详情]  [快速接单]         ││
│ └────────────────────────────────┘│
│ ┌────────────────────────────────┐│
│ │ 🎨 品牌 VI 设计                ││
│ │ 预算 $1,500  |  截止 2月28日   ││
│ │ 技能: Figma, Illustrator       ││
│ │ 里程碑: 2个  |  已投标: 8人    ││
│ │ [查看详情]  [快速接单]         ││
│ └────────────────────────────────┘│
└────────────────────────────────────┘
```

---

## 4. Social Referral Split（社交裂变分佣）

### 4.1 定位

将 Web 端的 Social Referral Split 功能完整移植到移动端，利用移动端的社交分享天然优势实现裂变增长。

### 4.2 核心概念

```
用户 A 生成推广短链
    ↓
分享到社交平台（Twitter / Telegram / WeChat）
    ↓
用户 B 点击短链 → 记录点击 + 绑定推荐关系
    ↓
用户 B 注册 / 购买 → 记录转化
    ↓
佣金自动计算 → 结算到用户 A 账户
```

### 4.3 功能需求

| 功能点 | 描述 | MVP | Phase |
|-------|-----|-----|-------|
| 短链生成 | 8 位字符短链（a-z0-9），支持 general/product/skill/campaign 类型 | ✅ | P1 |
| 点击追踪 | 记录短链点击次数、来源、时间 | ✅ | P1 |
| 转化追踪 | 记录注册转化、购买转化 | ✅ | P1 |
| QR 码生成 | 实时生成可扫描的 QR 码（SVG 渲染） | ✅ | P1 |
| 多级分佣 | 推广者从平台基础收入获得 20% 分成 | ✅ | P1 |
| 链接状态管理 | active / paused / expired / archived | ✅ | P1 |
| 佣金结算 | 查看待结算/已结算佣金明细 | ❌ | P2 |
| 裂变活动 | 限时推广活动（提高佣金比例） | ❌ | P3 |

### 4.4 分佣规则

```
交易金额 $100 (实物商品)
├── 平台基础收入: $100 × 3% = $3.00
│   └── 推广者奖励: $3.00 × 20% = $0.60  ← 推广者获得
├── 佣金池: $100 × 1.5% = $1.50
│   ├── 推荐 Agent: $1.50 × 30% = $0.45
│   └── 执行 Agent: $1.50 × 70% = $1.05
└── 卖家净收入: $100 - $3.00 - $1.50 = $95.50
```

### 4.5 API 对接

| 接口 | 方法 | 描述 | MVP |
|-----|-----|-----|-----|
| `/referral/link` | GET | 获取用户专属推广链接 | ✅ |
| `/referral/stats` | GET | 获取推广统计数据 | ✅ |
| `/referral/links` | POST | 创建推广短链 | ✅ |
| `/referral/links/mine` | GET | 获取我的推广链接列表 | ✅ |
| `/referral/links/:id/stats` | GET | 获取链接统计数据 | ✅ |
| `/referral/links/:id/status` | PATCH | 更新链接状态（暂停/恢复） | ✅ |
| `/r/:shortCode` | GET | 短链重定向（带点击追踪） | ✅ |

### 4.6 数据模型

```typescript
interface ReferralLink {
  id: string;
  shortCode: string;       // 8位短码 a-z0-9
  shortUrl: string;        // 完整短链 URL
  targetUrl: string;       // 目标页面
  type: 'general' | 'product' | 'skill' | 'campaign';
  status: 'active' | 'paused' | 'expired' | 'archived';
  clicks: number;
  conversions: number;
  commission: number;
  gmv: number;
  createdAt: string;
}

interface ReferralStats {
  totalReferrals: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalCommission: number;
  pendingCommission: number;
}
```

---

## 5. ARN 协议集成（Phase 2+）

### 5.1 定位

ARN (Agentrix Revenue Network) 是链上分账协议，移动端提供只读可视化，让用户直观了解链上资金流向。

### 5.2 功能需求

| 功能点 | 描述 | Phase |
|-------|-----|-------|
| Treasury 状态 | 查看 ARN Treasury 余额和分配状态 | P2 |
| Fee Splitter 可视化 | 展示分账规则和历史分配（桑基图） | P2 |
| Session 管理 | 查看链上 Session 状态（活跃/已结算） | P2 |
| 链上交易记录 | 查看 ARN 相关链上交易 Hash 和状态 | P3 |
| 合约交互 | 发起链上操作（需钱包签名） | P3 |

### 5.3 线框图

```
┌────────────────────────────────────┐
│ ← ARN 协议                       │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐│
│ │ 🏦 Treasury                    ││
│ │ 总余额: 125,000 USDC          ││
│ │ 已分配: 98,500 USDC           ││
│ │ 待分配: 26,500 USDC           ││
│ └────────────────────────────────┘│
├────────────────────────────────────┤
│ 📊 Fee Splitter                   │
│ ┌────────────────────────────────┐│
│ │ 交易额 ──→ 平台(3%) ──→ 推广者││
│ │         ──→ 佣金池 ──→ Agent  ││
│ │         ──→ 卖家净收入         ││
│ └────────────────────────────────┘│
├────────────────────────────────────┤
│ 📋 最近 Sessions                  │
│ • Session #1234 - 已结算 - $500  │
│ • Session #1233 - 进行中 - $200  │
│ • Session #1232 - 已结算 - $800  │
└────────────────────────────────────┘
```

---

## 6. 导航架构更新

### 6.1 底部 Tab Bar（V3 更新）

```
V2:  🏠首页  |  💰资产  |  📊活动  |  👤我的         (4 Tab)
V3:  🏠首页  |  💰资产  |  📢推广  |  🛒市场  |  👤我的  (5 Tab)
```

### 6.2 KYC 入口调整

| 变更 | V2 | V3 |
|-----|----|----|
| KYC 入口 | 独立 Tab 或身份管理中 | 移至"我的"→"实名认证"（与 Web 端控制台左栏一致） |
| 推广中心 | 隐藏在"购物"子菜单 | 提升为底部 Tab 独立入口 |

### 6.3 完整导航树

```
App
├── 🏠 首页 (Home)
│   ├── 身份切换 (个人/商户/开发者)
│   ├── 资产总览卡片
│   ├── 空投发现
│   ├── AutoEarn 入口
│   └── Agent 快捷入口
│
├── 💰 资产 (Assets)
│   ├── 多链余额
│   ├── 交易流水
│   └── 钱包管理
│
├── 📢 推广 (Promote)              ← V3 新增
│   ├── 推广总览 (统计 + 链接 + QR码)
│   ├── 我的链接 (默认链接 + 自定义链接)
│   └── 营销素材
│
├── 🛒 市场 (Market)               ← V3 新增
│   ├── Resources (资源型技能)
│   ├── Skills (逻辑型技能)
│   └── Tasks (任务发布)
│
└── 👤 我的 (Profile)
    ├── 个人资料
    ├── 实名认证 (KYC)             ← V3 从独立Tab移入
    ├── 身份管理 (商户/开发者申请)
    ├── 佣金规则
    ├── 设置
    └── 关于
```

### 6.4 深链接支持

| 深链接 | 目标页面 |
|-------|---------|
| `agentrix://promote` | 推广中心总览 |
| `agentrix://promote/links` | 我的链接 |
| `agentrix://market` | 技能市场 |
| `agentrix://market/resources` | Resources 分类 |
| `agentrix://market/skills` | Skills 分类 |
| `agentrix://market/tasks` | Tasks 分类 |
| `agentrix://market/:id` | 技能详情 |
| `agentrix://profile/kyc` | 实名认证 |

---

## 7. 技术方案更新

### 7.1 新增依赖

| 包 | 版本 | 用途 |
|---|------|-----|
| `qrcode.react` | ^4.2.0 | QR 码 SVG 渲染（推广链接） |
| `expo-sharing` | latest | 原生分享面板（iOS/Android） |
| `expo-clipboard` | latest | 剪贴板复制 |
| `react-native-svg` | latest | SVG 渲染支持（QR 码依赖） |
| `@tanstack/react-query` | ^5.x | 服务端状态管理（链接列表缓存） |

### 7.2 新增项目结构

```
mobile-app/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx            # 首页（不变）
│   │   ├── assets.tsx           # 资产（不变）
│   │   ├── promote.tsx          ← V3 新增：推广中心
│   │   ├── market.tsx           ← V3 新增：技能市场
│   │   └── profile.tsx          # 我的（不变）
│   ├── promote/
│   │   ├── links.tsx            ← 我的链接
│   │   ├── materials.tsx        ← 营销素材
│   │   └── rules.tsx            ← 佣金规则
│   ├── market/
│   │   ├── [id].tsx             ← 技能详情
│   │   └── search.tsx           ← 搜索结果
│   └── profile/
│       └── kyc.tsx              ← KYC（从独立Tab移入）
├── components/
│   ├── promotion/
│   │   ├── StatsCards.tsx       ← 推广统计卡片
│   │   ├── ReferralLinkCard.tsx ← 推广链接+QR码
│   │   ├── LinkListItem.tsx     ← 链接列表项
│   │   ├── QrModal.tsx          ← QR码弹窗
│   │   └── ShareModal.tsx       ← 社交分享弹窗
│   └── marketplace/
│       ├── CategoryTabs.tsx     ← 三分类Tab
│       ├── SkillCard.tsx        ← 技能卡片
│       ├── TaskCard.tsx         ← 任务卡片
│       └── SearchBar.tsx        ← 搜索栏
├── services/
│   ├── referral.api.ts          ← 推广链接 API
│   └── marketplace.api.ts       ← 市场搜索 API
└── hooks/
    ├── useReferralLinks.ts      ← TanStack Query hook
    ├── useReferralStats.ts      ← 推广统计 hook
    └── useMarketplace.ts        ← 市场搜索 hook
```

### 7.3 API 服务层实现

```typescript
// services/referral.api.ts
import { apiClient } from './api';

export const referralApi = {
  // 获取用户专属推广链接
  getMyLink: () => apiClient.get<string>('/referral/link'),

  // 获取推广统计
  getStats: () => apiClient.get<ReferralStats>('/referral/stats'),

  // 创建推广短链
  createLink: (data: { name: string; targetUrl?: string; type?: string }) =>
    apiClient.post<ReferralLink>('/referral/links', data),

  // 获取我的推广链接列表
  getMyLinks: () => apiClient.get<ReferralLink[]>('/referral/links/mine'),

  // 更新链接状态
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/referral/links/${id}/status`, { status }),
};

// services/marketplace.api.ts
import { apiClient } from './api';

export const marketplaceApi = {
  // 搜索技能/资源/任务
  search: (params: UnifiedSearchParams) =>
    apiClient.get<UnifiedSearchResponse>('/unified-marketplace/search', { params }),

  // 获取热门推荐
  getTrending: (limit = 10) =>
    apiClient.get<any[]>('/unified-marketplace/trending', { params: { limit } }),

  // 获取技能详情
  getDetail: (id: string) =>
    apiClient.get<any>(`/unified-marketplace/${id}`),
};
```

### 7.4 TanStack Query Hooks

```typescript
// hooks/useReferralLinks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralApi } from '../services/referral.api';

export function useReferralLinks() {
  return useQuery({
    queryKey: ['referral', 'links'],
    queryFn: referralApi.getMyLinks,
    staleTime: 60_000, // 1分钟缓存
  });
}

export function useReferralStats() {
  return useQuery({
    queryKey: ['referral', 'stats'],
    queryFn: referralApi.getStats,
    staleTime: 30_000, // 30秒缓存
  });
}

export function useCreateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: referralApi.createLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral', 'links'] });
    },
  });
}

// hooks/useMarketplace.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { marketplaceApi } from '../services/marketplace.api';

export function useMarketplaceSearch(params: UnifiedSearchParams) {
  return useInfiniteQuery({
    queryKey: ['marketplace', 'search', params],
    queryFn: ({ pageParam = 0 }) =>
      marketplaceApi.search({ ...params, offset: pageParam }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length * (params.limit || 20) : undefined,
    staleTime: 5 * 60_000, // 5分钟缓存
  });
}
```

### 7.5 离线与缓存策略（V3 补充）

| 数据类型 | 缓存策略 | 过期时间 | 说明 |
|---------|---------|---------|-----|
| 推广链接列表 | Cache-first | 1 分钟 | 链接数据变化频率中等 |
| 推广统计 | Network-first | 30 秒 | 实时性要求较高 |
| 市场搜索结果 | Cache-first | 5 分钟 | 变化频率低 |
| 技能详情 | Cache-first | 10 分钟 | 变化频率低 |
| QR 码 | 本地缓存 | 永久 | URL 不变则 QR 码不变 |

### 7.6 性能目标（V3 补充）

| 指标 | 目标 | 说明 |
|-----|-----|-----|
| QR 码渲染 | < 100ms | SVG 渲染，无网络请求 |
| 推广链接列表加载 | < 500ms | 含缓存命中 |
| 市场搜索响应 | < 800ms | 含网络请求 |
| 分享面板弹出 | < 200ms | 原生分享 API |

---

## 8. 里程碑更新

### Phase 1 - MVP（3 周）— V3 调整

| 周次 | 任务 | V3 变更 |
|-----|-----|---------|
| **W1** | 项目搭建 + OAuth + 统一首页 + 身份切换 | 不变 |
| | 资产总览 + 钱包连接 | 不变 |
| | **底部 Tab 5 项布局（含推广+市场）** | ✅ V3 新增 |
| **W2** | 空投发现 + AutoEarn 入口 | 不变 |
| | **推广中心总览 + 推广链接 + QR 码生成** | ✅ V3 新增 |
| | **我的链接列表 + 默认链接自动生成** | ✅ V3 新增 |
| **W3** | 商户分佣列表 + 结算列表 | 不变 |
| | **技能市场三分类浏览 + 搜索** | ✅ V3 新增 |
| | 开发者预算池 + 里程碑 | 不变 |

### Phase 2 - 增强（3 周）— V3 调整

| 周次 | 任务 | V3 变更 |
|-----|-----|---------|
| W4 | Agent 对话 + 任务创建 | 不变 |
| W5 | AutoEarn 策略 + 通知推送 | 不变 |
| | **推广链接详情 + 转化漏斗 + 营销海报生成** | ✅ V3 新增 |
| W6 | 商户结算详情 + 开发者里程碑提交 | 不变 |
| | **ARN 协议可视化（Treasury + Fee Splitter）** | ✅ V3 新增 |
| | **技能市场 Playground 试用** | ✅ V3 新增 |

### Phase 3 - 扩展（4 周）— V3 调整

| 周次 | 任务 | V3 变更 |
|-----|-----|---------|
| W7-8 | 任务市场接单 + 社交分享 | 不变 |
| | **技能市场社交操作（分享/评价/打赏）** | ✅ V3 新增 |
| W9-10 | WalletConnect + 多语言 + 报表 | 不变 |
| | **ARN 链上交易记录 + 佣金结算明细导出** | ✅ V3 新增 |
| | **裂变活动系统（限时提高佣金比例）** | ✅ V3 新增 |

### MVP 核心功能清单（V3 更新）

| 身份 | MVP 功能 |
|-----|---------|
| 个人 | ✅ 资产总览、✅ 钱包连接、✅ 空投发现、✅ 一键领取、✅ AutoEarn 入口 |
| 个人 | ✅ **推广中心总览**、✅ **推广链接+QR码**、✅ **社交分享**、✅ **佣金统计** |
| 个人 | ✅ **技能市场三分类浏览**、✅ **搜索**、✅ **技能详情** |
| 商户 | ✅ 分佣计划列表、✅ 分佣预览、✅ 快速收款、✅ 结算账本列表 |
| 开发者 | ✅ 预算池列表、✅ 里程碑列表、✅ 收益总览、✅ 接单列表 |
| 通用 | ✅ 身份切换、✅ 身份激活申请、✅ OAuth 登录、✅ 环境切换 |

---

## 9. 新增 KPIs

### 9.1 推广中心指标

| 指标 | MVP 目标 (1个月) | 3 个月目标 |
|-----|-----------------|-----------|
| 推广链接生成数 | 5,000 | 50,000 |
| 推广链接点击数 | 20,000 | 200,000 |
| 推广转化率（点击→注册） | 5% | 8% |
| 推广佣金总额 | $5,000 | $50,000 |
| 移动端分享占比 | 60% | 70% |

### 9.2 技能市场指标

| 指标 | MVP 目标 (1个月) | 3 个月目标 |
|-----|-----------------|-----------|
| 市场浏览 DAU | 500 | 3,000 |
| 技能搜索次数/日 | 1,000 | 8,000 |
| 技能购买转化率 | 3% | 6% |
| 任务浏览→接单率 | 5% | 10% |

### 9.3 推广裂变漏斗

```
推广链接生成: 5,000
       ↓
链接点击: 20,000 (人均分享触达 4 人)
       ↓
注册转化: 1,000 (5%)
       ↓
首次交易: 200 (1%)
       ↓
持续活跃(30天): 100 (0.5%)
       ↓
成为推广者: 30 (0.15%) ← 裂变循环
```

### 9.4 北极星指标更新

V2 北极星：**AUM（用户资产管理规模）** — $500 万 (3个月)

V3 新增辅助北极星：**推广裂变系数 K** — 目标 K > 1.2
> K = 每个推广者平均带来的新推广者数量。K > 1 意味着自增长。

---

## 10. 风险补充

| 风险 | 影响 | 概率 | 应对措施 |
|-----|-----|-----|---------|
| QR 码在低端设备渲染慢 | 🟡 中 | 低 | 使用 SVG 渲染 + 缓存生成结果 |
| 推广链接被滥用（刷量） | 🔴 高 | 中 | IP 频率限制 + 设备指纹 + 异常检测 + 链接状态管理 |
| 市场数据量大导致列表卡顿 | 🟡 中 | 中 | FlashList + 分页加载 + 图片懒加载 |
| 社交平台分享 API 变更 | 🟡 中 | 低 | 使用 expo-sharing 原生分享 + 降级为复制链接 |
| 5 Tab 底栏在小屏设备拥挤 | 🟡 中 | 中 | 响应式图标大小 + 可选"更多"折叠 |
| 推广佣金计算与 Web 端不一致 | 🔴 高 | 低 | 共用后端 API 计算，移动端仅展示 |

---

## 11. 与 Web 端功能对照

| 功能 | Web 端组件 | 移动端对应 | 状态 |
|-----|-----------|-----------|-----|
| 推广中心 | `PromotionPanel.tsx` | `app/(tabs)/promote.tsx` | V3 新增 |
| 推广链接 QR 码 | `QRCodeSVG` (qrcode.react) | 同库复用 | V3 新增 |
| 默认推广链接 | `PromotionPanel` 自动生成 3 条 | 同逻辑复用 | V3 新增 |
| 社交分享 | `SHARE_CHANNELS` (Twitter/TG/WeChat) | expo-sharing + 同渠道 | V3 新增 |
| 佣金规则展示 | `PromotionPanel` rules Tab | `promote/rules.tsx` | V3 新增 |
| 技能市场 | `MarketplaceView.tsx` | `app/(tabs)/market.tsx` | V3 新增 |
| 三分类浏览 | Resources/Skills/Tasks Tab | 同结构复用 | V3 新增 |
| 市场搜索 | `unifiedMarketplaceApi.search` | `marketplaceApi.search` | V3 新增 |
| KYC 入口 | 控制台左栏 `dashboard:kyc` | `profile/kyc.tsx` | V3 调整 |
| 推广中心入口 | L1 顶部导航 `promotion` Tab | 底部 Tab `📢 推广` | V3 调整 |

### 数据互通保证

| 维度 | 说明 |
|-----|-----|
| **API 共用** | App 与 Web 共用同一套后端 API（backend 3001 端口） |
| **推广链接同步** | Web 端创建的推广链接在 App 端实时可见（反之亦然） |
| **佣金数据一致** | 佣金计算由后端统一处理，App/Web 仅展示 |
| **QR 码一致** | 同一链接在 App/Web 生成的 QR 码完全相同（同库 qrcode.react） |
| **身份状态同步** | Web 端激活的身份/KYC 状态在 App 自动生效 |

---

## 12. 审批与签署

| 角色 | 姓名 | 日期 | 签署 |
|-----|-----|-----|-----|
| 产品负责人 | | | ☐ |
| 技术负责人 | | | ☐ |
| 设计负责人 | | | ☐ |
| 移动端负责人 | | | ☐ |

---

## 附录 A: V3 新增接口汇总

| 接口 | 方法 | 模块 | MVP |
|-----|-----|-----|-----|
| `/referral/link` | GET | 推广中心 | ✅ |
| `/referral/stats` | GET | 推广中心 | ✅ |
| `/referral/links` | POST | 推广中心 | ✅ |
| `/referral/links/mine` | GET | 推广中心 | ✅ |
| `/referral/links/:id/stats` | GET | 推广中心 | ✅ |
| `/referral/links/:id/status` | PATCH | 推广中心 | ✅ |
| `/r/:shortCode` | GET | 短链重定向 | ✅ |
| `/unified-marketplace/search` | GET | 技能市场 | ✅ |
| `/unified-marketplace/trending` | GET | 技能市场 | ✅ |
| `/unified-marketplace/:id` | GET | 技能市场 | ✅ |

## 附录 B: 设计规范补充

### 推广中心配色

| 元素 | 颜色 | 用途 |
|-----|-----|-----|
| 推广主色 | `#3B82F6` (blue-500) | 推广链接卡片、CTA 按钮 |
| 佣金高亮 | `#F59E0B` (amber-500) | 佣金金额、推广者奖励 |
| 转化成功 | `#10B981` (emerald-500) | 转化数、成功状态 |
| QR 码前景 | `#1E293B` (slate-800) | QR 码深色部分 |
| QR 码背景 | `#FFFFFF` | QR 码白色背景 |

### 技能市场配色

| 元素 | 颜色 | 用途 |
|-----|-----|-----|
| Resources Tab | `#8B5CF6` (violet-500) | 资源分类标识 |
| Skills Tab | `#06B6D4` (cyan-500) | 技能分类标识 |
| Tasks Tab | `#F97316` (orange-500) | 任务分类标识 |
| 评分星标 | `#FBBF24` (amber-400) | 技能评分 |
| 价格标签 | `#10B981` (emerald-500) | 价格显示 |
