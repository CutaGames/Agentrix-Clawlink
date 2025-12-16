/**
 * 测试 USDT transferFrom 是否能正常工作
 */

import { ethers, Contract, Wallet } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const USDT_ADDRESS = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';
const ERC8004_ADDRESS = '0xFfEf72198A71B288EfE403AC07f9c60A1a99f29e';
const USER_WALLET = '0xdf8e26fab0553ec755073f1c923c14942ad0d816';
const COMMISSION_ADDRESS = '0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
];

async function main() {
  const rpcUrl = process.env.BSC_TESTNET_RPC_URL || 'https://bsc-testnet.nodereal.io/v1/1eefed273dc64160afd5e328e6c518d6';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  console.log('=== 测试 USDT transferFrom ===\n');
  
  const usdt = new Contract(USDT_ADDRESS, ERC20_ABI, provider);
  
  // 1. 获取代币信息
  console.log('1. 代币信息...');
  const name = await usdt.name();
  const symbol = await usdt.symbol();
  const decimals = await usdt.decimals();
  console.log(`   名称: ${name}`);
  console.log(`   符号: ${symbol}`);
  console.log(`   精度: ${decimals}`);
  
  // 2. 检查余额
  console.log('\n2. 检查余额...');
  const balance = await usdt.balanceOf(USER_WALLET);
  console.log(`   用户余额: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  
  // 3. 检查授权
  console.log('\n3. 检查授权...');
  const allowance = await usdt.allowance(USER_WALLET, ERC8004_ADDRESS);
  console.log(`   授权给 ERC8004: ${ethers.formatUnits(allowance, decimals)} ${symbol}`);
  
  // 4. 计算转账金额
  console.log('\n4. 计算转账金额...');
  const amount6Decimals = 100000n; // 0.1 in 6 decimals
  // 转换到 18 decimals
  const amount18Decimals = amount6Decimals * BigInt(10 ** 12); // 0.1 in 18 decimals
  console.log(`   签名/限额金额 (6 decimals): ${amount6Decimals}`);
  console.log(`   实际转账金额 (18 decimals): ${amount18Decimals}`);
  console.log(`   转账金额 (人类可读): ${ethers.formatUnits(amount18Decimals, 18)} ${symbol}`);
  
  // 5. 检查转账是否可行
  console.log('\n5. 检查转账是否可行...');
  if (balance >= amount18Decimals) {
    console.log(`   ✅ 余额充足`);
  } else {
    console.log(`   ❌ 余额不足! 需要: ${ethers.formatUnits(amount18Decimals, decimals)}, 实际: ${ethers.formatUnits(balance, decimals)}`);
  }
  
  if (allowance >= amount18Decimals) {
    console.log(`   ✅ 授权充足`);
  } else {
    console.log(`   ❌ 授权不足! 需要: ${ethers.formatUnits(amount18Decimals, decimals)}, 实际: ${ethers.formatUnits(allowance, decimals)}`);
  }
  
  // 6. 模拟 SessionManager 调用 transferFrom
  console.log('\n6. 模拟 transferFrom 调用...');
  
  // 创建 Relayer 钱包
  const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
  if (!relayerPrivateKey) {
    console.log('   ⚠️ RELAYER_PRIVATE_KEY 未设置，无法测试');
    return;
  }
  
  const relayerWallet = new Wallet(relayerPrivateKey, provider);
  const usdtWithRelayer = new Contract(USDT_ADDRESS, ERC20_ABI, relayerWallet);
  
  console.log(`   Relayer 地址: ${relayerWallet.address}`);
  
  // 尝试 staticCall 模拟 transferFrom（从 ERC8004 合约的角度）
  // 注意：这会失败，因为只有 ERC8004 合约有授权
  console.log(`   ⚠️ 注意: 只有 ERC8004 合约可以调用 transferFrom（因为授权是给它的）`);
  
  // 7. 使用 call 模拟 ERC8004 合约调用 transferFrom
  console.log('\n7. 检查 ERC8004 合约代码...');
  const code = await provider.getCode(ERC8004_ADDRESS);
  console.log(`   合约代码长度: ${code.length} 字符`);
  if (code === '0x') {
    console.log(`   ❌ 合约地址没有代码!`);
  } else {
    console.log(`   ✅ 合约存在`);
  }
  
  // 8. 检查 Commission 合约代码
  console.log('\n8. 检查 Commission 合约代码...');
  const commissionCode = await provider.getCode(COMMISSION_ADDRESS);
  console.log(`   合约代码长度: ${commissionCode.length} 字符`);
  if (commissionCode === '0x') {
    console.log(`   ❌ Commission 合约地址没有代码!`);
  } else {
    console.log(`   ✅ Commission 合约存在`);
  }
  
  console.log('\n=== 测试完成 ===');
  console.log('\n📋 总结:');
  console.log(`   - USDT 精度: ${decimals} (${decimals === 18 ? '与预期一致' : '⚠️ 不是 6 decimals!'})`);
  console.log(`   - 用户余额: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  console.log(`   - ERC8004 授权: ${ethers.formatUnits(allowance, decimals)} ${symbol}`);
  console.log(`   - 转账金额: ${ethers.formatUnits(amount18Decimals, decimals)} ${symbol}`);
  console.log(`   - 余额充足: ${balance >= amount18Decimals ? '✅' : '❌'}`);
  console.log(`   - 授权充足: ${allowance >= amount18Decimals ? '✅' : '❌'}`);
}

main().catch(console.error);
