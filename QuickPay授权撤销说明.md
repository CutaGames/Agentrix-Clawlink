# QuickPay授权撤销说明

## 概述

取消QuickPay授权需要两个步骤：
1. **撤销Session**（链上操作）- 禁用Session，防止后续支付
2. **撤销USDT授权**（链上操作）- 将USDT授权额度设为0，彻底取消授权

## 撤销方式

### 方式1: 通过Session管理界面撤销（推荐）

1. **进入Session管理页面**：
   - 在支付页面点击"管理Session"或"QuickPay设置"
   - 或访问用户后台的QuickPay管理页面

2. **撤销Session**：
   - 找到要撤销的Session
   - 点击"撤销"按钮
   - 确认撤销操作

3. **自动撤销USDT授权**：
   - 系统会自动调用链上交易，将USDT授权额度设为0
   - 钱包会弹出确认对话框
   - 确认后授权被撤销

### 方式2: 仅撤销USDT授权（保留Session）

如果只想撤销USDT授权但保留Session（Session将无法使用，但可以稍后重新授权）：

```typescript
// 在前端代码中调用
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const tokenAddress = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet USDT
const erc8004Address = '0x88b3993250Da39041C9263358C3c24C6a69a955e';

const tokenContract = new ethers.Contract(
  tokenAddress,
  ['function approve(address spender, uint256 amount) returns (bool)'],
  signer
);

// 将授权额度设为0
const tx = await tokenContract.approve(erc8004Address, 0);
await tx.wait();
```

## 实现细节

### 撤销Session的完整流程

**前端实现**（`useSessionManager.ts` 和 `SessionManager.tsx`）：

```typescript
const revokeSession = async (sessionId: string) => {
  // 1. 撤销链上Session（调用后端API）
  await paymentApi.revokeSession(sessionId);

  // 2. 撤销USDT授权（链上交易）
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const tokenContract = new ethers.Contract(
    tokenAddress,
    ['function approve(address spender, uint256 amount) returns (bool)'],
    signer
  );

  // 将授权额度设为0
  const revokeTx = await tokenContract.approve(erc8004Address, 0);
  await revokeTx.wait();
};
```

**后端实现**（`session.service.ts`）：

```typescript
async revokeSession(userId: string, sessionId: string) {
  // 更新数据库状态
  session.status = SessionStatus.REVOKED;
  await this.sessionRepository.save(session);
  
  // 注意：链上撤销需要用户钱包签名，由前端调用合约完成
}
```

**链上合约**（`ERC8004SessionManager.sol`）：

```solidity
function revokeSession(bytes32 sessionId) external {
    Session storage session = sessions[sessionId];
    require(session.owner == msg.sender, "Not session owner");
    require(session.isActive, "Session already revoked");
    
    session.isActive = false;
    emit SessionRevoked(sessionId, msg.sender);
}
```

## 撤销后的影响

### 撤销Session后：
- ✅ Session状态变为`REVOKED`
- ✅ 无法使用该Session进行QuickPay支付
- ✅ 链上Session被标记为`isActive = false`
- ✅ 后续支付请求会被拒绝

### 撤销USDT授权后：
- ✅ USDT授权额度变为0
- ✅ ERC8004合约无法从用户钱包转账USDT
- ✅ 即使Session未撤销，也无法完成支付（会失败）

## 重新启用QuickPay

如果撤销后想重新启用QuickPay：

1. **创建新的Session**：
   - 重新创建Session时会自动授权USDT
   - 或手动授权USDT后使用现有Session

2. **仅重新授权USDT**（如果Session未撤销）：
   - 在创建Session时，系统会自动检查并授权
   - 或手动调用`approve(erc8004Address, MaxUint256)`

## 安全建议

1. **定期检查授权**：
   - 定期查看钱包中的代币授权情况
   - 使用BSCScan等工具检查授权额度

2. **撤销未使用的授权**：
   - 如果不再使用QuickPay，及时撤销授权
   - 减少安全风险

3. **使用授权管理工具**：
   - 可以使用Revoke.cash等工具批量管理授权
   - 或使用钱包的授权管理功能

## 常见问题

### Q1: 撤销Session后，USDT授权会自动撤销吗？

**A**: 是的。在最新实现中，撤销Session时会自动撤销USDT授权。但这是两个独立的链上操作：
- Session撤销：调用ERC8004合约的`revokeSession`
- USDT授权撤销：调用USDT合约的`approve(erc8004Address, 0)`

### Q2: 只撤销USDT授权，不撤销Session可以吗？

**A**: 可以，但不推荐。这样Session仍然存在但无法使用，会造成混淆。建议同时撤销两者。

### Q3: 撤销授权需要支付Gas费用吗？

**A**: 是的。撤销USDT授权是一个链上交易，需要支付Gas费用（BNB）。

### Q4: 如何检查当前的USDT授权额度？

**A**: 可以通过以下方式检查：
```typescript
const tokenContract = new ethers.Contract(
  tokenAddress,
  ['function allowance(address owner, address spender) view returns (uint256)'],
  provider
);
const allowance = await tokenContract.allowance(userAddress, erc8004Address);
console.log('当前授权额度:', allowance.toString());
```

### Q5: 撤销后可以恢复吗？

**A**: 可以。撤销Session后可以创建新的Session，撤销USDT授权后可以重新授权。两者都是可逆的操作。

