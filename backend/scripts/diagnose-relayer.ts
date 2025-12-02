/**
 * Relayer 诊断脚本
 * 检查 Relayer 配置和状态，诊断为什么交易没有上链
 */

import { config } from 'dotenv';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import * as path from 'path';

// 加载环境变量
config({ path: path.join(__dirname, '../.env') });

const ERC8004_ABI = [
  'function getSession(bytes32) view returns (tuple(address signer, address owner, uint256 singleLimit, uint256 dailyLimit, uint256 usedToday, uint256 expiry, uint256 lastResetDate, bool isActive))',
  'function executeWithSession(bytes32, address, uint256, bytes32, bytes)',
];

async function diagnoseRelayer() {
  console.log('🔍 Relayer 诊断工具\n');

  // 1. 检查环境变量
  const rpcUrl = process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL;
  const contractAddress = process.env.ERC8004_CONTRACT_ADDRESS;
  const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;

  console.log('📋 配置检查:');
  console.log(`   RPC URL: ${rpcUrl ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`   ERC8004 合约地址: ${contractAddress || '❌ 未配置'}`);
  console.log(`   Relayer 私钥: ${relayerPrivateKey ? '✅ 已配置' : '❌ 未配置'}\n`);

  if (!rpcUrl || !contractAddress || !relayerPrivateKey) {
    console.log('❌ 缺少必需配置，无法继续诊断');
    return;
  }

  // 2. 初始化 Provider 和 Wallet
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const relayerWallet = new Wallet(relayerPrivateKey, provider);

    console.log('🔗 连接检查:');
    const network = await provider.getNetwork();
    console.log(`   网络: ${network.name} (Chain ID: ${network.chainId})`);
    
    const blockNumber = await provider.getBlockNumber();
    console.log(`   当前区块: ${blockNumber}`);
    console.log(`   Relayer 钱包地址: ${relayerWallet.address}\n`);

    // 3. 检查 Relayer 钱包余额
    console.log('💰 Relayer 钱包余额:');
    const balance = await provider.getBalance(relayerWallet.address);
    const balanceInEth = Number(balance) / 1e18;
    console.log(`   BNB 余额: ${balanceInEth.toFixed(6)} BNB`);
    
    if (balance === 0n) {
      console.log('   ❌ Relayer 钱包余额为 0，无法支付 Gas！');
      console.log('   💡 请向以下地址转账 BNB:');
      console.log(`      ${relayerWallet.address}`);
    } else if (balanceInEth < 0.001) {
      console.log('   ⚠️  Relayer 钱包余额过低，可能无法支付多次交易的 Gas');
    } else {
      console.log('   ✅ Relayer 钱包余额充足');
    }
    console.log('');

    // 4. 检查合约是否可访问
    console.log('📄 合约检查:');
    try {
      const contract = new Contract(contractAddress, ERC8004_ABI, provider);
      const code = await provider.getCode(contractAddress);
      
      if (code === '0x') {
        console.log(`   ❌ 合约地址 ${contractAddress} 没有代码，可能未部署或地址错误`);
      } else {
        console.log(`   ✅ 合约地址 ${contractAddress} 有代码，合约存在`);
        
        // 尝试调用一个 view 函数验证合约可访问
        try {
          // 使用一个不存在的 sessionId 测试（应该返回默认值或 revert）
          const testSessionId = '0x0000000000000000000000000000000000000000000000000000000000000000';
          await contract.getSession(testSessionId);
          console.log('   ✅ 合约可访问，view 函数调用成功');
        } catch (error: any) {
          if (error.message.includes('revert') || error.message.includes('Session not found')) {
            console.log('   ✅ 合约可访问（预期的 revert）');
          } else {
            console.log(`   ⚠️  合约访问异常: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      console.log(`   ❌ 合约检查失败: ${error.message}`);
    }
    console.log('');

    // 5. 检查最近的交易
    console.log('📊 最近交易检查:');
    try {
      // 获取 Relayer 钱包最近的交易
      const latestBlock = await provider.getBlock('latest');
      const recentBlocks = 1000; // 检查最近 1000 个区块
      const startBlock = Math.max(0, latestBlock.number - recentBlocks);
      
      console.log(`   检查区块范围: ${startBlock} - ${latestBlock.number}`);
      
      let txCount = 0;
      for (let i = latestBlock.number; i >= startBlock && txCount < 10; i--) {
        const block = await provider.getBlock(i, true);
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            // 类型守卫：确保 tx 是对象且有 from 和 hash 属性
            if (tx == null) continue;
            if (typeof tx !== 'object') continue;
            
            // 使用类型断言，因为我们已经检查了 tx 不是 null
            const txObj = tx as { from?: string; hash?: string };
            if (!txObj.from || !txObj.hash) continue;
            
            if (txObj.from.toLowerCase() === relayerWallet.address.toLowerCase()) {
              txCount++;
              const receipt = await provider.getTransactionReceipt(txObj.hash);
              console.log(`   ${txCount}. ${txObj.hash}`);
              console.log(`      区块: ${receipt.blockNumber}, 状态: ${receipt.status === 1 ? '✅ 成功' : '❌ 失败'}`);
              console.log(`      Gas 使用: ${receipt.gasUsed.toString()}`);
              if (txCount >= 5) break;
            }
          }
        }
      }
      
      if (txCount === 0) {
        console.log('   ⚠️  在最近 1000 个区块中未找到 Relayer 钱包的交易');
        console.log('   💡 这可能意味着：');
        console.log('      1. Relayer 没有发送任何交易');
        console.log('      2. 交易被发送到不同的网络');
        console.log('      3. RPC 节点不同步');
      }
    } catch (error: any) {
      console.log(`   ⚠️  无法检查最近交易: ${error.message}`);
    }
    console.log('');

    // 6. 测试发送一笔测试交易（dry run）
    console.log('🧪 测试交易（Dry Run）:');
    try {
      const contract = new Contract(contractAddress, ERC8004_ABI, relayerWallet);
      
      // 使用无效参数进行 static call（不会真正执行）
      const testSessionId = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const testTo = '0x0000000000000000000000000000000000000000';
      const testAmount = 0n;
      const testPaymentId = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const testSignature = '0x' + '00'.repeat(65);
      
      try {
        await contract.executeWithSession.staticCall(
          testSessionId,
          testTo,
          testAmount,
          testPaymentId,
          testSignature,
        );
        console.log('   ⚠️  Static call 意外成功（不应该成功）');
      } catch (error: any) {
        if (error.message.includes('revert') || error.message.includes('Session')) {
          console.log('   ✅ Static call 正常 revert（预期行为）');
          console.log('   ✅ Relayer 可以调用合约函数');
        } else {
          console.log(`   ⚠️  Static call 异常: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.log(`   ❌ 测试交易失败: ${error.message}`);
    }

    console.log('\n📋 诊断总结:');
    console.log('   如果所有检查都通过，但交易仍然没有上链，可能的原因：');
    console.log('   1. 交易发送失败但没有被捕获（检查后端日志）');
    console.log('   2. RPC 节点问题（交易没有真正广播）');
    console.log('   3. 网络拥堵导致交易延迟');
    console.log('   4. 交易被发送到错误的网络');

  } catch (error: any) {
    console.error(`❌ 诊断过程出错: ${error.message}`);
    console.error(error.stack);
  }
}

diagnoseRelayer().catch(console.error);

