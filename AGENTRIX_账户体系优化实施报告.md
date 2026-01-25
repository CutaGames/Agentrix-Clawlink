# Agentrix 账户体系优化实施报告

## 一、优化概述

根据诊断报告的优先级建议，已完成以下核心优化：

| 优先级 | 问题描述 | 实施状态 |
|--------|----------|----------|
| P0 | AI Agent 缺乏独立账户体系 | ✅ 已完成 |
| P0 | 钱包/资金系统碎片化 | ✅ 已完成 |
| P1 | KYC 系统不完整 | ✅ 已完成 |
| P2 | 缺少账户冻结/风险状态 | ✅ 已完成 |
| P1 | Authorization 和 AutoPayGrant 合并 | ✅ 已完成 (2026-01-17) |
| P1 | Workspace 多租户支持 | ✅ 已完成 (2026-01-17) |
| P2 | 身份标识清理 (paymindId→agentrixId) | ✅ 已完成 (之前已处理) |
| P2 | 交易限额检查集成 | ✅ 已完成 (2026-01-17) |

---

## 二、新增实体

### 1. AgentAccount（AI Agent 独立账户）

**文件**: `backend/src/entities/agent-account.entity.ts`

**核心特性**：
- 独立的 `agentUniqueId` 作为生态标识
- 信用评分系统（0-1000 分）
- 风险等级分类（低/中/高/危险）
- 支出限额控制（单笔/日/月）
- 链上注册支持（EAS Attestation）
- 多种 Agent 类型（个人/商户/平台/第三方）

**数据表**: `agent_accounts`

```typescript
export enum AgentAccountStatus {
  DRAFT = 'draft',       // 草稿
  ACTIVE = 'active',     // 活跃
  SUSPENDED = 'suspended', // 暂停
  REVOKED = 'revoked',   // 撤销
}

export enum AgentType {
  PERSONAL = 'personal',     // 用户私有 Agent
  MERCHANT = 'merchant',     // 商户 Agent
  PLATFORM = 'platform',     // 平台内置 Agent
  THIRD_PARTY = 'third_party', // 第三方 Agent
}
```

### 2. Account（统一资金账户）

**文件**: `backend/src/entities/account.entity.ts`

**核心特性**：
- 统一管理所有实体类型的资金（用户/Agent/商户/平台）
- 支持托管/非托管/虚拟钱包类型
- 多链支持（EVM/Solana/Bitcoin/Multi）
- 多币种余额管理
- 冻结余额分离
- 交易限额配置

**数据表**: `accounts`

```typescript
export enum AccountOwnerType {
  USER = 'user',
  AGENT = 'agent',
  MERCHANT = 'merchant',
  PLATFORM = 'platform',
}

export enum AccountWalletType {
  CUSTODIAL = 'custodial',       // 托管钱包
  NON_CUSTODIAL = 'non_custodial', // 非托管钱包
  VIRTUAL = 'virtual',           // 虚拟账户
}
```

### 3. KYCRecord（KYC 认证记录）

**文件**: `backend/src/entities/kyc-record.entity.ts`

**核心特性**：
- 四级认证体系（基础/标准/高级/企业）
- 完整的审核流程（待审/审核中/通过/拒绝）
- 证件文档管理
- 认证有效期管理
- AML 风险评分
- 制裁检查结果存储

**数据表**: `kyc_records`

```typescript
export enum KYCRecordLevel {
  BASIC = 'basic',       // 基础认证
  STANDARD = 'standard', // 标准认证
  ADVANCED = 'advanced', // 高级认证
  ENTERPRISE = 'enterprise', // 企业认证
}
```

### 4. DeveloperAccount（开发者账户）

**文件**: `backend/src/entities/developer-account.entity.ts`

**核心特性**：
- 全局唯一开发者标识 (DEV-{timestamp}-{random})
- 四级等级体系（入门/专业/企业/合作伙伴）
- API Key 数量和速率限制管理
- SDK 访问权限控制
- 收益分成配置（70%-85%）
- API 调用统计（日/月/累计）
- Webhook 和 OAuth 集成支持
- 开发者协议签署追踪
- KYC 认证状态

**数据表**: `developer_accounts`

```typescript
export enum DeveloperAccountStatus {
  PENDING = 'pending',       // 待审核
  ACTIVE = 'active',         // 活跃
  SUSPENDED = 'suspended',   // 暂停
  REVOKED = 'revoked',       // 撤销
  BANNED = 'banned',         // 封禁
}

export enum DeveloperTier {
  STARTER = 'starter',           // 入门级
  PROFESSIONAL = 'professional', // 专业级
  ENTERPRISE = 'enterprise',     // 企业级
  PARTNER = 'partner',           // 合作伙伴
}

export enum DeveloperType {
  INDIVIDUAL = 'individual',   // 个人开发者
  TEAM = 'team',               // 团队
  COMPANY = 'company',         // 公司
  AGENCY = 'agency',           // 代理商
}
```

**等级权益配置**：

| 等级 | API Keys | 速率限制 | 日请求数 | 收益分成 |
|------|----------|----------|----------|----------|
| Starter | 3 | 100/min | 10,000 | 70% |
| Professional | 10 | 500/min | 100,000 | 75% |
| Enterprise | 50 | 2,000/min | 1,000,000 | 80% |
| Partner | 100 | 5,000/min | 无限 | 85% |

---

## 三、新增服务模块

### 1. AgentAccountModule

**文件位置**: `backend/src/modules/agent-account/`

**API 端点**:

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/agent-accounts` | 创建 Agent 账户 |
| GET | `/api/agent-accounts` | 获取我的 Agent 列表 |
| GET | `/api/agent-accounts/:id` | 获取 Agent 详情 |
| PUT | `/api/agent-accounts/:id` | 更新 Agent 账户 |
| POST | `/api/agent-accounts/:id/activate` | 激活 Agent |
| POST | `/api/agent-accounts/:id/suspend` | 暂停 Agent |
| POST | `/api/agent-accounts/:id/resume` | 恢复 Agent |
| POST | `/api/agent-accounts/:id/credit-score` | 更新信用评分 |
| GET | `/api/agent-accounts/:id/check-spending` | 检查支出限额 |
| POST | `/api/agent-accounts/:id/link-wallet` | 关联外部钱包 |

### 2. AccountModule

**文件位置**: `backend/src/modules/account/`

**API 端点**:

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/accounts` | 创建资金账户 |
| GET | `/api/accounts/my` | 获取我的账户列表 |
| GET | `/api/accounts/:id` | 获取账户详情 |
| GET | `/api/accounts/:id/balance` | 查询余额 |
| POST | `/api/accounts/:id/deposit` | 充值 |
| POST | `/api/accounts/:id/withdraw` | 提现 |
| POST | `/api/accounts/transfer` | 转账 |
| POST | `/api/accounts/:id/freeze-balance` | 冻结余额 |
| POST | `/api/accounts/:id/unfreeze-balance` | 解冻余额 |
| POST | `/api/accounts/:id/freeze` | 冻结账户 |
| POST | `/api/accounts/:id/unfreeze` | 解冻账户 |

### 3. KYCModule

**文件位置**: `backend/src/modules/kyc/`

**API 端点**:

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/kyc/submit` | 提交 KYC 申请 |
| GET | `/api/kyc/my` | 获取我的 KYC 记录 |
| GET | `/api/kyc/my/active` | 获取有效 KYC 认证 |
| GET | `/api/kyc/check/:level` | 检查 KYC 级别 |
| POST | `/api/kyc/:id/additional-info` | 提交补充材料 |
| POST | `/api/kyc/:id/cancel` | 取消申请 |
| GET | `/api/kyc/admin/pending` | 获取待审核列表 |
| POST | `/api/kyc/admin/:id/complete-review` | 完成审核 |

### 4. DeveloperAccountModule

**文件位置**: `backend/src/modules/developer-account/`

**API 端点**:

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/developer-accounts` | 创建开发者账户 |
| GET | `/api/developer-accounts/my` | 获取我的开发者账户 |
| GET | `/api/developer-accounts/dashboard` | 获取开发者仪表盘 |
| GET | `/api/developer-accounts/:id` | 获取开发者账户详情 |
| PUT | `/api/developer-accounts/:id` | 更新开发者账户 |
| POST | `/api/developer-accounts/:id/sign-agreement` | 签署开发者协议 |
| GET | `/api/developer-accounts/:id/api-key-limit` | 检查 API Key 限额 |
| GET | `/api/developer-accounts/:id/rate-limit` | 检查请求限额 |
| GET | `/api/developer-accounts` | 获取开发者列表（管理员） |
| POST | `/api/developer-accounts/:id/approve` | 审核通过（管理员） |
| POST | `/api/developer-accounts/:id/reject` | 审核拒绝（管理员） |
| POST | `/api/developer-accounts/:id/suspend` | 暂停账户（管理员） |
| POST | `/api/developer-accounts/:id/resume` | 恢复账户（管理员） |
| POST | `/api/developer-accounts/:id/upgrade-tier` | 升级等级（管理员） |

---

## 四、User 实体增强

**修改文件**: `backend/src/entities/user.entity.ts`

**新增字段**:

```typescript
export enum UserStatus {
  ACTIVE = 'active',       // 正常
  PENDING = 'pending',     // 待激活
  SUSPENDED = 'suspended', // 暂停
  FROZEN = 'frozen',       // 冻结
  CLOSED = 'closed',       // 已关闭
  BANNED = 'banned',       // 封禁
}

// 新增字段
status: UserStatus;          // 账户状态
statusReason?: string;       // 状态原因
statusUpdatedAt?: Date;      // 状态更新时间
lastActiveAt?: Date;         // 最后活跃时间
defaultAccountId?: string;   // 默认资金账户 ID
```

---

## 五、数据库迁移

**迁移文件**: `backend/src/migrations/1774200000000-AccountSystemOptimization.ts`

**执行状态**: ✅ 已成功执行

**创建内容**:
- 11 个枚举类型
- 3 个新数据表（agent_accounts, accounts, kyc_records）
- users 表新增 5 个字段
- 相关索引

---

## 六、架构图

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Agentrix 账户体系架构 V2                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │    User     │   │AgentAccount │   │ Developer   │   │  Merchant   │     │
│  │   用户账户   │   │  Agent账户  │   │  开发者账户  │   │   商户账户   │     │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘     │
│         │                 │                 │                 │             │
│         └─────────────────┴─────────────────┴─────────────────┘             │
│                                    │                                         │
│                                    ▼                                         │
│                 ┌─────────────────────────────────┐                         │
│                 │            Account              │                         │
│                 │         统一资金账户             │                         │
│                 │  ─────────────────────────────  │                         │
│                 │  • 多所有者类型支持              │                         │
│                 │  • 多币种余额管理                │                         │
│                 │  • 托管/非托管钱包               │                         │
│                 │  • 充值/提现/转账                │                         │
│                 └─────────────────────────────────┘                         │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          辅助系统                                      │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐          │  │
│  │  │ KYCRecord │  │Authorization│ │  ApiKey   │  │ MPCWallet │          │  │
│  │  │  KYC认证  │  │   授权管理  │  │  API密钥  │  │  MPC钱包  │          │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ═════════════════════════════ 账户类型说明 ═════════════════════════════   │
│                                                                              │
│  • User: 普通用户，消费者身份，可升级为其他角色                              │
│  • AgentAccount: AI Agent 独立经济账户，有信用评分和支出限额                 │
│  • DeveloperAccount: 开发者账户，管理 API/SDK 访问，收益分成                 │
│  • MerchantProfile: 商户账户，商品管理和订单处理                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 七、后续优化建议

### 待实施（P1-P2）

1. **权限系统升级**
   - 从 RBAC 升级到 ABAC
   - 支持细粒度资源级别权限

2. **社交账户合并**
   - 考虑将 User.socialAccounts JSON 迁移到 SocialAccount 表
   - 统一登录凭证管理

3. **授权实体合并**
   - 合并 Authorization 和 AutoPayGrant
   - 统一授权管理接口

4. **Workspace 多租户**
   - 添加 Workspace 实体
   - 支持团队协作

5. **身份标识清理**
   - 数据迁移：paymindId → agentrixId
   - API 版本升级

### 使用建议

1. **创建 Agent 时自动创建资金账户**
   - AgentAccountService.create() 已包含此逻辑

2. **用户注册后创建默认账户**
   - 可在用户注册流程中调用 AccountService.createUserDefaultAccount()

3. **交易前检查 Agent 限额**
   - 调用 AgentAccountService.checkSpendingLimit()

4. **KYC 级别检查**
   - 敏感操作前调用 KYCService.checkKYCLevel()

---

## 八、文件清单

### 新增文件

| 文件 | 描述 |
|------|------|
| `backend/src/entities/agent-account.entity.ts` | Agent 账户实体 |
| `backend/src/entities/account.entity.ts` | 统一资金账户实体 |
| `backend/src/entities/kyc-record.entity.ts` | KYC 认证实体 |
| `backend/src/entities/developer-account.entity.ts` | 开发者账户实体 |
| `backend/src/modules/agent-account/agent-account.module.ts` | Agent 账户模块 |
| `backend/src/modules/agent-account/agent-account.service.ts` | Agent 账户服务 |
| `backend/src/modules/agent-account/agent-account.controller.ts` | Agent 账户控制器 |
| `backend/src/modules/account/account.module.ts` | 资金账户模块 |
| `backend/src/modules/account/account.service.ts` | 资金账户服务 |
| `backend/src/modules/account/account.controller.ts` | 资金账户控制器 |
| `backend/src/modules/kyc/kyc.module.ts` | KYC 模块 |
| `backend/src/modules/kyc/kyc.service.ts` | KYC 服务 |
| `backend/src/modules/kyc/kyc.controller.ts` | KYC 控制器 |
| `backend/src/modules/developer-account/developer-account.module.ts` | 开发者账户模块 |
| `backend/src/modules/developer-account/developer-account.service.ts` | 开发者账户服务 |
| `backend/src/modules/developer-account/developer-account.controller.ts` | 开发者账户控制器 |
| `backend/src/migrations/1774200000000-AccountSystemOptimization.ts` | 账户系统迁移 |
| `backend/src/migrations/1774300000000-DeveloperAccountSystem.ts` | 开发者账户迁移 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `backend/src/entities/user.entity.ts` | 添加 UserStatus 枚举和状态管理字段 |
| `backend/src/app.module.ts` | 注册新模块（含 DeveloperAccountModule） |

---

## 九、P1-P2 优化实施 (2026-01-17)

### 1. Authorization 与 AutoPayGrant 合并

**修改文件**: `backend/src/entities/authorization.entity.ts`

**新增字段**:
```typescript
// 授权类型
export enum AuthorizationType {
  MANUAL = 'manual',      // 手动授权
  AUTO_PAY = 'auto_pay',  // 自动支付授权
}

// 新增字段
authorizationType: AuthorizationType;  // 授权类型
isAutoPay: boolean;                    // 是否自动支付
usedToday: number;                     // 今日已用金额
usedThisMonth: number;                 // 本月已用金额
totalUsed: number;                     // 累计使用金额
lastDailyResetDate: Date;              // 每日重置日期
lastMonthlyResetDate: Date;            // 每月重置日期
description: string;                   // 授权描述
metadata: Record<string, any>;         // 元数据
```

**服务更新**: `backend/src/modules/agent/authorization.service.ts`
- 新增 `createAutoPayGrant()` - 创建自动支付授权
- 新增 `getAutoPayGrants()` - 获取自动支付授权列表
- 新增 `validateAutoPayAuthorization()` - 验证自动支付授权并检查限额
- 新增 `updateAuthorizationUsage()` - 更新授权使用量

### 2. Workspace 多租户支持

**新增文件**:
| 文件 | 描述 |
|------|------|
| `backend/src/entities/workspace.entity.ts` | Workspace 实体 |
| `backend/src/entities/workspace-member.entity.ts` | Workspace 成员实体 |
| `backend/src/modules/workspace/workspace.module.ts` | Workspace 模块 |
| `backend/src/modules/workspace/workspace.service.ts` | Workspace 服务 |
| `backend/src/modules/workspace/workspace.controller.ts` | Workspace 控制器 |
| `frontend/lib/api/workspace.api.ts` | 前端 API 客户端 |
| `frontend/components/workspace/WorkspaceManager.tsx` | Workspace 管理组件 |

**Workspace 类型**:
```typescript
export enum WorkspaceType {
  PERSONAL = 'personal',     // 个人工作空间
  TEAM = 'team',             // 团队工作空间
  ENTERPRISE = 'enterprise', // 企业工作空间
}

export enum MemberRole {
  OWNER = 'owner',    // 所有者
  ADMIN = 'admin',    // 管理员
  MEMBER = 'member',  // 成员
  VIEWER = 'viewer',  // 访客
}
```

**API 端点**:
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/workspaces` | 创建工作空间 |
| GET | `/api/workspaces/my` | 获取我的工作空间列表 |
| GET | `/api/workspaces/:id` | 获取工作空间详情 |
| PUT | `/api/workspaces/:id` | 更新工作空间 |
| DELETE | `/api/workspaces/:id` | 删除工作空间 |
| GET | `/api/workspaces/:id/members` | 获取成员列表 |
| POST | `/api/workspaces/:id/members/invite` | 邀请成员 |
| PUT | `/api/workspaces/:id/members/:memberId` | 更新成员角色 |
| DELETE | `/api/workspaces/:id/members/:memberId` | 移除成员 |
| POST | `/api/workspaces/:id/leave` | 离开工作空间 |
| POST | `/api/workspaces/:id/transfer` | 转让所有权 |

### 3. 交易限额检查守卫

**新增文件**:
| 文件 | 描述 |
|------|------|
| `backend/src/modules/common/guards/transaction.guard.ts` | 交易守卫（含限额检查、KYC 检查） |
| `backend/src/modules/common/common.module.ts` | 公共模块 |

**装饰器**:
```typescript
// 支出限额检查
@CheckSpendingLimit({ amountField: 'amount', agentIdField: 'agentId' })

// KYC 级别检查  
@RequireKYCLevel(KYCRecordLevel.STANDARD)
```

### 4. 数据库迁移

**迁移文件**: `backend/src/migrations/1774400000000-P1P2Optimizations.ts`

**迁移内容**:
1. Authorization 表新增字段（authorization_type, is_auto_pay, used_today 等）
2. 创建 workspaces 表
3. 创建 workspace_members 表
4. 从 auto_pay_grants 迁移数据到 authorizations

### 5. 前端 UI 调整

**修改文件**:
| 文件 | 修改内容 |
|------|----------|
| `frontend/lib/api/auto-pay.api.ts` | 更新接口定义支持新字段 |
| `frontend/components/agent/workspace/UserModuleV2.tsx` | 添加 Workspace 标签页 |

**新增功能**:
- 用户个人资料页面新增"工作空间"标签
- 支持创建/管理工作空间
- 支持邀请/管理团队成员

---

**完成时间**: 2026-01-17  
**构建验证**: ✅ 已通过 (Backend + Frontend)  
**迁移执行**: ⏳ 待执行
