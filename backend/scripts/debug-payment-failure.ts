/**
 * 调试支付失败的脚本
 * 检查 Session 状态、签名验证等
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

const ERC8004_ADDRESS = '0xFfEf72198A71B288EfE403AC07f9c60A1a99f29e';
const USDT_ADDRESS = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';
const COMMISSION_ADDRESS = '0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C';

// 新的 Session ID
const SESSION_ID = '0x174aef6f57ac7311b9d97e62750d990ecbbb8052f15ef32b7f5a04383058e7d5';

// 用户钱包
const USER_WALLET = '0xdf8e26fab0553ec755073f1c923c14942ad0d816';

// Session Signer (用于签名的密钥)
const SESSION_SIGNER = '0x2572bded06dB261d3FC0d8439ea8bb162e7ba1dC';

const ERC8004_ABI = [
  'function sessions(bytes32) view returns (address signer, address owner, uint256 singleLimit, uint256 dailyLimit, uint256 usedToday, uint256 expiry, uint256 lastResetDate, bool isActive)',
  'function executeWithSession(bytes32, address, uint256, bytes32, bytes)',
  'function token() view returns (address)',
  'function getSessionHash(bytes32 sessionId, address to, uint256 amount, bytes32 paymentId) view returns (bytes32)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function main() {
  const rpcUrl = process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet.nodereal.io/v1/1eefed273dc64160afd5e328e6c518d6';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  console.log('=== 调试支付失败 ===\n');
  
  // 1. 检查 Session 状态
  const sessionManager = new ethers.Contract(ERC8004_ADDRESS, ERC8004_ABI, provider);
  
  console.log('1. 检查 Session 状态...');
  console.log(`   Session ID: ${SESSION_ID}`);
  
  try {
    const session = await sessionManager.sessions(SESSION_ID);
    console.log(`   ✅ Session 存在!`);
    console.log(`   Signer: ${session.signer}`);
    console.log(`   Owner: ${session.owner}`);
    console.log(`   Single Limit: ${session.singleLimit.toString()}`);
    console.log(`   Daily Limit: ${session.dailyLimit.toString()}`);
    console.log(`   Used Today: ${session.usedToday.toString()}`);
    console.log(`   Expiry: ${new Date(Number(session.expiry) * 1000).toISOString()}`);
    console.log(`   Is Active: ${session.isActive}`);
    
    // 检查 Session 是否过期
    const now = Math.floor(Date.now() / 1000);
    if (Number(session.expiry) < now) {
      console.log(`   ❌ Session 已过期! 过期时间: ${new Date(Number(session.expiry) * 1000).toISOString()}`);
    }
    
    // 检查 Session 是否激活
    if (!session.isActive) {
      console.log(`   ❌ Session 未激活!`);
    }
    
    // 检查 Owner 是否匹配
    if (session.owner.toLowerCase() !== USER_WALLET.toLowerCase()) {
      console.log(`   ⚠️ Owner 不匹配! 期望: ${USER_WALLET}, 实际: ${session.owner}`);
    } else {
      console.log(`   ✅ Owner 匹配用户钱包`);
    }
    
    // 检查 Signer
    if (session.signer.toLowerCase() === SESSION_SIGNER.toLowerCase()) {
      console.log(`   ✅ Signer 匹配预期: ${SESSION_SIGNER}`);
    } else {
      console.log(`   ⚠️ Signer: ${session.signer}`);
    }
    
  } catch (error: any) {
    console.log(`   ❌ 无法获取 Session: ${error.message}`);
  }
  
  // 2. 检查 USDT 余额和授权
  console.log('\n2. 检查 USDT 余额和授权...');
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
  
  try {
    const decimals = await usdt.decimals();
    console.log(`   Token Decimals: ${decimals}`);
    
    const balance = await usdt.balanceOf(USER_WALLET);
    console.log(`   用户 USDT 余额: ${ethers.formatUnits(balance, decimals)} USDT`);
    
    const allowanceToSession = await usdt.allowance(USER_WALLET, ERC8004_ADDRESS);
    console.log(`   授权给 SessionManager: ${ethers.formatUnits(allowanceToSession, decimals)} USDT`);
    
    const allowanceToCommission = await usdt.allowance(USER_WALLET, COMMISSION_ADDRESS);
    console.log(`   授权给 Commission: ${ethers.formatUnits(allowanceToCommission, decimals)} USDT`);
    
    // 检查是否足够 0.1 USDT
    const requiredAmount = ethers.parseUnits('0.1', decimals);
    if (balance < requiredAmount) {
      console.log(`   ❌ 余额不足! 需要: 0.1 USDT, 实际: ${ethers.formatUnits(balance, decimals)} USDT`);
    } else {
      console.log(`   ✅ 余额充足`);
    }
    
    if (allowanceToSession < requiredAmount) {
      console.log(`   ❌ 授权给 SessionManager 不足! 需要: 0.1 USDT`);
    } else {
      console.log(`   ✅ 授权给 SessionManager 充足`);
    }
    
  } catch (error: any) {
    console.log(`   ❌ 检查 USDT 失败: ${error.message}`);
  }
  
  // 3. 检查合约 token 地址
  console.log('\n3. 检查合约配置...');
  try {
    const tokenAddress = await sessionManager.token();
    console.log(`   SessionManager token: ${tokenAddress}`);
    if (tokenAddress.toLowerCase() !== USDT_ADDRESS.toLowerCase()) {
      console.log(`   ⚠️ Token 地址不匹配! 期望: ${USDT_ADDRESS}`);
    } else {
      console.log(`   ✅ Token 地址匹配`);
    }
  } catch (error: any) {
    console.log(`   无法获取 token 地址: ${error.message}`);
  }
  
  // 4. 模拟签名验证
  console.log('\n4. 测试签名验证...');
  
  const testPaymentId = ethers.keccak256(ethers.toUtf8Bytes('test-payment-' + Date.now()));
  const testAmount = 100000n; // 0.1 USDT in 6 decimals
  const testTo = COMMISSION_ADDRESS;
  
  console.log(`   Test Payment ID: ${testPaymentId}`);
  console.log(`   Test Amount: ${testAmount} (0.1 USDT)`);
  console.log(`   Test To: ${testTo}`);
  
  // 计算消息哈希 (模拟前端签名逻辑)
  const messageHash = ethers.solidityPackedKeccak256(
    ['bytes32', 'address', 'uint256', 'bytes32'],
    [SESSION_ID, testTo, testAmount, testPaymentId]
  );
  console.log(`   Message Hash: ${messageHash}`);
  
  // 5. 检查单笔限额
  console.log('\n5. 检查限额...');
  try {
    const session = await sessionManager.sessions(SESSION_ID);
    const singleLimit = session.singleLimit;
    const dailyLimit = session.dailyLimit;
    const usedToday = session.usedToday;
    
    console.log(`   Single Limit: ${singleLimit.toString()}`);
    console.log(`   Daily Limit: ${dailyLimit.toString()}`);
    console.log(`   Used Today: ${usedToday.toString()}`);
    
    const testAmount6Decimals = 100000n; // 0.1 USDT
    const testAmount18Decimals = 100000000000000000n; // 0.1 in 18 decimals
    
    // 检查哪种精度能通过限额检查
    if (singleLimit >= testAmount6Decimals) {
      console.log(`   ✅ 6 decimals (100000) 通过单笔限额`);
    } else {
      console.log(`   ❌ 6 decimals (100000) 超过单笔限额`);
    }
    
    if (singleLimit >= testAmount18Decimals) {
      console.log(`   ✅ 18 decimals 通过单笔限额`);
    } else {
      console.log(`   ❌ 18 decimals 超过单笔限额`);
    }
    
    // 检查限额是否使用 6 decimals
    const singleLimitNum = Number(singleLimit);
    if (singleLimitNum < 1000000000) {
      console.log(`   📊 限额似乎使用 6 decimals (< 1 billion)`);
    } else if (singleLimitNum < 1000000000000000000n) {
      console.log(`   📊 限额似乎使用 18 decimals`);
    }
    
  } catch (error: any) {
    console.log(`   ❌ 检查限额失败: ${error.message}`);
  }
  
  console.log('\n=== 调试完成 ===');
}

main().catch(console.error);
