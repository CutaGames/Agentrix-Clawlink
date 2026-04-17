/**
 * 验证新部署的 ERC8004SessionManager 合约
 */

import { ethers, Contract, Wallet } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// 新合约地址
const NEW_ERC8004_ADDRESS = '0x3310a6e841877f28C755bFb5aF90e6734EF059fA';
const USDT_ADDRESS = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';

const ERC8004_ABI = [
  'function relayer() view returns (address)',
  'function usdcToken() view returns (address)',
  'function owner() view returns (address)',
  'function sessions(bytes32) view returns (address signer, address owner, uint256 singleLimit, uint256 dailyLimit, uint256 usedToday, uint256 expiry, uint256 lastResetDate, bool isActive)',
  'function executeWithSession(bytes32 sessionId, address to, uint256 amount, bytes32 paymentId, bytes signature)',
];

async function main() {
  const rpcUrl = process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet.nodereal.io/v1/1eefed273dc64160afd5e328e6c518d6';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  console.log('=== 验证新部署的 ERC8004SessionManager 合约 ===\n');
  console.log(`合约地址: ${NEW_ERC8004_ADDRESS}\n`);
  
  // 1. 检查合约代码存在
  const code = await provider.getCode(NEW_ERC8004_ADDRESS);
  if (code === '0x') {
    console.log('❌ 合约地址没有代码!');
    return;
  }
  console.log(`✅ 合约代码存在 (${code.length} 字符)`);
  
  // 2. 检查 Relayer
  const contract = new Contract(NEW_ERC8004_ADDRESS, ERC8004_ABI, provider);
  
  const relayer = await contract.relayer();
  console.log(`✅ Relayer: ${relayer}`);
  
  // 3. 检查 Token
  const token = await contract.usdcToken();
  console.log(`✅ Token: ${token}`);
  
  if (token.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
    console.log('   Token 地址匹配 USDT ✓');
  } else {
    console.log('   ⚠️ Token 地址不匹配!');
  }
  
  // 4. 检查 Owner
  const owner = await contract.owner();
  console.log(`✅ Owner: ${owner}`);
  
  console.log('\n=== 验证完成 ===');
  console.log('\n📌 下一步:');
  console.log('1. 重启后端服务');
  console.log('2. 重启前端服务');
  console.log('3. 用户需要:');
  console.log(`   a. 授权 USDT 给新合约: ${NEW_ERC8004_ADDRESS}`);
  console.log('   b. 创建新的 Session');
  console.log('4. 然后再次测试 QuickPay 支付');
}

main().catch(console.error);
