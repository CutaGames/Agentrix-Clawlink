# 主网部署前检查清单

**日期**: 2026年1月16日  
**版本**: Commission V5.0  
**目标网络**: BSC Mainnet (Chain ID: 56)

---

## 一、测试网验证状态

### 1.1 合约部署 ✅

| 项目 | 状态 | 详情 |
|------|------|------|
| Commission V5.0 部署 | ✅ 完成 | `0x5E8023659620DFD296f48f92Da0AE48c9CB443f0` |
| initializeV5Rates() | ✅ 完成 | 所有费率已初始化 |
| Relayer 配置 | ✅ 完成 | `0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3` |

### 1.2 端到端测试 ✅

| 测试项 | 状态 |
|--------|------|
| 合约配置验证 | ✅ 通过 |
| V5.0 费率配置 | ✅ 通过 |
| 分账计算验证 | ✅ 通过 |
| Relayer 权限验证 | ✅ 通过 |
| 常量验证 | ✅ 通过 |
| USDC 余额检查 | ✅ 通过 |

### 1.3 单元测试 ✅

| 测试组 | 通过/总数 |
|--------|-----------|
| 原有功能测试 | 16/16 |
| V5.0 新功能测试 | 15/15 |
| **总计** | **31/31** |

---

## 二、主网部署前必须完成的工作

### 2.1 安全审计 ⏳

- [ ] 内部代码审查
- [ ] 外部安全审计（如需要）
- [ ] 漏洞修复验证

### 2.2 主网配置准备 ⏳

- [ ] **主网 USDC 地址**: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` (BSC)
- [ ] **主网 Treasury 地址**: [待确认]
- [ ] **主网 Rebate Pool 地址**: [待确认]
- [ ] **主网 Relayer 地址**: [待确认]
- [ ] **主网部署钱包**: [待确认，需要足够 BNB]

### 2.3 环境变量准备 ⏳

创建主网 `.env` 配置：

```bash
# 主网配置
BSC_RPC_URL=https://bsc-dataseed.binance.org
CHAIN_ID=56
PRIVATE_KEY=<主网部署私钥>

# 主网合约地址（部署后填写）
COMMISSION_CONTRACT_ADDRESS=<待部署>
SETTLEMENT_TOKEN_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
PAYMIND_TREASURY_ADDRESS=<待确认>
SYSTEM_REBATE_POOL_ADDRESS=<待确认>
RELAYER_ADDRESS=<待确认>

# BSCScan API
BSCSCAN_API_KEY=<你的API Key>
```

### 2.4 Gas 费用估算 ⏳

| 操作 | 预估 Gas | 预估费用 (5 gwei) |
|------|----------|-------------------|
| 部署 Commission | ~3,000,000 | ~0.015 BNB |
| configureSettlementToken | ~100,000 | ~0.0005 BNB |
| initializeV5Rates | ~200,000 | ~0.001 BNB |
| setRelayer | ~50,000 | ~0.00025 BNB |
| **总计** | ~3,350,000 | **~0.017 BNB** |

建议准备 **0.1 BNB** 以应对 Gas 波动。

---

## 三、主网部署步骤

### 3.1 部署前检查

```bash
# 1. 确认网络配置
cat hardhat.config.ts | grep -A5 "bsc:"

# 2. 确认钱包余额
npx hardhat run scripts/check-balance.ts --network bsc

# 3. 确认环境变量
echo $PRIVATE_KEY | head -c 10
echo $BSC_RPC_URL
```

### 3.2 执行部署

```bash
# 1. 编译合约
npx hardhat compile

# 2. 部署到主网
npx hardhat run scripts/deploy-commission-v5.ts --network bsc

# 3. 记录新合约地址
# 输出示例: Commission V5.0 deployed to: 0x...
```

### 3.3 验证合约

```bash
npx hardhat verify --network bsc <NEW_CONTRACT_ADDRESS>
```

### 3.4 更新配置

1. 更新 `contract/.env`:
   ```
   COMMISSION_CONTRACT_ADDRESS=<新主网地址>
   ```

2. 更新 `backend/.env`:
   ```
   COMMISSION_CONTRACT_ADDRESS=<新主网地址>
   ```

3. 更新 `deployment-res-bsc-56.json`

4. 重启后端服务

---

## 四、部署后验证

### 4.1 合约验证

```bash
# 运行端到端测试（修改地址后）
npx hardhat run scripts/test-commission-v5-e2e.ts --network bsc
```

### 4.2 功能验证清单

- [ ] 合约配置正确
- [ ] V5.0 费率正确
- [ ] 分账计算正确
- [ ] Relayer 权限正确
- [ ] 可以执行 QuickPay 分账
- [ ] 可以执行 AutoPay 分账
- [ ] 可以执行扫描商品分账

### 4.3 监控设置

- [ ] 设置合约事件监控
- [ ] 设置异常交易告警
- [ ] 设置资金流监控
- [ ] 设置 Gas 费用监控

---

## 五、回滚计划

### 5.1 紧急暂停

```javascript
// 如果发现问题，立即暂停合约
await commission.pause();
```

### 5.2 回滚到旧合约

1. 更新 `.env` 文件中的合约地址为旧地址
2. 重启后端服务
3. 通知相关团队

### 5.3 问题调查

1. 检查交易日志
2. 分析失败原因
3. 修复问题后重新部署

---

## 六、相关文档

| 文档 | 路径 |
|------|------|
| 分佣机制设计 | `docs/COMMISSION_MECHANISM_V5_DRAFT.md` |
| 测试报告 | `docs/COMMISSION_V5_TEST_REPORT.md` |
| 部署指南 | `docs/COMMISSION_V5_DEPLOYMENT_GUIDE.md` |
| 安全审计报告 | `contract/SECURITY_AUDIT_REPORT.md` |

---

## 七、联系方式

| 角色 | 联系方式 |
|------|----------|
| 技术负责人 | [待填写] |
| 运维团队 | [待填写] |
| 安全团队 | [待填写] |

---

**文档更新时间**: 2026-01-16  
**下次审核时间**: 主网部署前
