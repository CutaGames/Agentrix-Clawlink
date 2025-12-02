import { config } from 'dotenv';
import * as path from 'path';

// 加载.env文件
config({ path: path.join(__dirname, '../.env') });

console.log('🔍 检查Relayer配置...\n');

// 检查环境变量
const rpcUrl = process.env.RPC_URL;
const contractAddress = process.env.ERC8004_CONTRACT_ADDRESS;
const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;

console.log('1. RPC_URL:');
if (rpcUrl) {
  console.log(`   ✅ 已设置: ${rpcUrl}`);
  console.log(`   📝 长度: ${rpcUrl.length} 字符`);
  console.log(`   📝 去除空格后: "${rpcUrl.trim()}"`);
} else {
  console.log('   ❌ 未设置');
}

console.log('\n2. ERC8004_CONTRACT_ADDRESS:');
if (contractAddress) {
  const trimmed = contractAddress.trim();
  console.log(`   ✅ 已设置: ${trimmed.substring(0, 20)}...`);
  console.log(`   📝 原始长度: ${contractAddress.length} 字符`);
  console.log(`   📝 去除空格后长度: ${trimmed.length} 字符`);
  
  // 验证格式
  if (!trimmed.startsWith('0x')) {
    console.log('   ❌ 错误: 地址应该以 0x 开头');
  } else if (trimmed.length !== 42) {
    console.log(`   ❌ 错误: 地址长度应该是42字符（0x + 40个hex字符），实际是${trimmed.length}`);
  } else {
    // 验证hex字符
    const hexPart = trimmed.substring(2);
    if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
      console.log('   ❌ 错误: 地址包含非hex字符');
    } else {
      console.log('   ✅ 格式正确');
    }
  }
} else {
  console.log('   ❌ 未设置');
}

console.log('\n3. RELAYER_PRIVATE_KEY:');
if (relayerPrivateKey) {
  const trimmed = relayerPrivateKey.trim();
  console.log(`   ✅ 已设置: ${trimmed.substring(0, 10)}...`);
  console.log(`   📝 原始长度: ${relayerPrivateKey.length} 字符`);
  console.log(`   📝 去除空格后长度: ${trimmed.length} 字符`);
  
  // 验证格式
  if (!trimmed.startsWith('0x')) {
    console.log('   ❌ 错误: 私钥应该以 0x 开头');
  } else if (trimmed.length !== 66) {
    console.log(`   ❌ 错误: 私钥长度应该是66字符（0x + 64个hex字符），实际是${trimmed.length}`);
  } else {
    // 验证hex字符
    const hexPart = trimmed.substring(2);
    if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
      console.log('   ❌ 错误: 私钥包含非hex字符');
    } else {
      console.log('   ✅ 格式正确');
    }
  }
} else {
  console.log('   ❌ 未设置');
}

console.log('\n4. 其他相关配置:');
const usdcAddress = process.env.USDC_ADDRESS;
const chainId = process.env.CHAIN_ID;
console.log(`   USDC_ADDRESS: ${usdcAddress || '未设置'}`);
console.log(`   CHAIN_ID: ${chainId || '未设置'}`);

console.log('\n📋 总结:');
if (rpcUrl && contractAddress && relayerPrivateKey) {
  const contractValid = contractAddress.trim().startsWith('0x') && contractAddress.trim().length === 42;
  const keyValid = relayerPrivateKey.trim().startsWith('0x') && relayerPrivateKey.trim().length === 66;
  
  if (contractValid && keyValid) {
    console.log('   ✅ 所有配置看起来都正确！');
    console.log('   💡 如果仍然使用Mock模式，请检查：');
    console.log('      1. 后端服务是否已重启');
    console.log('      2. 查看后端启动日志，查找 "Relayer initialized" 相关信息');
    console.log('      3. 检查合约地址是否在BSC测试网上真实存在');
    console.log('      4. 检查Relayer钱包是否有足够的BNB支付Gas');
  } else {
    console.log('   ⚠️  配置存在格式问题，请检查上述错误');
  }
} else {
  console.log('   ❌ 缺少必需配置，请检查.env文件');
}

console.log('\n');

