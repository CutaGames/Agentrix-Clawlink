# Commission V5.0 部署指南

**日期**: 2026年1月16日  
**版本**: V5.0  
**状态**: ✅ 测试网部署完成

---

## 一、测试网部署信息

### 1.1 合约地址

| 合约 | 地址 | 网络 |
|------|------|------|
| **Commission V5.0** | `0x5E8023659620DFD296f48f92Da0AE48c9CB443f0` | BSC Testnet |
| **AutoPay V5.0** | `0xEb9bEa57Fc2924BBdbCD2a8eE81388F4d5B23058` | BSC Testnet |
| **PaymentRouter V5.0** | `0xA72ecad894Ce0659E0be83B5423E765B831E156a` | BSC Testnet |
| **X402Adapter V5.0** | `0x3Fd34DEB93B144e9de3d854b1aBb792dCe9D27e2` | BSC Testnet |
| **ERC8004SessionManager V5.0** | `0xf94E5C7adc5bDA0bD95Cb880c5a5489562f694B7` | BSC Testnet |
| Settlement Token (USDC) | `0xc23453b4842FDc4360A0a3518E2C0f51a2069386` | BSC Testnet |
| AuditProof | `0xBE398F15aE8c4FbdC727b95E087B8251147Fd99A` | BSC Testnet |
| Relayer | `0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3` | BSC Testnet |

### 1.2 BSCScan 链接

- **合约地址**: https://testnet.bscscan.com/address/0x5E8023659620DFD296f48f92Da0AE48c9CB443f0

---

## 二、.env 文件更新

### 2.1 contract/.env 更新

请将以下内容更新到 `contract/.env` 文件：

```bash
# V5.0 合约地址
COMMISSION_CONTRACT_ADDRESS=0x5E8023659620DFD296f48f92Da0AE48c9CB443f0
AUTO_PAY_ADDRESS=0xEb9bEa57Fc2924BBdbCD2a8eE81388F4d5B23058
PAYMENT_ROUTER_ADDRESS=0xA72ecad894Ce0659E0be83B5423E765B831E156a
X402_ADAPTER_ADDRESS=0x3Fd34DEB93B144e9de3d854b1aBb792dCe9D27e2
ERC8004_SESSION_MANAGER_ADDRESS=0xf94E5C7adc5bDA0bD95Cb880c5a5489562f694B7
```

### 2.2 backend/.env 更新

请将以下内容更新到 `backend/.env` 文件：

```bash
# V5.0 合约地址
COMMISSION_CONTRACT_ADDRESS=0x5E8023659620DFD296f48f92Da0AE48c9CB443f0
AUTO_PAY_ADDRESS=0xEb9bEa57Fc2924BBdbCD2a8eE81388F4d5B23058
PAYMENT_ROUTER_ADDRESS=0xA72ecad894Ce0659E0be83B5423E765B831E156a
X402_ADAPTER_ADDRESS=0x3Fd34DEB93B144e9de3d854b1aBb792dCe9D27e2
ERC8004_SESSION_MANAGER_ADDRESS=0xf94E5C7adc5bDA0bD95Cb880c5a5489562f694B7
```

### 2.3 地址变更摘要

| 合约 | 旧地址 | 新地址 |
|------|--------|--------|
| Commission | `0xD7F033fbB1AaD7E351CB8127E9Ff0Be37cACA84A` | `0x5E8023659620DFD296f48f92Da0AE48c9CB443f0` |
| AutoPay | `0xA76D147Bb80138059534CB256F62F9Ee3D848dc3` | `0xEb9bEa57Fc2924BBdbCD2a8eE81388F4d5B23058` |
| PaymentRouter | `0x59c4DDaD35e8bf391D9D8978f63DE72a7c778c06` | `0xA72ecad894Ce0659E0be83B5423E765B831E156a` |
| X402Adapter | `0x8Cfd030D0506F21e8AfbbC249262E3C0F2dc3EFB` | `0x3Fd34DEB93B144e9de3d854b1aBb792dCe9D27e2` |
| ERC8004SessionManager | `0xCF3cC47b5CC4299b33d748C431f0C40C2fdFb6B4` | `0xf94E5C7adc5bDA0bD95Cb880c5a5489562f694B7` |

---

## 三、端到端测试结果

### 3.1 单元测试摘要

**总计: 54/54 测试通过** ✅

| 合约 | 测试数 | 结果 |
|------|--------|------|
| AutoPay | 11 | ✅ 全部通过 |
| Commission | 28 | ✅ 全部通过 |
| PaymentRouter | 4 | ✅ 全部通过 |
| X402Adapter | 8 | ✅ 全部通过 |

### 3.2 端到端测试摘要

**总计: 16/16 测试通过** ✅

| 测试项 | 结果 |
|--------|------|
| Commission: Owner configured | ✅ 通过 |
| Commission: Settlement token configured | ✅ 通过 |
| Commission: X402 channel fee rate | ✅ 通过 |
| Commission: Relayer configured | ✅ 通过 |
| AutoPay: Owner configured | ✅ 通过 |
| AutoPay: Payment token configured | ✅ 通过 |
| AutoPay: Commission contract configured | ✅ 通过 |
| AutoPay: Split mode enabled | ✅ 通过 |
| PaymentRouter: Owner configured | ✅ 通过 |
| X402Adapter: Owner configured | ✅ 通过 |
| X402Adapter: PaymentRouter configured | ✅ 通过 |
| X402Adapter: Relayer configured | ✅ 通过 |
| ERC8004SessionManager: Owner configured | ✅ 通过 |
| ERC8004SessionManager: Relayer configured | ✅ 通过 |
| USDC: Token info | ✅ 通过 |
| USDC: Tester balance | ✅ 通过 |

### 3.2 费率验证

| 配置项 | 期望值 | 实际值 | 状态 |
|--------|--------|--------|------|
| X402 Channel Fee | 0% | 0% | ✅ |
| Scanned UCP | 1% | 1% | ✅ |
| Scanned X402 | 1% | 1% | ✅ |
| Scanned FT | 0.3% | 0.3% | ✅ |
| Scanned NFT | 0.3% | 0.3% | ✅ |
| COMPOSITE Platform | 3% | 3% | ✅ |
| COMPOSITE Pool | 7% | 7% | ✅ |

### 3.3 分账计算验证

**输入**: 100 USDC, LOGIC 层级, 双 Agent

| 分账项 | 期望值 | 实际值 | 状态 |
|--------|--------|--------|------|
| Merchant | 95 USDC | 95 USDC | ✅ |
| Platform Fee | 1 USDC | 1 USDC | ✅ |
| Executor Fee | 2.8 USDC | 2.8 USDC | ✅ |
| Referrer Fee | 1.2 USDC | 1.2 USDC | ✅ |

---

## 四、主网部署前检查清单

### 4.1 合约安全检查

- [ ] 代码审计完成
- [ ] 所有单元测试通过 (31/31)
- [ ] 端到端测试通过 (9/9)
- [ ] 权限控制验证
  - [ ] `onlyOwner` 函数正确限制
  - [ ] `onlyRelayer` 函数正确限制
- [ ] 重入攻击防护 (`nonReentrant`)
- [ ] 暂停机制 (`whenNotPaused`)

### 4.2 配置检查

- [ ] 主网 USDC 地址确认
- [ ] 主网 Treasury 地址确认
- [ ] 主网 Rebate Pool 地址确认
- [ ] 主网 Relayer 地址确认
- [ ] Gas 费用估算

### 4.3 后端集成检查

- [ ] `commission-calculator.service.ts` 更新完成
- [ ] `financial-architecture.config.ts` 更新完成
- [ ] 合约 ABI 更新
- [ ] 合约地址配置更新

### 4.4 前端集成检查

- [ ] 管理员系统配置页面完成
- [ ] API 端点 `/api/admin/commission-config` 完成
- [ ] 合约地址配置更新

### 4.5 监控和告警

- [ ] 合约事件监控设置
- [ ] 异常交易告警
- [ ] 资金流监控

---

## 五、主网部署步骤

### 5.1 准备工作

1. **更新 hardhat.config.ts** 中的主网配置
2. **准备主网私钥** (不要使用测试网私钥)
3. **准备足够的 BNB** 用于 Gas 费用
4. **确认主网合约地址**:
   - USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` (BSC 主网)
   - Treasury: [待确认]
   - Rebate Pool: [待确认]

### 5.2 部署命令

```bash
# 1. 编译合约
npx hardhat compile

# 2. 部署到主网
npx hardhat run scripts/deploy-commission-v5.ts --network bsc

# 3. 验证合约
npx hardhat verify --network bsc <NEW_CONTRACT_ADDRESS>
```

### 5.3 部署后配置

```bash
# 1. 初始化 V5.0 费率 (已在部署脚本中自动执行)
# 2. 设置 Relayer (已在部署脚本中自动执行)
# 3. 如需调整 X402 通道费:
# await commission.setX402ChannelFeeRate(30); // 0.3%
```

### 5.4 更新配置文件

1. 更新 `contract/.env`:
   ```
   COMMISSION_CONTRACT_ADDRESS=<NEW_MAINNET_ADDRESS>
   ```

2. 更新 `backend/.env`:
   ```
   COMMISSION_CONTRACT_ADDRESS=<NEW_MAINNET_ADDRESS>
   ```

3. 重启后端服务

---

## 六、回滚计划

如果主网部署出现问题：

1. **立即暂停合约**:
   ```solidity
   await commission.pause();
   ```

2. **切换回旧合约**:
   - 更新 `.env` 文件中的合约地址为旧地址
   - 重启后端服务

3. **调查问题**:
   - 检查交易日志
   - 分析失败原因

---

## 七、联系方式

如有问题，请联系：
- 技术负责人: [待填写]
- 运维团队: [待填写]

---

**文档更新时间**: 2026-01-16  
**下次审核时间**: 主网部署前
