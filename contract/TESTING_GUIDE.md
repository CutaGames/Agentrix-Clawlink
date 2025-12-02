# PayMind 合约测试指南

## 📋 测试覆盖情况

### ✅ 已测试的合约

1. **PaymentRouter** - 支付路由功能
   - ✅ 设置支付通道
   - ✅ 路由支付
   - ✅ 金额验证

2. **X402Adapter** - X402 协议适配器
   - ✅ 创建支付会话
   - ✅ 执行支付（中继器）
   - ✅ 会话过期处理

3. **AutoPay** - 自动支付
   - ✅ 创建授权
   - ✅ 执行自动支付
   - ✅ 限额控制（单次/每日）
   - ✅ 授权撤销

4. **Commission** - 分润结算（已更新）
   - ✅ 配置结算代币和金库
   - ✅ 同步订单
   - ✅ 分发佣金（执行者有钱包/无钱包）
   - ✅ 记录分润（新版本）
   - ✅ 创建结算
   - ✅ 争议处理
   - ✅ 锁定期验证

## 🚀 本地测试步骤

### 1. 安装依赖

```bash
cd contract
npm install
```

### 2. 编译合约

```bash
npm run compile
```

### 3. 运行所有测试

```bash
npm run test
```

### 4. 运行特定测试文件

```bash
# 测试 Commission 合约
npx hardhat test test/Commission.test.ts

# 测试 PaymentRouter
npx hardhat test test/PaymentRouter.test.ts

# 测试 X402Adapter
npx hardhat test test/X402Adapter.test.ts

# 测试 AutoPay
npx hardhat test test/AutoPay.test.ts
```

### 5. 生成测试覆盖率报告

```bash
npm run coverage
```

## 📊 测试覆盖率目标

- **PaymentRouter**: 80%+
- **X402Adapter**: 75%+
- **AutoPay**: 85%+
- **Commission**: 80%+（新功能已覆盖）

## ⚠️ 测试注意事项

1. **MockERC20**: 测试使用 `MockERC20` 合约模拟 ERC20 代币
2. **时间依赖**: 某些测试涉及时间锁，可能需要调整时间戳
3. **Gas 限制**: 确保测试环境有足够的 Gas
4. **网络配置**: 本地测试使用 Hardhat 内置网络

## 🔍 测试环境

- **网络**: Hardhat 内置网络（localhost）
- **Solidity 版本**: 0.8.20
- **测试框架**: Mocha + Chai
- **断言库**: Chai + ethers.js

## 📝 测试最佳实践

1. **隔离测试**: 每个测试用例应该独立，不依赖其他测试
2. **清理状态**: 使用 `beforeEach` 重置状态
3. **事件验证**: 验证重要事件是否触发
4. **边界测试**: 测试边界条件和错误情况
5. **Gas 优化**: 验证 Gas 使用是否合理

## 🐛 常见问题

### 问题：测试失败，提示 "Contract not deployed"

**解决方案**: 确保在 `beforeEach` 中正确部署合约

### 问题：时间相关的测试失败

**解决方案**: 使用 `ethers.provider.getBlock("latest")` 获取当前区块时间，或使用 Hardhat 的时间旅行功能

### 问题：ERC20 代币余额不足

**解决方案**: 确保在测试前向合约转入足够的代币

## ✅ 部署前检查清单

- [ ] 所有测试通过
- [ ] 测试覆盖率达标
- [ ] 代码审查完成
- [ ] Gas 优化验证
- [ ] 安全审计（如需要）
- [ ] 部署脚本测试
- [ ] 环境变量配置正确

## 🚀 部署流程

1. **本地测试** ✅（当前步骤）
2. **测试网部署** → 使用 `npm run deploy:bsc-testnet`
3. **测试网验证** → 在 BSCScan 上验证合约
4. **测试网测试** → 在测试网上进行端到端测试
5. **主网部署** → 确认无误后部署到主网

