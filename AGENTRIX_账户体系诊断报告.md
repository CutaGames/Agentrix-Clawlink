# Agentrix 账户体系诊断报告

**机密资料 | 2026年1月17日 | 生态架构评估**

---

## 一、现有账户体系全景

### 1.1 核心实体关系图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AGENTRIX 账户体系架构                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                              ┌────────────────┐                                  │
│                              │     User       │ ◄─── 核心身份实体                 │
│                              │  (agentrixId)  │                                  │
│                              └───────┬────────┘                                  │
│           ┌────────────┬─────────────┼─────────────┬────────────┐               │
│           │            │             │             │            │                │
│           ▼            ▼             ▼             ▼            ▼                │
│  ┌─────────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐        │
│  │ SocialAccount│ │WalletConn │ │MPCWallet │ │MerchantPro│ │ UserProfile │        │
│  │(Google/X/...) │ │(MetaMask) │ │ (托管式)  │ │   file   │ │ (行为数据) │        │
│  └─────────────┘ └───────────┘ └──────────┘ └──────────┘ └────────────┘        │
│                                                                                  │
│  ┌─────────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐        │
│  │ Authorization│ │ ApiKey    │ │AutoPayGrant│ │  Budget  │ │ AgentRegistry│      │
│  │  (Agent授权)  │ │ (开发者)  │ │ (AI支付)  │ │ (预算)   │ │  (AI Agent) │      │
│  └─────────────┘ └───────────┘ └──────────┘ └──────────┘ └────────────┘        │
│                                                                                  │
│  ═══════════════════════════════ 独立体系 ═══════════════════════════════════   │
│                                                                                  │
│  ┌─────────────┐                                                                 │
│  │ AdminUser   │ ◄─── 与User完全隔离的后台管理账户                               │
│  └─────────────┘                                                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 身份标识体系

| 标识类型 | 字段名 | 格式示例 | 用途 |
|---------|--------|---------|------|
| **主键ID** | `id` | UUID | 数据库内部关联 |
| **Agentrix ID** | `agentrixId` | `AX-1737123456789-abc123xyz` | 全局唯一用户标识，对外暴露 |
| **Legacy ID** | `paymindId` (DB列名) | 同上 | 历史遗留，映射到 agentrixId |
| **钱包地址** | `walletAddress` | `0x1234...abcd` | 链上身份 |
| **社交账号ID** | `googleId/twitterId/appleId` | 第三方平台ID | OAuth 登录凭证 |

### 1.3 角色体系

```typescript
enum UserRole {
  USER = 'user',        // 普通用户（消费者）
  AGENT = 'agent',      // AI Agent 身份
  MERCHANT = 'merchant', // 商户（卖家）
  DEVELOPER = 'developer' // 开发者
}
```

---

## 二、问题清单与风险分析

### 🔴 P0 - 高危问题（影响核心业务）

#### 问题 #1：身份标识命名混乱
**描述**：数据库列名 `paymindId` 与代码属性名 `agentrixId` 不一致，存在历史遗留问题。

**风险**：
- 代码维护成本高，新开发者容易混淆
- 跨服务调用时参数命名不一致
- 未来品牌升级（如换名）将非常困难

**位置**：[user.entity.ts#L29](backend/src/entities/user.entity.ts#L29)
```typescript
@Column({ name: 'paymindId', unique: true })
agentrixId: string;  // 数据库存的是 paymindId，代码用的是 agentrixId
```

---

#### 问题 #2：AI Agent 没有独立账户体系
**描述**：`UserRole.AGENT` 只是用户的一个角色，Agent 并没有真正独立的"账户"概念。

**当前状态**：
- `AgentRegistry` 只是注册信息（name, publicKey, capabilities）
- `UserAgent` 是用户创建的 Agent 实例，但挂载在 `userId` 下
- AI Agent 没有独立的资金账户、独立的授权管理

**风险**：
- 无法实现真正的 "Agent Economy"：Agent 作为独立经济主体参与交易
- Agent-to-Agent (A2A) 支付需要绕道人类账户，增加摩擦
- 与竞品 Skyfire（Agent 有独立信用评分）相比缺乏差异化

---

#### 问题 #3：钱包账户设计割裂
**描述**：存在三套钱包系统，但关系不清晰：

| 实体 | 用途 | 问题 |
|-----|------|-----|
| `WalletConnection` | 外部钱包登录/绑定 | 只存连接信息，无余额概念 |
| `MPCWallet` | 托管式钱包 | 有 merchantId/workspaceId/userId 三种归属，但优先级不明 |
| `User` 直接存 | 无 | User 本身没有资金账户字段 |

**风险**：
- 同一用户可能有多个"默认钱包"（WalletConnection 和 MPCWallet 各一个）
- 资金归集、分账时钱包选择逻辑复杂
- MPCWallet 的 `merchantId/workspaceId/userId` 三选一设计导致查询困难

---

### 🟠 P1 - 中危问题（影响用户体验）

#### 问题 #4：角色授权粒度不足
**描述**：`UserRole` 是枚举数组，权限控制基于角色而非细粒度能力。

**当前状态**：
```typescript
roles: UserRole[];  // 只能是 user/merchant/developer/agent
```

**问题**：
- 无法表达"只允许查看订单但不能发起支付"的细粒度权限
- Merchant 子角色（店员、财务、客服）无法区分
- Developer 的 API 权限没有 scope 区分

---

#### 问题 #5：社交账号与主账户关系不一致
**描述**：存在两套社交账号存储：

| 方式 | 位置 | 问题 |
|-----|------|-----|
| User 直接字段 | `googleId`, `appleId`, `twitterId` | 只能绑定一个，且硬编码 |
| SocialAccount 表 | 独立实体，支持多个 | 与 User 字段冗余，数据可能不同步 |

**风险**：
- 同一个社交账号的信息可能存两份（User.googleId 和 SocialAccount 各一份）
- 新增社交平台（如 Discord、Telegram）需要改 User 实体还是只加 SocialAccount？

---

#### 问题 #6：KYC 体系不完整
**描述**：`KYCLevel` 和 `kycStatus` 两个字段语义重叠且不规范。

```typescript
@Column({ type: 'enum', enum: KYCLevel, default: KYCLevel.NONE })
kycLevel: KYCLevel;  // none/basic/verified

@Column({ type: 'varchar', default: 'none' })
kycStatus: string;   // 普通字符串，无枚举约束
```

**问题**：
- `kycLevel` 和 `kycStatus` 的区别是什么？
- `kycStatus` 没有枚举约束，可能存入任意值
- 缺少 KYC 审核流程字段（审核时间、审核人、拒绝原因等）

---

### 🟡 P2 - 低危问题（技术债务）

#### 问题 #7：Authorization 与 AutoPayGrant 功能重叠
**描述**：两个实体都在管理"用户授权 Agent 支付"的场景。

| 实体 | 字段 | 定位 |
|-----|------|-----|
| `Authorization` | merchantScope, categoryScope, singleTxLimit, dailyLimit, monthlyLimit | 看起来更完整 |
| `AutoPayGrant` | singleLimit, dailyLimit, expiresAt | 更简单 |

**问题**：
- 同一个需求两套实现，代码分散
- 新功能应该加到哪个实体不明确

---

#### 问题 #8：缺少账户冻结/风控状态
**描述**：User 实体没有账户状态字段（如 active/suspended/frozen/deleted）。

**风险**：
- 无法"软删除"用户
- 无法实现账户冻结（风控场景）
- 无法区分"主动注销"和"被封禁"

---

#### 问题 #9：多租户（Workspace）体系未完善
**描述**：代码中有 `workspaceId` 引用，但没有独立的 Workspace 实体。

**出现位置**：
- `MPCWallet.workspaceId`
- `User.workspaceMemberships`（被注释掉）

**问题**：
- B2B 场景下，一个企业可能有多个员工，需要"组织账户"
- Workspace 概念存在但未实现

---

## 三、优化建议

### 3.1 短期优化（1-2 Sprint）

#### [S1] 统一身份标识命名
```typescript
// 数据库迁移：将 paymindId 列重命名为 agentrix_id
ALTER TABLE users RENAME COLUMN "paymindId" TO "agentrix_id";

// 实体修改
@Column({ name: 'agentrix_id', unique: true })
agentrixId: string;
```

#### [S2] 清理社交账号冗余
```typescript
// 1. 将 User 表中的 googleId/appleId/twitterId 数据迁移到 SocialAccount
// 2. 删除 User 实体中的这三个字段
// 3. 统一使用 SocialAccount 管理所有第三方登录
```

#### [S3] 合并 Authorization 和 AutoPayGrant
```typescript
// 保留 Authorization，废弃 AutoPayGrant
// 将 AutoPayGrant 的数据迁移到 Authorization
// Authorization 增加 isAutoPay: boolean 字段
```

---

### 3.2 中期优化（1-2 Month）

#### [M1] 引入账户状态管理

```typescript
enum UserStatus {
  ACTIVE = 'active',           // 正常
  SUSPENDED = 'suspended',     // 临时冻结
  FROZEN = 'frozen',           // 风控冻结
  CLOSED = 'closed',           // 主动注销
  BANNED = 'banned',           // 永久封禁
}

// User 实体增加
@Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
status: UserStatus;

@Column({ nullable: true })
statusReason?: string;

@Column({ nullable: true })
statusUpdatedAt?: Date;
```

#### [M2] 建立统一钱包账户

```typescript
// 新建 Account 实体（资金账户）
@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;  // 可以是 userId 或 agentId

  @Column({ type: 'enum', enum: ['user', 'agent', 'merchant', 'platform'] })
  ownerType: string;

  @Column({ type: 'enum', enum: ['custodial', 'non_custodial'] })
  walletType: string;

  @Column({ nullable: true })
  walletAddress?: string;  // 非托管钱包地址

  @Column({ nullable: true })
  mpcWalletId?: string;    // 托管钱包引用

  @Column({ default: true })
  isDefault: boolean;

  // ... 余额快照等
}
```

#### [M3] 完善 KYC 体系

```typescript
enum KYCStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('kyc_records')
export class KYCRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: KYCLevel })
  level: KYCLevel;

  @Column({ type: 'enum', enum: KYCStatus })
  status: KYCStatus;

  @Column({ type: 'jsonb', nullable: true })
  documents: {
    type: string;
    url: string;
    uploadedAt: Date;
  }[];

  @Column({ nullable: true })
  reviewedBy?: string;

  @Column({ nullable: true })
  reviewedAt?: Date;

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

### 3.3 长期优化（3-6 Month）

#### [L1] 建立 AI Agent 独立账户体系

**愿景**：让 AI Agent 成为真正的经济主体

```typescript
@Entity('agent_accounts')
export class AgentAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  agentId: string;  // 全局唯一 Agent ID

  @Column()
  ownerId: string;  // 创建者/所有者

  // === 身份信息 ===
  @Column()
  name: string;

  @Column({ nullable: true })
  publicKey?: string;  // Agent 的公钥（用于签名验证）

  // === 资金账户 ===
  @Column({ nullable: true })
  defaultAccountId?: string;  // 默认资金账户

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  creditScore: number;  // 信用评分（对标 Skyfire）

  // === 授权管理 ===
  @Column({ type: 'jsonb', nullable: true })
  capabilities: string[];  // 能力列表

  @Column({ type: 'jsonb', nullable: true })
  spendingLimits: {
    singleTxLimit: number;
    dailyLimit: number;
    monthlyLimit: number;
  };

  // === 链上存证 ===
  @Column({ nullable: true })
  easAttestationUid?: string;  // EAS 链上身份证明

  // === 生命周期 ===
  @Column({ type: 'enum', enum: AgentStatus, default: AgentStatus.ACTIVE })
  status: AgentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**核心能力**：
1. **独立资金账户**：Agent 可以持有资金，无需经过人类账户中转
2. **信用评分**：基于历史行为计算，影响授权额度
3. **能力声明**：Agent 声明自己能做什么（对接 MCP）
4. **链上存证**：通过 EAS 在链上存证 Agent 身份

#### [L2] 引入 Workspace（组织账户）

```typescript
@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  ownerId: string;  // 创建者

  @Column({ type: 'enum', enum: ['personal', 'team', 'enterprise'] })
  type: string;

  // ... 组织信息
}

@Entity('workspace_members')
export class WorkspaceMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ['owner', 'admin', 'member', 'viewer'] })
  role: string;

  // ... 细粒度权限
}
```

#### [L3] 权限系统升级（RBAC → ABAC）

```typescript
// 当前：基于角色的访问控制 (RBAC)
roles: ['user', 'merchant']

// 目标：基于属性的访问控制 (ABAC)
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subjectType: 'user' | 'agent' | 'workspace';

  @Column()
  subjectId: string;

  @Column()
  resource: string;  // 'orders', 'payments', 'products', ...

  @Column({ type: 'simple-array' })
  actions: string[];  // ['read', 'create', 'update', 'delete']

  @Column({ type: 'jsonb', nullable: true })
  conditions?: {
    merchantScope?: string[];
    categoryScope?: string[];
    amountLimit?: number;
    timeRange?: { start: Date; end: Date };
  };
}
```

---

## 四、数据迁移路线图

```
Phase 1 (Week 1-2): 清理与统一
├── 重命名 paymindId → agentrix_id
├── 迁移社交账号到 SocialAccount 表
├── 合并 AutoPayGrant → Authorization
└── 添加 User.status 字段

Phase 2 (Week 3-6): 账户体系重构
├── 创建 Account 实体（统一资金账户）
├── 创建 KYCRecord 实体
├── 重构钱包关联逻辑
└── 清理 MPCWallet 的多归属问题

Phase 3 (Week 7-12): Agent 独立化
├── 创建 AgentAccount 实体
├── 实现 Agent 独立资金账户
├── 实现 Agent 信用评分
└── 链上存证 (EAS)

Phase 4 (Month 4-6): 企业化
├── 创建 Workspace 实体
├── 实现多租户权限
├── 升级到 ABAC
└── 审计日志完善
```

---

## 五、与竞品的差异化定位

| 能力维度 | Skyfire | Payman | Agentrix (目标) |
|---------|---------|--------|-----------------|
| **Agent 独立账户** | ✅ 有信用评分 | ❌ 依附人类 | ✅ 独立账户+链上存证 |
| **资金账户** | 托管为主 | 银行账户 | 托管+非托管双轨 |
| **权限模型** | API Scope | 企业ERP | ABAC 细粒度 |
| **组织账户** | ❌ | ✅ | ✅ Workspace |
| **KYC 体系** | 简化 | 严格 | 分级（个人/商户/企业） |

---

## 六、结论

Agentrix 当前的账户体系能够支撑基本的 C2C/B2C 电商场景，但要实现 **"Agent 的亚马逊"** 这一愿景，需要重点解决：

1. **Agent 独立账户**：让 AI 成为真正的经济主体
2. **统一资金账户**：解决当前钱包体系割裂的问题
3. **细粒度权限**：支撑复杂的授权场景（Agent 代付、企业子账户等）

建议优先级：**#2 Agent 独立账户 > #3 钱包统一 > #1 标识清理 > #4 权限升级**

---

**Agentrix 架构组 | 2026年1月17日**
