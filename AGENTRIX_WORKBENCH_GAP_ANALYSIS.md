# Agentrix Workbench 差距分析与组件规格

## 一、现有 vs 目标对照表

### 1.1 前端组件差距

| 功能领域 | 现有组件 | 缺失组件 | 状态 |
|----------|----------|----------|------|
| **统一资金账户** | 无 | `UnifiedAccountPanel`, `AccountCard`, `TransactionHistory`, `DepositWithdrawModal` | 🔴 需新建 |
| **Agent账户** | `MyAgentsPanel` (部分) | `AgentAccountPanel`, `SpendingLimitConfig`, `CreditScoreDisplay`, `AgentWalletLink` | 🟡 需增强 |
| **KYC认证** | 简单状态展示 | `KYCCenterPanel`, `KYCLevelCard`, `KYCUpgradeWizard`, `DocumentUploader` | 🟡 需重构 |
| **开发者账户** | 无独立模块 | `DeveloperAccountPanel`, `TierDisplay`, `AgreementSigner`, `UsageStats` | 🔴 需新建 |
| **工作空间** | `WorkspaceManager` (基础) | 完整CRUD、成员管理、权限配置、空间切换 | 🟡 需增强 |
| **入驻流程** | 无 | `OnboardingWizard`, `PersonaSelector`, 各画像专属步骤组件 | 🔴 需新建 |
| **专家档案** | 无 | `ExpertProfilePanel`, `CapabilityCardEditor`, `SLAConfig` | 🔴 需新建 |
| **数据集管理** | 无 | `DatasetPanel`, `DataImportWizard`, `SchemaEditor`, `VectorizationStatus` | 🔴 需新建 |

### 1.2 后端模块差距

| 模块 | 现有状态 | 需要补齐 |
|------|----------|----------|
| `AgentAccountModule` | ✅ 完成 | 前端集成 |
| `AccountModule` | ✅ 完成 | 前端集成 |
| `KYCModule` | ✅ 完成 | 前端集成 |
| `DeveloperAccountModule` | ✅ 完成 | 前端集成 |
| `WorkspaceModule` | ✅ 完成 | 前端增强 |
| `ExpertProfileModule` | 🔴 缺失 | 实体+服务+控制器 |
| `DatasetModule` | 🔴 缺失 | 实体+服务+控制器+向量化 |
| `ConsultationModule` | 🔴 缺失 | 实体+服务+控制器 |
| `OnboardingModule` | 🔴 缺失 | 实体+服务+控制器+AI辅助 |

### 1.3 API 客户端差距

| API 模块 | 文件路径 | 状态 |
|----------|----------|------|
| `account.api.ts` | `frontend/lib/api/` | 🔴 缺失 |
| `agent-account.api.ts` | `frontend/lib/api/` | 🔴 缺失 |
| `kyc.api.ts` | `frontend/lib/api/` | 🔴 缺失 |
| `developer-account.api.ts` | `frontend/lib/api/` | 🔴 缺失 |
| `workspace.api.ts` | `frontend/lib/api/` | ✅ 已有 (需验证完整性) |
| `expert-profile.api.ts` | `frontend/lib/api/` | 🔴 缺失 |
| `dataset.api.ts` | `frontend/lib/api/` | 🔴 缺失 |
| `onboarding.api.ts` | `frontend/lib/api/` | 🔴 缺失 |

---

## 1.4 新增专家/数据组件规格

### SLAProgressCircle (专家SLA指标)
```typescript
interface SLAProgressCircleProps {
  expertId: string;
  metrics: {
    avgResponseTime: number;    // 平均响应时间(小时)
    successRate: number;        // 成功率 0-100%
    satisfactionScore: number;  // 满意度 0-5
  };
  thresholds: {
    responseTimeMax: number;    // SLA承诺的最大响应时间
    successRateMin: number;     // 最低成功率
    satisfactionMin: number;    // 最低满意度
  };
}

// UI: 三个环形进度条，绿/黄/红表示状态
```

### VectorizationMonitor (向量化监控)
```typescript
interface VectorizationMonitorProps {
  datasetId: string;
  status: 'pending' | 'indexing' | 'completed' | 'failed';
  progress: {
    totalRows: number;
    processedRows: number;
    vectorDimensions: number;
    estimatedTimeRemaining: number;  // 秒
  };
  quality: {
    embeddingCoverage: number;  // 嵌入覆盖率
    indexHealth: 'good' | 'degraded' | 'poor';
  };
}
```

### PrivacyFunnelSlider (隐私漏斗滑块)
```typescript
interface PrivacyFunnelSliderProps {
  level: 1 | 2 | 3 | 4 | 5;  // 1=原始, 5=完全匿名
  onChange: (level: number) => void;
  preview: {
    before: string;  // 原始数据示例
    after: string;   // 脱敏后示例
  };
}

// UI: 滑块 + 实时预览对比
// 级别说明:
// 1 - 原始数据 (无脱敏)
// 2 - 部分遮罩 (姓名/电话等敏感字段)
// 3 - 模糊化 (日期取月份、金额取范围)
// 4 - 统计摘要 (只返回聚合结果)
// 5 - 完全匿名 (差分隐私保护)
```

---

## 二、P0 优先级组件详细规格

### 2.1 UnifiedAccountPanel

**文件**: `frontend/components/account/UnifiedAccountPanel.tsx`

```typescript
interface UnifiedAccountPanelProps {
  userId?: string;
  showCreateButton?: boolean;
  onAccountSelect?: (account: Account) => void;
}

// 功能要求:
// 1. 展示用户所有资金账户列表
// 2. 支持按账户类型筛选 (托管/非托管/虚拟)
// 3. 显示各账户余额汇总
// 4. 支持创建新账户
// 5. 快捷操作: 充值、提现、转账
// 6. 最近交易记录展示

// 子组件:
// - AccountCard: 单个账户卡片
// - AccountSummary: 账户总览
// - QuickActions: 快捷操作栏
// - TransactionList: 交易列表
```

**UI 结构**:
```
┌─────────────────────────────────────────────────────┐
│ 统一资金账户                          [+ 创建账户]  │
├─────────────────────────────────────────────────────┤
│ 总资产: $2,480.34                                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│ │可用余额 │ │冻结余额 │ │待结算  │                │
│ │$2,200.00│ │$180.34  │ │$100.00 │                │
│ └─────────┘ └─────────┘ └─────────┘                │
├─────────────────────────────────────────────────────┤
│ 我的账户                                            │
│ ┌─────────────────────────────────────────────────┐│
│ │ 🏦 主账户 (托管)           $1,234.56   [默认]   ││
│ │     USDC · EVM                                  ││
│ │     [充值] [提现] [转账]                        ││
│ ├─────────────────────────────────────────────────┤│
│ │ 🤖 Agent专用账户           $456.78              ││
│ │     USDC · EVM                                  ││
│ │     [转入] [限额设置]                           ││
│ ├─────────────────────────────────────────────────┤│
│ │ 💰 收益结算账户            $789.00              ││
│ │     USD · 虚拟                                  ││
│ │     [提现]                                      ││
│ └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│ 最近交易                               [查看全部 →]│
│ ┌─────────────────────────────────────────────────┐│
│ │ ↓ 技能购买     -$12.00   01-18 09:30   主账户  ││
│ │ ↑ 调用收益     +$45.00   01-18 08:15   收益    ││
│ │ ↔ 内部转账     $100.00   01-17 18:00   主→Agent││
│ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 2.2 AgentAccountPanel

**文件**: `frontend/components/agent-account/AgentAccountPanel.tsx`

```typescript
interface AgentAccountPanelProps {
  showCreateButton?: boolean;
  onAgentSelect?: (agent: AgentAccount) => void;
}

// 功能要求:
// 1. 展示所有 Agent 账户列表
// 2. 显示每个 Agent 的信用评分和风险等级
// 3. 支出限额进度条展示
// 4. 支持创建/激活/暂停/恢复 Agent
// 5. 授权管理入口
// 6. 关联资金账户展示

// 数据来源: AgentAccountModule API
```

**关键子组件**:

```typescript
// SpendingLimitConfig.tsx
interface SpendingLimitConfigProps {
  agentId: string;
  currentLimits: {
    perTransaction: number;
    daily: number;
    monthly: number;
  };
  usageToday: number;
  usageThisMonth: number;
  onUpdate: (limits: SpendingLimits) => Promise<void>;
}

// CreditScoreDisplay.tsx
interface CreditScoreDisplayProps {
  score: number;           // 0-1000
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  history?: Array<{ date: Date; score: number }>;
}
```

### 2.3 KYCCenterPanel

**文件**: `frontend/components/kyc/KYCCenterPanel.tsx`

```typescript
interface KYCCenterPanelProps {
  onLevelUpgrade?: (level: KYCRecordLevel) => void;
}

// 功能要求:
// 1. 显示当前 KYC 等级和状态
// 2. 等级权益对比表
// 3. 升级入口和流程
// 4. 文档上传和管理
// 5. 审核进度追踪
// 6. 有效期提醒

// 等级定义:
// BASIC: 基础认证 - 邮箱验证
// STANDARD: 标准认证 - 身份证明
// ADVANCED: 高级认证 - 地址证明 + 收入证明
// ENTERPRISE: 企业认证 - 公司文件 + 法人证明
```

**UI 结构**:
```
┌─────────────────────────────────────────────────────┐
│ KYC 认证中心                                        │
├─────────────────────────────────────────────────────┤
│ 当前等级: STANDARD ✓                有效期: 2027-01│
│                                                     │
│ 认证进度                                            │
│ ●━━━━━●━━━━━○━━━━━○                                │
│ 基础   标准   高级   企业                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 等级权益                                            │
│ ┌─────────┬─────────┬─────────┬─────────┐          │
│ │         │ 基础    │ 标准 ✓  │ 高级    │          │
│ ├─────────┼─────────┼─────────┼─────────┤          │
│ │日交易额 │ $1,000  │ $10,000 │ $100,000│          │
│ │提现限额 │ $500    │ $5,000  │ $50,000 │          │
│ │API调用  │ 1,000   │ 10,000  │ 100,000 │          │
│ │收益分成 │ 70%     │ 75%     │ 80%     │          │
│ └─────────┴─────────┴─────────┴─────────┘          │
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │            [升级到高级认证 →]                   ││
│ └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│ 已提交文档                                          │
│ ┌─────────────────────────────────────────────────┐│
│ │ 📄 身份证正面   ✓ 已验证   2026-01-15          ││
│ │ 📄 身份证反面   ✓ 已验证   2026-01-15          ││
│ │ 📄 自拍照      ✓ 已验证   2026-01-15          ││
│ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 2.4 DeveloperAccountPanel

**文件**: `frontend/components/developer-account/DeveloperAccountPanel.tsx`

```typescript
interface DeveloperAccountPanelProps {
  showUpgradePrompt?: boolean;
}

// 功能要求:
// 1. 开发者身份信息展示
// 2. 当前等级和权益
// 3. API Key 配额使用情况
// 4. 速率限制状态
// 5. 收益分成比例
// 6. 协议签署状态
// 7. 升级等级入口

// 等级权益:
// STARTER: 3 API Keys, 100 req/min, 10K/day, 70% share
// PROFESSIONAL: 10 API Keys, 500 req/min, 100K/day, 75% share
// ENTERPRISE: 50 API Keys, 2000 req/min, 1M/day, 80% share
// PARTNER: 100 API Keys, 5000 req/min, Unlimited, 85% share
```

### 2.5 OnboardingWizard

**文件**: `frontend/components/onboarding/OnboardingWizard.tsx`

```typescript
interface OnboardingWizardProps {
  initialPersona?: UserPersona;
  onComplete: (result: OnboardingResult) => void;
  onCancel: () => void;
}

type UserPersona = 'personal' | 'api_provider' | 'merchant' | 'expert' | 'data_provider' | 'developer';

interface OnboardingResult {
  persona: UserPersona;
  accounts: {
    agentAccountId?: string;
    developerAccountId?: string;
    expertProfileId?: string;
  };
  skills: string[];
  workspace: string;
}

// 步骤配置 (按画像)
const stepsByPersona: Record<UserPersona, OnboardingStep[]> = {
  personal: [
    { id: 'welcome', component: WelcomeStep },
    { id: 'wallet', component: WalletConnectStep },
    { id: 'agent-setup', component: AgentSetupStep },
    { id: 'complete', component: CompleteStep },
  ],
  api_provider: [
    { id: 'welcome', component: WelcomeStep },
    { id: 'developer-account', component: DeveloperAccountStep },
    { id: 'api-import', component: ApiImportStep },
    { id: 'skill-preview', component: SkillPreviewStep },
    { id: 'pricing', component: PricingConfigStep },
    { id: 'complete', component: CompleteStep },
  ],
  merchant: [
    { id: 'welcome', component: WelcomeStep },
    { id: 'merchant-profile', component: MerchantProfileStep },
    { id: 'product-sync', component: ProductSyncStep },
    { id: 'skill-auto-gen', component: SkillAutoGenStep },
    { id: 'pricing', component: PricingConfigStep },
    { id: 'complete', component: CompleteStep },
  ],
  expert: [
    { id: 'welcome', component: WelcomeStep },
    { id: 'expert-profile', component: ExpertProfileStep },
    { id: 'capability-card', component: CapabilityCardStep },
    { id: 'sla-config', component: SLAConfigStep },
    { id: 'pricing', component: PricingConfigStep },
    { id: 'complete', component: CompleteStep },
  ],
  data_provider: [
    { id: 'welcome', component: WelcomeStep },
    { id: 'developer-account', component: DeveloperAccountStep },
    { id: 'data-import', component: DataImportStep },
    { id: 'schema-config', component: SchemaConfigStep },
    { id: 'access-control', component: AccessControlStep },
    { id: 'x402-billing', component: X402BillingStep },
    { id: 'complete', component: CompleteStep },
  ],
  developer: [
    { id: 'welcome', component: WelcomeStep },
    { id: 'developer-account', component: DeveloperAccountStep },
    { id: 'workspace-setup', component: WorkspaceSetupStep },
    { id: 'skill-intro', component: SkillIntroStep },
    { id: 'complete', component: CompleteStep },
  ],
};
```

---

## 三、API 客户端实现规格

### 3.1 account.api.ts

```typescript
// frontend/lib/api/account.api.ts

import { apiClient } from './client';

export interface Account {
  id: string;
  ownerId: string;
  ownerType: 'user' | 'agent' | 'merchant' | 'platform';
  walletType: 'custodial' | 'non_custodial' | 'virtual';
  chainType: 'evm' | 'solana' | 'bitcoin' | 'multi';
  walletAddress?: string;
  balances: Record<string, string>;
  frozenBalances: Record<string, string>;
  isDefault: boolean;
  status: 'active' | 'frozen' | 'suspended' | 'closed';
  limits: {
    dailyLimit?: number;
    monthlyLimit?: number;
    perTransactionLimit?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  walletType: 'custodial' | 'non_custodial' | 'virtual';
  chainType?: 'evm' | 'solana' | 'bitcoin' | 'multi';
  walletAddress?: string;
  isDefault?: boolean;
}

export interface DepositRequest {
  amount: number;
  currency: string;
  txHash?: string;
}

export interface WithdrawRequest {
  amount: number;
  currency: string;
  toAddress: string;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  memo?: string;
}

export const accountApi = {
  // 获取我的所有账户
  list: () => apiClient.get<Account[]>('/api/accounts/my'),
  
  // 创建新账户
  create: (data: CreateAccountRequest) => 
    apiClient.post<Account>('/api/accounts', data),
  
  // 获取账户详情
  getById: (id: string) => 
    apiClient.get<Account>(`/api/accounts/${id}`),
  
  // 获取账户余额
  getBalance: (id: string) => 
    apiClient.get<{ balances: Record<string, string>; frozenBalances: Record<string, string> }>(`/api/accounts/${id}/balance`),
  
  // 充值
  deposit: (id: string, data: DepositRequest) => 
    apiClient.post(`/api/accounts/${id}/deposit`, data),
  
  // 提现
  withdraw: (id: string, data: WithdrawRequest) => 
    apiClient.post(`/api/accounts/${id}/withdraw`, data),
  
  // 转账
  transfer: (data: TransferRequest) => 
    apiClient.post('/api/accounts/transfer', data),
  
  // 冻结余额
  freezeBalance: (id: string, data: { amount: number; currency: string; reason: string }) => 
    apiClient.post(`/api/accounts/${id}/freeze-balance`, data),
  
  // 解冻余额
  unfreezeBalance: (id: string, data: { amount: number; currency: string }) => 
    apiClient.post(`/api/accounts/${id}/unfreeze-balance`, data),
  
  // 冻结账户
  freeze: (id: string, reason: string) => 
    apiClient.post(`/api/accounts/${id}/freeze`, { reason }),
  
  // 解冻账户
  unfreeze: (id: string) => 
    apiClient.post(`/api/accounts/${id}/unfreeze`),
};
```

### 3.2 agent-account.api.ts

```typescript
// frontend/lib/api/agent-account.api.ts

import { apiClient } from './client';

export interface AgentAccount {
  id: string;
  userId: string;
  agentUniqueId: string;
  name: string;
  description?: string;
  agentType: 'personal' | 'merchant' | 'platform' | 'third_party';
  status: 'draft' | 'active' | 'suspended' | 'revoked';
  
  // 信用评分
  creditScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // 支出限额
  spendingLimits: {
    perTransaction: number;
    daily: number;
    monthly: number;
  };
  
  // 使用统计
  spentToday: number;
  spentThisMonth: number;
  totalSpent: number;
  
  // 关联账户
  linkedAccountId?: string;
  linkedWalletAddress?: string;
  
  // 链上状态
  isOnChain: boolean;
  onChainAttestationId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentAccountRequest {
  name: string;
  description?: string;
  agentType?: 'personal' | 'merchant' | 'platform' | 'third_party';
  spendingLimits?: {
    perTransaction?: number;
    daily?: number;
    monthly?: number;
  };
}

export interface UpdateAgentAccountRequest {
  name?: string;
  description?: string;
  spendingLimits?: {
    perTransaction?: number;
    daily?: number;
    monthly?: number;
  };
}

export const agentAccountApi = {
  // 获取我的所有 Agent 账户
  list: () => apiClient.get<AgentAccount[]>('/api/agent-accounts'),
  
  // 创建 Agent 账户
  create: (data: CreateAgentAccountRequest) => 
    apiClient.post<AgentAccount>('/api/agent-accounts', data),
  
  // 获取 Agent 详情
  getById: (id: string) => 
    apiClient.get<AgentAccount>(`/api/agent-accounts/${id}`),
  
  // 更新 Agent
  update: (id: string, data: UpdateAgentAccountRequest) => 
    apiClient.put<AgentAccount>(`/api/agent-accounts/${id}`, data),
  
  // 激活 Agent
  activate: (id: string) => 
    apiClient.post(`/api/agent-accounts/${id}/activate`),
  
  // 暂停 Agent
  suspend: (id: string, reason?: string) => 
    apiClient.post(`/api/agent-accounts/${id}/suspend`, { reason }),
  
  // 恢复 Agent
  resume: (id: string) => 
    apiClient.post(`/api/agent-accounts/${id}/resume`),
  
  // 更新信用评分
  updateCreditScore: (id: string, score: number, reason?: string) => 
    apiClient.post(`/api/agent-accounts/${id}/credit-score`, { score, reason }),
  
  // 检查支出限额
  checkSpendingLimit: (id: string, amount: number) => 
    apiClient.get<{ allowed: boolean; reason?: string }>(`/api/agent-accounts/${id}/check-spending?amount=${amount}`),
  
  // 关联钱包
  linkWallet: (id: string, walletAddress: string) => 
    apiClient.post(`/api/agent-accounts/${id}/link-wallet`, { walletAddress }),
};
```

### 3.3 kyc.api.ts

```typescript
// frontend/lib/api/kyc.api.ts

import { apiClient } from './client';

export type KYCLevel = 'basic' | 'standard' | 'advanced' | 'enterprise';
export type KYCStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'expired';

export interface KYCRecord {
  id: string;
  userId: string;
  level: KYCLevel;
  status: KYCStatus;
  
  // 个人信息
  personalInfo?: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    idNumber: string;
  };
  
  // 文档
  documents: Array<{
    type: string;
    url: string;
    status: 'pending' | 'verified' | 'rejected';
    uploadedAt: string;
  }>;
  
  // 审核
  reviewer?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  
  // AML
  amlScore?: number;
  sanctionCheckResult?: string;
  
  // 有效期
  validFrom?: string;
  validUntil?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface SubmitKYCRequest {
  level: KYCLevel;
  personalInfo: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    idNumber: string;
  };
  documents: Array<{
    type: string;
    url: string;
  }>;
}

export const kycApi = {
  // 获取我的所有 KYC 记录
  getMy: () => apiClient.get<KYCRecord[]>('/api/kyc/my'),
  
  // 获取当前有效 KYC
  getActive: () => apiClient.get<KYCRecord | null>('/api/kyc/my/active'),
  
  // 检查是否满足某级别
  checkLevel: (level: KYCLevel) => 
    apiClient.get<{ satisfied: boolean; currentLevel: KYCLevel }>(`/api/kyc/check/${level}`),
  
  // 提交 KYC 申请
  submit: (data: SubmitKYCRequest) => 
    apiClient.post<KYCRecord>('/api/kyc/submit', data),
  
  // 补充材料
  addInfo: (id: string, documents: Array<{ type: string; url: string }>) => 
    apiClient.post(`/api/kyc/${id}/additional-info`, { documents }),
  
  // 取消申请
  cancel: (id: string) => 
    apiClient.post(`/api/kyc/${id}/cancel`),
  
  // 上传文档 (获取预签名 URL)
  getUploadUrl: (filename: string, contentType: string) => 
    apiClient.post<{ uploadUrl: string; documentUrl: string }>('/api/kyc/upload-url', { filename, contentType }),
};
```

### 3.4 developer-account.api.ts

```typescript
// frontend/lib/api/developer-account.api.ts

import { apiClient } from './client';

export type DeveloperTier = 'starter' | 'professional' | 'enterprise' | 'partner';
export type DeveloperStatus = 'pending' | 'active' | 'suspended' | 'revoked' | 'banned';
export type DeveloperType = 'individual' | 'team' | 'company' | 'agency';

export interface DeveloperAccount {
  id: string;
  userId: string;
  developerUniqueId: string;
  
  // 基本信息
  displayName: string;
  companyName?: string;
  website?: string;
  description?: string;
  
  // 类型和等级
  developerType: DeveloperType;
  tier: DeveloperTier;
  status: DeveloperStatus;
  
  // 配额
  apiKeyLimit: number;
  rateLimitPerMinute: number;
  dailyRequestLimit: number;
  
  // 使用统计
  apiKeysUsed: number;
  callsToday: number;
  callsThisMonth: number;
  totalCalls: number;
  
  // 收益
  revenueShare: number;
  totalEarnings: number;
  pendingEarnings: number;
  
  // 协议
  agreementSignedAt?: string;
  agreementVersion?: string;
  
  // KYC
  kycRequired: boolean;
  kycVerified: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface DeveloperDashboard {
  account: DeveloperAccount;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  usageChart: Array<{
    date: string;
    calls: number;
    revenue: number;
  }>;
  topSkills: Array<{
    id: string;
    name: string;
    calls: number;
    revenue: number;
  }>;
}

export interface CreateDeveloperAccountRequest {
  displayName: string;
  developerType: DeveloperType;
  companyName?: string;
  website?: string;
  description?: string;
}

export const developerAccountApi = {
  // 获取我的开发者账户
  getMy: () => apiClient.get<DeveloperAccount>('/api/developer-accounts/my'),
  
  // 获取开发者仪表盘
  getDashboard: () => apiClient.get<DeveloperDashboard>('/api/developer-accounts/dashboard'),
  
  // 创建开发者账户
  create: (data: CreateDeveloperAccountRequest) => 
    apiClient.post<DeveloperAccount>('/api/developer-accounts', data),
  
  // 更新开发者账户
  update: (id: string, data: Partial<CreateDeveloperAccountRequest>) => 
    apiClient.put<DeveloperAccount>(`/api/developer-accounts/${id}`, data),
  
  // 签署协议
  signAgreement: (id: string) => 
    apiClient.post(`/api/developer-accounts/${id}/sign-agreement`),
  
  // 检查 API Key 限额
  checkApiKeyLimit: (id: string) => 
    apiClient.get<{ used: number; limit: number; canCreate: boolean }>(`/api/developer-accounts/${id}/api-key-limit`),
  
  // 检查请求限额
  checkRateLimit: (id: string) => 
    apiClient.get<{ current: number; limit: number; resetAt: string }>(`/api/developer-accounts/${id}/rate-limit`),
  
  // 请求升级等级
  requestUpgrade: (id: string, targetTier: DeveloperTier) => 
    apiClient.post(`/api/developer-accounts/${id}/request-upgrade`, { targetTier }),
};
```

---

## 四、Context 实现规格

### 4.1 AccountContext

```typescript
// frontend/contexts/AccountContext.tsx

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { accountApi, Account } from '../lib/api/account.api';
import { useUser } from './UserContext';

interface AccountContextType {
  accounts: Account[];
  defaultAccount: Account | null;
  loading: boolean;
  error: string | null;
  
  // 操作
  refreshAccounts: () => Promise<void>;
  createAccount: (data: CreateAccountRequest) => Promise<Account>;
  setDefaultAccount: (id: string) => Promise<void>;
  getAccountBalance: (id: string) => Promise<{ balances: Record<string, string>; frozenBalances: Record<string, string> }>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useUser();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAccounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const data = await accountApi.list();
      setAccounts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  const defaultAccount = accounts.find(a => a.isDefault) || accounts[0] || null;

  const createAccount = async (data: CreateAccountRequest) => {
    const account = await accountApi.create(data);
    await refreshAccounts();
    return account;
  };

  const setDefaultAccount = async (id: string) => {
    // API call to set default, then refresh
    await refreshAccounts();
  };

  const getAccountBalance = async (id: string) => {
    return accountApi.getBalance(id);
  };

  return (
    <AccountContext.Provider value={{
      accounts,
      defaultAccount,
      loading,
      error,
      refreshAccounts,
      createAccount,
      setDefaultAccount,
      getAccountBalance,
    }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccounts must be used within AccountProvider');
  }
  return context;
};
```

---

## 五、工作台模块重构指引

### 5.1 UserModuleV2 改造点

| 现有功能 | 改造方式 | 优先级 |
|----------|----------|--------|
| `assets.wallets` | 迁移至 `UnifiedAccountPanel` 下的钱包关联 | P0 |
| `assets.balances` | 迁移至 `UnifiedAccountPanel` 余额汇总 | P0 |
| `assets.kyc` | 替换为 `KYCCenterPanel` | P0 |
| `agents.my-agents` | 增强为 `AgentAccountPanel` | P0 |
| `agents.authorizations` | 保留，关联 AutoPay | P1 |
| `profile.workspace` | 增强为完整 `WorkspacePanel` | P1 |

### 5.2 导航配置更新

```typescript
// L2LeftSidebar.tsx 新增配置

const userL2Config: Record<string, SubNavItem[]> = {
  dashboard: [
    { id: 'overview', label: { zh: '总览', en: 'Overview' }, icon: Activity },
    { id: 'activity', label: { zh: '最近活动', en: 'Recent' }, icon: Clock },
  ],
  // NEW: 统一资金账户
  'unified-account': [
    { id: 'balances', label: { zh: '资产余额', en: 'Balances' }, icon: Wallet },
    { id: 'transactions', label: { zh: '交易记录', en: 'Transactions' }, icon: Receipt },
    { id: 'deposit', label: { zh: '充值', en: 'Deposit' }, icon: ArrowDownToLine },
    { id: 'withdraw', label: { zh: '提现', en: 'Withdraw' }, icon: ArrowUpFromLine },
  ],
  // NEW: Agent账户
  'agent-accounts': [
    { id: 'my-agents', label: { zh: '我的Agent', en: 'My Agents' }, icon: Bot },
    { id: 'authorizations', label: { zh: '授权管理', en: 'Auth' }, icon: ShieldCheck },
    { id: 'auto-pay', label: { zh: '自动支付', en: 'Auto-Pay' }, icon: Zap },
  ],
  // NEW: KYC
  kyc: [
    { id: 'status', label: { zh: '认证状态', en: 'Status' }, icon: UserCheck },
    { id: 'upgrade', label: { zh: '升级认证', en: 'Upgrade' }, icon: ArrowUp },
    { id: 'documents', label: { zh: '文档管理', en: 'Documents' }, icon: FileText },
  ],
  // NEW: 工作空间
  workspace: [
    { id: 'my-spaces', label: { zh: '我的空间', en: 'My Spaces' }, icon: Home },
    { id: 'joined', label: { zh: '已加入', en: 'Joined' }, icon: Users },
    { id: 'invitations', label: { zh: '邀请', en: 'Invitations' }, icon: Mail },
  ],
  // 保留现有
  skills: [...],
  shopping: [...],
  security: [...],
  settings: [...],
};
```

---

## 六、数据库迁移检查

### 6.1 已完成迁移

| 迁移文件 | 状态 | 说明 |
|----------|------|------|
| `1774200000000-AccountSystemOptimization.ts` | ✅ 已执行 | 创建 agent_accounts, accounts, kyc_records |
| `1774300000000-DeveloperAccountSystem.ts` | ✅ 已执行 | 创建 developer_accounts |
| `1774400000000-P1P2Optimizations.ts` | ⏳ 待执行 | Authorization增强, Workspace表 |

### 6.2 需要新增迁移

| 迁移文件 | 内容 | 优先级 |
|----------|------|--------|
| `1774500000000-ExpertProfileSystem.ts` | 创建 expert_profiles, consultations | P2 |
| `1774600000000-DatasetSystem.ts` | 创建 datasets, dataset_queries | P2 |
| `1774700000000-OnboardingSystem.ts` | 创建 onboarding_sessions | P1 |

---

**文档版本**: v1.0  
**创建日期**: 2026-01-18
