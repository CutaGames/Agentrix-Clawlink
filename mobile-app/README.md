# Agentrix Mobile App — MVP

React Native (Expo SDK 52) 移动端，聚焦 **技能市场** + **社交推广** 两大核心模块。

## 功能模块

### 市场 (Tab 1)
- 三分类浏览：资源 / 技能 / 任务
- 搜索 + 子筛选 + 下拉刷新 + 分页
- 技能卡片：⭐评分、👍点赞、🔥使用人数、🤖Agent 标识
- 技能详情：描述、标签、评价区、购买 + 推广 CTA

### 推广 (Tab 2)
- 今日数据 + 累计佣金 + 待结算
- 专属推广链接 + QR 码
- 热门技能一键推广
- ShareSheet 分享面板（微信/TG/X/WhatsApp）
- 推广链接管理（创建/暂停/恢复/归档）

### 我的 (Tab 3)
- 用户信息 + 佣金快捷统计
- 卖家看板（我的技能 + 收入/调用统计）
- 我的订单 / 收藏 / 佣金规则
- Agent 入口（预留，即将上线）

## 快速开始

```bash
# 安装依赖
npm install --legacy-peer-deps

# 启动 Expo 开发服务器
npx expo start

# WSL 环境使用 tunnel 模式
npx expo start --tunnel
```

用 Expo Go 扫码即可在真机上运行。

## 编译检查

```bash
npx tsc --noEmit
```

## 技术栈

- **框架**: React Native 0.76 + Expo SDK 52
- **导航**: React Navigation 7 (Bottom Tabs + Native Stack)
- **状态**: Zustand 5 + React Query 5
- **QR 码**: react-native-qrcode-svg
- **分享**: expo-sharing + expo-clipboard

## 项目结构

```
src/
├── components/
│   ├── market/        # SkillCard, CategoryTabs
│   ├── common/        # QrCode
│   └── promote/       # ShareSheet
├── screens/           # 12 个 MVP 屏幕
├── services/          # marketplace, referral, seller API + Mock
├── stores/            # identityStore, settingsStore
└── theme/             # colors
```

## 测试

- **自动化**: `TEST_REPORT.md` — 14 项编译+代码验证全部通过
- **手动**: `TEST_PLAN.md` — 10 项真机测试用例，含详细步骤

## 配置
Update API base URL in `src/services/api.ts`.
