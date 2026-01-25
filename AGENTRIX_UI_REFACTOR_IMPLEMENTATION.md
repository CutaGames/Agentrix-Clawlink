# 🎯 Agentrix 工作台 UI 重构 - 实施指南

## 📋 现状与目标

### 当前问题
1. **标签混乱**: `checklist`, `wallets`, `orders`, `airdrops` 等标签分散，缺乏逻辑分组
2. **功能重复**: `订单跟踪`、`空投发现` 等应该整合到更大的模块中
3. **缺失功能**: 设计文档中的 `智能购物`、`资产总览图表` 等未实现

### 目标架构
```
个人工作台 (9个主标签)
├─ Dashboard      → 整合 checklist + 快捷入口
├─ Agents         → 保留 MyAgentsPanel
├─ Skills         → 保留 SkillManagementPanel + 新增市场/工厂
├─ Auto-Earn      → 整合 AutoEarnPanel + AirdropDiscovery
├─ Shopping 🆕    → 新增: 订单 + 商品搜索 + 物流
├─ Assets         → 整合 wallets + 法币 + 资产总览
├─ Payments       → 整合 payments + subscriptions
├─ Security       → 整合 security + policies
└─ Profile        → 整合 profile + kyc + 社交绑定
```

---

## 🛠️ 实施策略：增量重构

### Phase 1: 标签栏重构 (已完成 ✅)
- [x] 更新 `activeTab` 类型定义
- [x] 添加图标到标签
- [x] 调整标签顺序和命名

### Phase 2: 内容区域映射 (进行中 🔄)

#### 2.1 Dashboard (原 checklist)
**保留**: 授权向导、进度条、快捷操作
**新增**: 
- 收益概览卡片 (调用 Auto-Earn 数据)
- 活跃 Agent 数量卡片
- 最近支付记录 (Top 3)

#### 2.2 Agents (保持不变)
直接渲染 `<MyAgentsPanel />`

#### 2.3 Skills (增强)
添加二级标签:
- "已安装技能" → 现有 SkillManagementPanel
- "技能市场" → 调用 SkillMarketplace
- "开发者工具" → 跳转到 DeveloperModule 的 Factory

#### 2.4 Auto-Earn (整合)
添加二级标签:
- "策略管理" → AutoEarnPanel
- "空投猎手" → AirdropDiscovery
- "收益统计" → 新增图表组件

#### 2.5 Shopping (新增 🆕)
创建 `SmartShoppingPanel`:
```tsx
- "商品搜索" → 调用 search_products Skill
- "订单管理" → 原 orders 标签内容
- "物流追踪" → 集成物流 API
```

#### 2.6 Assets (整合)
添加二级标签:
- "钱包管理" → 原 wallets 内容
- "法币账户" → 新增银行卡绑定
- "入金出金" → 集成 Transak
- "资产总览" → 调用 asset_overview Skill

#### 2.7 Payments (整合)
添加二级标签:
- "支付历史" → 原 payments 内容
- "订阅管理" → 原 subscriptions 内容
- "账单分析" → 新增图表

#### 2.8 Security (整合)
添加二级标签:
- "Agent 授权" → QuickPay Grant 管理
- "Session 管理" → 原 security 内容
- "安全审计" → 原 policies 内容

#### 2.9 Profile (增强)
添加二级标签:
- "基本信息" → 原 profile 内容
- "KYC 认证" → 原 kyc 内容
- "社交绑定" → 新增 Twitter/Discord/Telegram
- "偏好设置" → 新增语言/货币/通知

---

## 📝 代码改动清单

### 文件: `frontend/components/agent/workspace/UserModule.tsx`

#### 改动 1: 更新内容区域渲染逻辑
```tsx
// 当前 (370-1000 行)
{activeTab === 'checklist' && ...}
{activeTab === 'agents' && ...}
{activeTab === 'skills' && ...}
// ... 13 个独立标签

// 目标 (简化为 9 个主标签 + 二级标签)
{activeTab === 'dashboard' && <DashboardView />}
{activeTab === 'agents' && <MyAgentsPanel />}
{activeTab === 'skills' && (
  <SkillsView 
    activeSubTab={activeSubTab} 
    onSubTabChange={setActiveSubTab} 
  />
)}
// ... 其他标签
```

#### 改动 2: 创建子组件
- `components/agent/workspace/views/DashboardView.tsx`
- `components/agent/workspace/views/SkillsView.tsx` (含二级导航)
- `components/agent/workspace/views/AutoEarnView.tsx` (含二级导航)
- `components/agent/workspace/views/SmartShoppingView.tsx` 🆕
- `components/agent/workspace/views/AssetsView.tsx` (含二级导航)
- `components/agent/workspace/views/PaymentsView.tsx` (含二级导航)
- `components/agent/workspace/views/SecurityView.tsx` (含二级导航)
- `components/agent/workspace/views/ProfileView.tsx` (含二级导航)

---

## ✅ 验证步骤

### 前端编译
```bash
cd frontend && npm run build
```

### 后端编译
```bash
cd backend && npm run build
```

### 功能测试
1. 切换所有主标签,确保无白屏
2. 在有二级标签的模块中切换子标签
3. 验证所有现有功能可访问 (如 Agent 列表、钱包管理等)
4. 检查路由跳转 (如从 Dashboard 快捷按钮跳转到 Agents)

---

## 🎨 UI 一致性规范

### 主标签栏
- 高度: `py-3`
- 字体: `text-sm font-medium`
- 图标大小: `w-4 h-4`
- 激活态: `border-b-2 border-blue-500 text-blue-400`

### 二级标签栏
- 高度: `py-2`
- 字体: `text-xs font-medium`
- 激活态: `bg-blue-600/20 text-blue-400`

### 内容卡片
- 背景: `bg-white/5`
- 边框: `border border-white/10`
- 圆角: `rounded-xl`
- 内边距: `p-5`

---

## 📦 商户/开发者模块保留清单

### MerchantModule (无改动)
所有现有标签和功能完全保留:
- 开发进度、商品管理、订单、结算、API Keys、Webhooks、批量导入、电商同步、MPC 钱包、技能发布

### DeveloperModule (无改动)
所有现有标签和功能完全保留:
- 开发进度、API 统计、收益中心、Agent 管理、技能工厂、沙盒、技能包、Webhooks、日志、推广

---

## 🚀 下一步行动

1. **创建 Views 文件夹**: `frontend/components/agent/workspace/views/`
2. **逐个实现 View 组件**: 从 DashboardView 开始,复用现有代码
3. **更新 UserModule 主文件**: 替换内容区域渲染逻辑
4. **测试验证**: 确保所有功能可访问
5. **优化与润色**: 统一样式、添加动画、完善交互
