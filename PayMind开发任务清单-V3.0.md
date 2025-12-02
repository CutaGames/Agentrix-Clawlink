# PayMind 开发任务清单 V3.0
## Web3 直接发行与交易平台

**版本**: 3.0  
**日期**: 2025年1月  
**基于**: 技术开发文档 V3.0

---

## 📋 任务状态说明

- ⏳ **待开始**：任务尚未开始
- 🔄 **进行中**：任务正在进行
- ✅ **已完成**：任务已完成
- ⚠️ **阻塞**：任务被阻塞
- ❌ **已取消**：任务已取消

---

## 一、前端开发任务

### 1.1 Agent 意图识别增强

- [ ] ⏳ **任务1.1.1**：添加代币发行意图识别
  - 文件：`paymindfrontend/components/agent/AgentChatEnhanced.tsx`
  - 工作量：1 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务1.1.2**：添加 NFT 发行意图识别
  - 文件：`paymindfrontend/components/agent/AgentChatEnhanced.tsx`
  - 工作量：0.5 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务1.1.3**：添加 Launchpad 意图识别
  - 文件：`paymindfrontend/components/agent/AgentChatEnhanced.tsx`
  - 工作量：0.5 天
  - 优先级：P1
  - 依赖：无

### 1.2 文件上传支持

- [ ] ⏳ **任务1.2.1**：创建文件上传组件
  - 文件：`paymindfrontend/components/agent/FileUpload.tsx` (新建)
  - 工作量：2 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务1.2.2**：集成文件上传到 Agent 对话
  - 文件：`paymindfrontend/components/agent/AgentChatEnhanced.tsx`
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务1.2.1

### 1.3 Agent 对话引导增强

- [ ] ⏳ **任务1.3.1**：实现代币发行引导流程
  - 文件：`paymindfrontend/components/agent/AgentChatEnhanced.tsx`
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务1.1.1

- [ ] ⏳ **任务1.3.2**：实现 NFT 发行引导流程
  - 文件：`paymindfrontend/components/agent/AgentChatEnhanced.tsx`
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务1.1.2, 任务1.2.1

- [ ] ⏳ **任务1.3.3**：实现 Launchpad 引导流程
  - 文件：`paymindfrontend/components/agent/AgentChatEnhanced.tsx`
  - 工作量：1 天
  - 优先级：P1
  - 依赖：任务1.1.3

### 1.4 结构化消息卡片扩展

- [ ] ⏳ **任务1.4.1**：创建代币信息卡片
  - 文件：`paymindfrontend/components/agent/StructuredMessageCard.tsx`
  - 工作量：1 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务1.4.2**：创建 NFT 信息卡片
  - 文件：`paymindfrontend/components/agent/StructuredMessageCard.tsx`
  - 工作量：1 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务1.4.3**：创建预售信息卡片
  - 文件：`paymindfrontend/components/agent/StructuredMessageCard.tsx`
  - 工作量：1 天
  - 优先级：P1
  - 依赖：无

### 1.5 API 客户端扩展

- [ ] ⏳ **任务1.5.1**：创建代币 API 客户端
  - 文件：`paymindfrontend/lib/api/token.api.ts` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务1.5.2**：创建 NFT API 客户端
  - 文件：`paymindfrontend/lib/api/nft.api.ts` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：无

### 1.6 Marketplace 资产聚合 UI（新增）

- [ ] ⏳ **任务1.6.1**：实现资产发现列表（Stage1）
  - 文件：`paymindfrontend/components/marketplace/AssetDiscovery.tsx` (新建)
  - 功能：展示 token/交易对/NFT/RWA/Launchpad，含来源标签、价格、流动性
  - 工作量：4 天
  - 优先级：P0

- [ ] ⏳ **任务1.6.2**：实现资产筛选与操作面板
  - 文件：`paymindfrontend/components/marketplace/AssetFilters.tsx`、`AssetActionPanel.tsx` (新建)
  - 功能：多维筛选、发起 swap/限价/扫地/抢购、展示推荐策略
  - 工作量：3 天
  - 优先级：P0
  - 依赖：任务1.6.1

- [ ] ⏳ **任务1.6.3**：实现资产提交入口（Stage2）
  - 文件：`paymindfrontend/components/marketplace/AssetSubmissionModal.tsx` (新建)
  - 功能：项目方/Agent/开发者上传资产、配置返佣、查看审核状态
  - 工作量：2 天
  - 优先级：P1
  - 依赖：任务1.6.1

- [ ] ⏳ **任务1.6.4**：展示 AI Insights（Stage3）
  - 文件：`paymindfrontend/components/marketplace/AssetInsights.tsx` (新建)
  - 功能：显示 AI 生成的描述、风险评级、策略建议
  - 工作量：3 天
  - 优先级：P2
  - 依赖：Asset Insights API

- [ ] ⏳ **任务1.6.5**：更新首页 Marketplace 文案
  - 文件：`paymindfrontend/pages/index.tsx`
  - 功能：在 Hero/Marketplace 区块突出“AI 聚合资产”卖点
  - 工作量：1 天
  - 优先级：P0

---

## 二、后端开发任务

### 2.1 数据库设计

- [ ] ⏳ **任务2.1.1**：设计代币表结构
  - 文件：`backend/src/entities/token.entity.ts` (新建)
  - 工作量：0.5 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务2.1.2**：设计 NFT 表结构
  - 文件：`backend/src/entities/nft.entity.ts` (新建)
  - 工作量：0.5 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务2.1.3**：创建数据库迁移
  - 文件：`backend/src/migrations/XXXXXX-AddTokenAndNFT.ts` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务2.1.1, 任务2.1.2

### 2.2 代币发行服务

- [ ] ⏳ **任务2.2.1**：实现代币发行服务
  - 文件：`backend/src/modules/token/token.service.ts` (新建)
  - 工作量：3 天
  - 优先级：P0
  - 依赖：任务2.1.1, 任务2.3.1

- [ ] ⏳ **任务2.2.2**：实现代币控制器
  - 文件：`backend/src/modules/token/token.controller.ts` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务2.2.1

- [ ] ⏳ **任务2.2.3**：实现代币购买服务
  - 文件：`backend/src/modules/token/token.service.ts`
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务2.2.1, 任务2.3.2

### 2.3 NFT 发行服务

- [ ] ⏳ **任务2.3.1**：实现 NFT 集合创建服务
  - 文件：`backend/src/modules/nft/nft.service.ts` (新建)
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务2.1.2, 任务2.3.1

- [ ] ⏳ **任务2.3.2**：实现 NFT Mint 服务
  - 文件：`backend/src/modules/nft/nft.service.ts`
  - 工作量：3 天
  - 优先级：P0
  - 依赖：任务2.3.1, 任务2.4.1

- [ ] ⏳ **任务2.3.3**：实现 NFT 控制器
  - 文件：`backend/src/modules/nft/nft.controller.ts` (新建)
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务2.3.1, 任务2.3.2

- [ ] ⏳ **任务2.3.4**：实现 NFT 购买服务
  - 文件：`backend/src/modules/nft/nft.service.ts`
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务2.3.2, 任务2.3.3

### 2.4 智能合约部署服务

- [ ] ⏳ **任务2.4.1**：实现 ERC-20 代币合约部署
  - 文件：`backend/src/modules/contract/contract-deployment.service.ts` (新建)
  - 工作量：3 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务2.4.2**：实现 ERC-721 NFT 合约部署
  - 文件：`backend/src/modules/contract/contract-deployment.service.ts`
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务2.4.1

- [ ] ⏳ **任务2.4.3**：实现合约验证功能
  - 文件：`backend/src/modules/contract/contract-deployment.service.ts`
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务2.4.1, 任务2.4.2

- [ ] ⏳ **任务2.4.4**：实现 Mint NFT 功能
  - 文件：`backend/src/modules/contract/contract-deployment.service.ts`
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务2.4.2

- [ ] ⏳ **任务2.4.5**：实现代币销售执行
  - 文件：`backend/src/modules/contract/contract-deployment.service.ts`
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务2.4.1

### 2.5 元数据存储服务

- [ ] ⏳ **任务2.5.1**：集成 IPFS
  - 文件：`backend/src/modules/metadata/metadata-storage.service.ts` (新建)
  - 工作量：2 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务2.5.2**：集成 Arweave
  - 文件：`backend/src/modules/metadata/metadata-storage.service.ts`
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务2.5.1

### 2.6 Launchpad 服务

- [ ] ⏳ **任务2.6.1**：实现代币预售功能
  - 文件：`backend/src/modules/launchpad/launchpad.service.ts` (新建)
  - 工作量：2 天
  - 优先级：P1
  - 依赖：任务2.2.1

- [ ] ⏳ **任务2.6.2**：实现 NFT 预售功能
  - 文件：`backend/src/modules/launchpad/launchpad.service.ts`
  - 工作量：2 天
  - 优先级：P1
  - 依赖：任务2.3.1

- [ ] ⏳ **任务2.6.3**：实现白名单管理
  - 文件：`backend/src/modules/launchpad/launchpad.service.ts`
  - 工作量：1 天
  - 优先级：P1
  - 依赖：任务2.6.1, 任务2.6.2

### 2.7 资产聚合服务（新增）

- [ ] ⏳ **任务2.7.1**：实现 AssetIngestorService
  - 文件：`backend/src/modules/marketplace/asset-ingestor.service.ts` (新建)
  - 工作量：4 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务2.7.2**：实现 AssetNormalizer & Scheduler
  - 文件：`backend/src/modules/marketplace/asset-normalizer.service.ts`、`asset-scheduler.ts` (新建)
  - 工作量：3 天
  - 优先级：P0
  - 依赖：任务2.7.1

- [ ] ⏳ **任务2.7.3**：实现 AssetTradingService
  - 文件：`backend/src/modules/marketplace/asset-trading.service.ts` (新建)
  - 工作量：5 天
  - 优先级：P0
  - 依赖：任务2.7.1

- [ ] ⏳ **任务2.7.4**：实现 AssetSubmissionController
  - 文件：`backend/src/modules/marketplace/asset.controller.ts` (新建)
  - 工作量：3 天
  - 优先级：P1
  - 依赖：任务2.7.2

- [ ] ⏳ **任务2.7.5**：实现 AssetReferralService
  - 文件：`backend/src/modules/marketplace/asset-referral.service.ts` (新建)
  - 工作量：2 天
  - 优先级：P1
  - 依赖：任务2.7.4

- [ ] ⏳ **任务2.7.6**：实现 AssetInsightsService
  - 文件：`backend/src/modules/marketplace/asset-insights.service.ts` (新建)
  - 工作量：3 天
  - 优先级：P2
  - 依赖：任务2.7.2

- [ ] ⏳ **任务2.7.7**：数据库迁移（Marketplace Assets）
  - 文件：`backend/src/migrations/XXXXXX-AddMarketplaceAssets.ts` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务2.7.1

---

## 三、智能合约开发任务

### 3.1 ERC-20 代币合约

- [ ] ⏳ **任务3.1.1**：开发 ERC-20 代币合约
  - 文件：`contracts/contracts/ERC20Token.sol` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务3.1.2**：编写代币合约测试
  - 文件：`contracts/test/ERC20Token.test.ts` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务3.1.1

### 3.2 ERC-721 NFT 合约

- [ ] ⏳ **任务3.2.1**：开发 ERC-721 NFT 合约
  - 文件：`contracts/contracts/ERC721NFT.sol` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：无

- [ ] ⏳ **任务3.2.2**：编写 NFT 合约测试
  - 文件：`contracts/test/ERC721NFT.test.ts` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务3.2.1

### 3.3 销售合约

- [ ] ⏳ **任务3.3.1**：开发代币销售合约
  - 文件：`contracts/contracts/TokenSale.sol` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务3.1.1

- [ ] ⏳ **任务3.3.2**：开发 NFT 销售合约
  - 文件：`contracts/contracts/NFTSale.sol` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务3.2.1

- [ ] ⏳ **任务3.3.3**：编写销售合约测试
  - 文件：`contracts/test/TokenSale.test.ts` (新建)
  - 工作量：1 天
  - 优先级：P0
  - 依赖：任务3.3.1, 任务3.3.2

---

## 四、测试任务

### 4.1 单元测试

- [ ] ⏳ **任务4.1.1**：代币服务单元测试
  - 文件：`backend/src/modules/token/token.service.spec.ts` (新建)
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务2.2.1

- [ ] ⏳ **任务4.1.2**：NFT 服务单元测试
  - 文件：`backend/src/modules/nft/nft.service.spec.ts` (新建)
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务2.3.1

- [ ] ⏳ **任务4.1.3**：合约部署服务单元测试
  - 文件：`backend/src/modules/contract/contract-deployment.service.spec.ts` (新建)
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务2.4.1

### 4.2 集成测试

- [ ] ⏳ **任务4.2.1**：代币发行集成测试
  - 文件：`backend/test/integration/token-launch.e2e-spec.ts` (新建)
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务2.2.1, 任务2.4.1

- [ ] ⏳ **任务4.2.2**：NFT 发行集成测试
  - 文件：`backend/test/integration/nft-launch.e2e-spec.ts` (新建)
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务2.3.1, 任务2.4.2

- [ ] ⏳ **任务4.2.3**：直接交易集成测试
  - 文件：`backend/test/integration/direct-trade.e2e-spec.ts` (新建)
  - 工作量：2 天
  - 优先级：P0
  - 依赖：任务2.2.3, 任务2.3.4

---

## 五、文档任务

### 5.1 API 文档

- [ ] ⏳ **任务5.1.1**：编写代币 API 文档
  - 文件：`docs/api/token-api.md` (新建)
  - 工作量：1 天
  - 优先级：P1
  - 依赖：任务2.2.2

- [ ] ⏳ **任务5.1.2**：编写 NFT API 文档
  - 文件：`docs/api/nft-api.md` (新建)
  - 工作量：1 天
  - 优先级：P1
  - 依赖：任务2.3.3

### 5.2 智能合约文档

- [ ] ⏳ **任务5.2.1**：编写智能合约文档
  - 文件：`docs/contracts/README.md` (新建)
  - 工作量：1 天
  - 优先级：P1
  - 依赖：任务3.1.1, 任务3.2.1, 任务3.3.1

### 5.3 部署文档

- [ ] ⏳ **任务5.3.1**：编写部署文档
  - 文件：`docs/deployment/README.md` (新建)
  - 工作量：1 天
  - 优先级：P1
  - 依赖：任务2.4.1

---

## 六、开发计划时间表

### Phase 1：核心功能开发（Week 1-6）

#### Week 1-2：基础设施搭建
- 任务2.1.1 - 任务2.1.3：数据库设计
- 任务3.1.1 - 任务3.1.2：ERC-20 代币合约
- 任务3.2.1 - 任务3.2.2：ERC-721 NFT 合约
- 任务2.4.1 - 任务2.4.3：合约部署服务框架

#### Week 3-4：后端核心服务
- 任务2.2.1 - 任务2.2.2：代币发行服务
- 任务2.3.1 - 任务2.3.3：NFT 发行服务
- 任务2.5.1 - 任务2.5.2：元数据存储服务

#### Week 5-6：前端集成
- 任务1.1.1 - 任务1.1.2：意图识别增强
- 任务1.2.1 - 任务1.2.2：文件上传支持
- 任务1.3.1 - 任务1.3.2：对话引导增强
- 任务1.5.1 - 任务1.5.2：API 客户端

**里程碑1**：代币和 NFT 可以通过 Agent 发行 ✅

### Phase 2：直接交易功能（Week 7-10）

#### Week 7-8：销售合约和交易服务
- 任务3.3.1 - 任务3.3.3：销售合约开发
- 任务2.4.4 - 任务2.4.5：交易执行服务
- 任务2.2.3：代币购买服务
- 任务2.3.4：NFT 购买服务

#### Week 9-10：前端交易界面
- 任务1.4.1 - 任务1.4.2：信息卡片扩展
- 前端交易流程集成

**里程碑2**：代币和 NFT 可以直接交易 ✅

### Phase 3：Launchpad 功能（Week 11-12）

#### Week 11-12：Launchpad 服务
- 任务2.6.1 - 任务2.6.3：Launchpad 服务
- 任务1.1.3：Launchpad 意图识别
- 任务1.3.3：Launchpad 引导流程
- 任务1.4.3：预售信息卡片

**里程碑3**：支持代币和 NFT 预售 ✅

### Phase 4：测试和优化（Week 13-14）

#### Week 13-14：测试和优化
- 任务4.1.1 - 任务4.1.3：单元测试
- 任务4.2.1 - 任务4.2.3：集成测试
- 性能优化
- Bug 修复

**里程碑4**：所有功能测试通过，准备上线 ✅

---

## 七、任务统计

### 7.1 按模块统计

| 模块 | 任务数 | 总工作量 | 已完成 | 进行中 | 待开始 |
|------|--------|----------|--------|--------|--------|
| 前端开发 | 12 | 17 天 | 0 | 0 | 12 |
| 后端开发 | 18 | 35 天 | 0 | 0 | 18 |
| 智能合约开发 | 6 | 11 天 | 0 | 0 | 6 |
| 测试 | 6 | 12 天 | 0 | 0 | 6 |
| 文档 | 3 | 3 天 | 0 | 0 | 3 |
| **总计** | **45** | **78 天** | **0** | **0** | **45** |

### 7.2 按优先级统计

| 优先级 | 任务数 | 总工作量 |
|--------|--------|----------|
| P0（核心功能） | 35 | 65 天 |
| P1（重要功能） | 10 | 13 天 |
| **总计** | **45** | **78 天** |

---

## 八、关键依赖关系

### 8.1 关键路径

1. **数据库设计** → **代币/NFT 服务** → **前端集成**
2. **智能合约开发** → **合约部署服务** → **代币/NFT 服务**
3. **元数据存储服务** → **NFT Mint 服务** → **前端集成**

### 8.2 阻塞任务

- 任务2.4.1（合约部署服务）阻塞任务2.2.1（代币发行服务）
- 任务2.4.2（NFT 合约部署）阻塞任务2.3.2（NFT Mint 服务）
- 任务2.5.1（IPFS 集成）阻塞任务2.3.2（NFT Mint 服务）

---

**文档版本**：V3.0  
**最后更新**：2025年1月

---

*本文档用于跟踪 PayMind V3.0 的开发任务进度。*

