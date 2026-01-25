# 🎯 Agentrix 工作台 UI 重构实施方案

## 📊 当前状态分析

### 现有 UserModule 标签页
```
当前实现：
├─ 控制面板 (Dashboard/Checklist)
├─ Agent 中心
├─ 技能中心
├─ 支付账单
├─ 资产管理 (Wallets)
├─ 订单跟踪
├─ 空投发现
├─ 自动赚币 (Auto-Earn)
├─ 安全策略
└─ 个人资料
```

### 目标 UI 设计 (V2.0)
```
个人 Agent 工作台
├─ 🏠 控制台 (Dashboard)
│   └─ 概览：收益、活跃 Agent、授权状态、快捷入口
│
├─ 🤖 Agent 中心
│   ├─ 我的 Agent (管理、部署、分享)
│   └─ Agent 市场 (发现与安装)
│
├─ 🧰 技能中心 (Skill Center) ⭐ 核心重构
│   ├─ 技能市场 (浏览所有原子能力：支付、DeFi、电商等)
│   ├─ 已安装技能 (配置与管理)
│   └─ 开发者工具 (创建与发布 Skill)
│
├─ 📊 自动赚钱 (Auto-Earn)
│   ├─ 策略管理 (DCA、网格、套利)
│   ├─ 空投猎手 (发现与领取)
│   └─ 收益统计
│
├─ 🛒 智能购物 (Smart Shopping)
│   ├─ 商品搜索与比价
│   ├─ 订单管理
│   └─ 物流追踪
│
├─ 💼 资产管理 (Assets)
│   ├─ 钱包管理 (多链、MPC 钱包)
│   ├─ 法币账户 (银行卡、余额)
│   ├─ 入金/出金 (Onramp/Offramp)
│   └─ 资产总览
│
├─ 💳 支付与账单
│   ├─ 支付历史
│   ├─ 账单分析 (图表化)
│   └─ 自动扣费/订阅管理
│
├─ 🛡️ 策略与安全
│   ├─ Agent 授权 (QuickPay 额度、有效期)
│   ├─ Session 管理
│   └─ 安全审计
│
└─ 👤 个人资料
    ├─ 社交账号绑定 (Twitter, Discord, Telegram)
    ├─ KYC 认证
    └─ 偏好设置
```

---

## 🔄 重构映射与整合方案

### 1. 控制台 (Dashboard)
**现有功能**: Checklist (授权向导)
**新增功能**:
- 收益概览卡片 (来自 Auto-Earn)
- 活跃 Agent 数量 (来自 Agent 中心)
- 授权状态进度条 (保留现有)
- 快捷操作按钮 (新增: 快速授权、购买技能、查看订单)

### 2. Agent 中心
**现有功能**: MyAgentsPanel
**新增二级导航**:
- "我的 Agent" 标签: 现有的 Agent 列表
- "Agent 市场" 标签: 新增，类似 SkillMarketplace 的逻辑

### 3. 技能中心 (核心重构)
**现有功能**: SkillManagementPanel
**新增二级导航**:
- "技能市场" 标签: 浏览所有已发布的 Skill
- "已安装技能" 标签: 当前用户已安装/启用的 Skill
- "开发者工具" 标签: 集成 SkillFactory (创建 Skill)

### 4. 自动赚钱 (Auto-Earn)
**现有功能**: AutoEarnPanel + AirdropDiscovery
**整合方案**:
- 将现有的 AutoEarnPanel 内容作为"策略管理"子标签
- AirdropDiscovery 作为"空投猎手"子标签
- 新增"收益统计"子标签 (图表化展示)

### 5. 智能购物 (Smart Shopping) 🆕
**整合现有**:
- "订单管理": 现有的 Orders 标签内容
- "商品搜索与比价": 新增，调用 search_products Skill
- "物流追踪": 新增，集成物流追踪 API

### 6. 资产管理 (Assets)
**现有功能**: Wallets 标签
**扩展方案**:
- "钱包管理": 现有的钱包列表 + 连接按钮
- "法币账户": 新增，银行卡绑定 (集成 Transak)
- "入金/出金": 新增，集成 Onramp/Offramp
- "资产总览": 新增，调用 asset_overview Skill (饼图)

### 7. 支付与账单
**现有功能**: Payments 标签
**扩展方案**:
- "支付历史": 现有内容
- "账单分析": 新增，图表化展示支出分布
- "自动扣费/订阅管理": 现有的 Subscriptions 标签整合进来

### 8. 策略与安全
**现有功能**: Security 标签 + Policies 标签
**整合方案**:
- "Agent 授权": QuickPay Grant 管理
- "Session 管理": 现有的 Session 列表
- "安全审计": Policies (PolicyEngine)

### 9. 个人资料
**现有功能**: Profile 标签
**扩展方案**:
- "社交账号绑定": 新增 Twitter/Discord/Telegram OAuth
- "KYC 认证": 现有的 KYC 内容
- "偏好设置": 新增 (语言、货币、通知)

---

## 🛠️ 实施步骤

### Phase 1: 重构 UserModule 标签结构
- [ ] 更新 `activeTab` 类型定义，支持二级标签
- [ ] 重新设计顶部标签栏，使用图标 + 文字
- [ ] 实现二级标签页切换逻辑

### Phase 2: Dashboard 增强
- [ ] 添加收益卡片 (集成 Auto-Earn 数据)
- [ ] 添加 Agent 数量卡片 (集成 MyAgentsPanel 数据)
- [ ] 优化授权向导的 UI

### Phase 3: Skill Center 重构
- [ ] 创建 SkillMarketplace 子组件
- [ ] 创建 InstalledSkills 子组件
- [ ] 集成 SkillFactory 作为"开发者工具"

### Phase 4: Smart Shopping 模块
- [ ] 创建 SmartShoppingPanel 组件
- [ ] 实现商品搜索与比价 UI
- [ ] 整合现有 Orders 内容

### Phase 5: 资产管理增强
- [ ] 添加法币账户模块
- [ ] 实现 Onramp/Offramp 流程
- [ ] 集成 asset_overview Skill 图表

### Phase 6: 支付账单优化
- [ ] 实现账单分析图表
- [ ] 整合 Subscriptions 内容

### Phase 7: 个人资料增强
- [ ] 添加社交账号绑定 UI
- [ ] 实现偏好设置页面

---

## 📦 保留现有功能清单

### 商户模块 (Merchant)
✅ **保留全部功能**:
- 商品管理 (Products)
- 订单管理 (Orders)
- 财务结算 (Finance)
- KYC 认证
- API Keys & Webhooks
- 批量导入 (Batch Import)
- 电商同步 (Ecommerce Sync)
- MPC 钱包
- 技能发布 (Skills) ✨ 已实现

### 开发者模块 (Developer)
✅ **保留全部功能**:
- API 统计 (API Stats)
- 收益中心 (Revenue)
- Agent 管理 (Agents)
- 技能工厂 (Skill Factory) ✨ 已实现
- 技能沙盒 (Sandbox) ✨ 已实现
- 技能包管理 (Packs)
- Webhooks
- 错误日志 (Logs)
- 推广系统 (Promotion)

---

## 🎨 UI 设计原则

1. **一致性**: 所有模块使用统一的卡片样式和配色方案
2. **层次感**: 主标签 → 二级标签 → 内容区域，层层递进
3. **可发现性**: 关键功能使用醒目的 CTA 按钮
4. **响应式**: 支持移动端和桌面端自适应

---

## ✅ 验证清单

- [ ] 前端编译通过 (`npm run build`)
- [ ] 后端编译通过 (`npm run build`)
- [ ] 所有现有功能可正常访问
- [ ] 新增功能 UI 符合设计规范
- [ ] 路由跳转逻辑正确
- [ ] 无 TypeScript 类型错误
