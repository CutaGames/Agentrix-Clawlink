# PayMind V7.0 快速开始指南

**版本**: V7.0  
**日期**: 2025年1月

---

## 🚀 5分钟快速开始

### 1. 环境准备

```bash
# 确保已安装 Node.js 18+
node --version

# 安装依赖
npm install

# 后端依赖
cd backend
npm install

# 前端依赖
cd ../paymindfrontend
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=paymind

# Relayer 配置（测试用，生产环境请使用真实私钥）
RELAYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000001
RPC_URL=http://localhost:8545
ERC8004_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
USDC_ADDRESS=0x0000000000000000000000000000000000000000

# Provider 配置（可选，用于 Crypto-Rail）
MOONPAY_API_KEY=your_moonpay_api_key
PAYMIND_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

### 3. 运行数据库迁移

```bash
cd backend
npm run migration:run
```

### 4. 启动服务

**终端 1 - 后端**:
```bash
cd backend
npm run start:dev
```

**终端 2 - 前端**:
```bash
cd paymindfrontend
npm run dev
```

### 5. 访问应用

- 前端: http://localhost:3000
- 后端 API: http://localhost:3001
- Swagger 文档: http://localhost:3001/api

---

## 📝 使用示例

### 示例 1: 创建 Session

```typescript
// 前端代码
import { SessionKeyManager } from '@/lib/session-key-manager';
import { paymentApi } from '@/lib/api/payment.api';
import { useWeb3 } from '@/contexts/Web3Context';

function CreateSessionExample() {
  const { signMessage } = useWeb3();

  const handleCreateSession = async () => {
    // 1. 生成 Session Key（浏览器本地）
    const sessionKey = await SessionKeyManager.generateSessionKey();

    // 2. 使用主钱包签名授权
    const message = `Authorize Session Key: ${sessionKey.publicKey}`;
    const signature = await signMessage(message);

    // 3. 创建 Session
    const session = await paymentApi.createSession({
      signer: sessionKey.publicKey,
      singleLimit: 10 * 1e6, // 10 USDC (6 decimals)
      dailyLimit: 100 * 1e6, // 100 USDC
      expiryDays: 30,
      signature,
    });

    console.log('Session created:', session);
  };

  return <button onClick={handleCreateSession}>Create Session</button>;
}
```

### 示例 2: QuickPay 支付

```typescript
// 前端代码
import { SmartCheckout } from '@/components/payment/SmartCheckout';

function PaymentExample() {
  const order = {
    id: 'order_123',
    amount: 9.90,
    currency: 'USDC',
    description: 'Pro Subscription',
    merchantId: 'merchant_123',
    to: '0x...', // 商户地址
  };

  const handleSuccess = (result: any) => {
    console.log('Payment successful:', result);
  };

  return (
    <SmartCheckout
      order={order}
      onSuccess={handleSuccess}
    />
  );
}
```

### 示例 3: 管理 Session

```typescript
// 前端代码
import { SessionManager } from '@/components/payment/SessionManager';

function SessionManagementExample() {
  return <SessionManager />;
}
```

---

## 🔧 开发模式

### Mock 模式

如果合约未部署，系统会自动进入 Mock 模式：

- Relayer 服务会跳过链上验证
- Session 创建会生成模拟 sessionId
- 支付确认会立即返回成功

**注意**: Mock 模式仅用于开发测试，生产环境必须部署真实合约。

### 测试网部署

```bash
# 1. 配置测试网 RPC
export RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# 2. 部署合约
npx hardhat run scripts/deploy-erc8004.ts --network sepolia

# 3. 更新环境变量
export ERC8004_CONTRACT_ADDRESS=0x...
export USDC_ADDRESS=0x... # 测试网 USDC 地址
```

---

## 📊 API 测试

### 使用 Swagger

1. 访问 http://localhost:3001/api
2. 点击 "Authorize" 按钮
3. 输入 JWT Token
4. 测试各个端点

### 使用 curl

```bash
# Pre-Flight Check
curl -X GET "http://localhost:3001/payment/preflight?amount=10&currency=USDC" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 创建 Session
curl -X POST "http://localhost:3001/sessions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": "0x...",
    "singleLimit": 10000000,
    "dailyLimit": 100000000,
    "expiryDays": 30,
    "signature": "0x..."
  }'

# QuickPay
curl -X POST "http://localhost:3001/relayer/quickpay" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "0x...",
    "paymentId": "payment_123",
    "to": "0x...",
    "amount": "1000000",
    "signature": "0x...",
    "nonce": 1234567890
  }'
```

---

## 🐛 常见问题

### Q: Relayer 服务启动失败

**A**: 检查环境变量：
- `RELAYER_PRIVATE_KEY` 是否正确
- `RPC_URL` 是否可访问
- `ERC8004_CONTRACT_ADDRESS` 是否已部署

### Q: Pre-Flight Check 超时

**A**: 
- 检查 RPC 连接
- 确认合约地址正确
- 查看日志排查问题

### Q: Session Key 生成失败

**A**:
- 检查浏览器是否支持 Web Crypto API
- 确认 IndexedDB/LocalStorage 可用
- 查看浏览器控制台错误

### Q: 支付确认但未上链

**A**:
- 这是正常的！QuickPay 是即时确认 + 异步上链
- 检查 Relayer 队列状态: `GET /relayer/queue/status`
- 查看 Relayer 日志

---

## 📚 下一步

1. **阅读详细文档**:
   - `PayMind-V7.0-支付重构反馈与优化方案.md`
   - `PayMind-V7.0-技术实施指南.md`

2. **运行测试**:
   ```bash
   npm run test
   ```

3. **部署到测试网**:
   - 部署合约
   - 配置环境变量
   - 测试完整流程

4. **监控和优化**:
   - 监控 Relayer 队列
   - 优化 Gas 使用
   - 提升响应速度

---

## 🆘 获取帮助

- **文档**: 查看 `PayMind-V7.0-完整实施清单.md`
- **问题**: 查看日志文件
- **支持**: 联系开发团队

---

**文档版本**: V1.0  
**最后更新**: 2025年1月

