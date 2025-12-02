# PayMind Smart Contracts

PayMind V2.2 智能合约

## 技术栈

- **Solidity**: 0.8.20
- **Hardhat**: 开发框架
- **OpenZeppelin**: 安全合约库

## 合约列表

### 1. PaymentRouter
支付路由合约，支持多种支付方式的路由选择。

**功能**:
- 支付路由选择
- 支付记录管理
- 余额管理

### 2. X402Adapter
X402协议适配器合约，处理X402协议支付。

**功能**:
- X402支付会话创建
- 批量交易处理
- Gas优化

### 3. AutoPay
自动支付合约，管理用户对Agent的自动支付授权。

**功能**:
- 授权管理
- 自动支付执行
- 限额控制

### 4. Commission
分润结算合约，管理Agent和商户的分润记录与自动结算。

**功能**:
- 分润记录
- 自动结算
- 多币种支持

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 编译合约

```bash
npm run compile
```

### 3. 运行测试

```bash
npm run test
```

### 4. 部署到本地网络

```bash
# 启动本地节点
npm run node

# 在另一个终端部署
npm run deploy:local
```

### 5. 部署到测试网

配置 `.env` 文件：

```env
SEPOLIA_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

然后运行：

```bash
npm run deploy:testnet
```

## 项目结构

```
contracts/
├── PaymentRouter.sol    # 支付路由合约
├── X402Adapter.sol      # X402适配器合约
├── AutoPay.sol          # 自动支付合约
└── Commission.sol       # 分润结算合约

scripts/
└── deploy.ts            # 部署脚本

test/
└── (测试文件)

hardhat.config.ts        # Hardhat配置
```

## 安全注意事项

1. 所有合约都使用了 OpenZeppelin 的安全库
2. 实现了 ReentrancyGuard 防止重入攻击
3. 使用 Ownable 进行权限控制
4. 部署前请进行安全审计

## 开发

### 添加新合约

1. 在 `contracts/` 目录创建新的 `.sol` 文件
2. 在 `scripts/deploy.ts` 中添加部署逻辑
3. 编写测试文件
4. 运行测试确保功能正常

### 代码格式化

使用 Prettier 格式化代码：

```bash
npx prettier --write "contracts/**/*.sol"
```

## 部署地址

部署后，合约地址会保存在 `deployments/` 目录中。

