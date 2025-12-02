import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('Deploying ERC8004SessionManager with account:', deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance));

  // 获取 USDC 地址（根据网络不同）
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  let usdcAddress: string;

  switch (chainId) {
    case 1: // Ethereum Mainnet
      usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      break;
    case 11155111: // Sepolia
      usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
      break;
    case 8453: // Base
      usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      break;
    case 56: // BSC Mainnet
      usdcAddress = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'; // BSC USDC
      break;
    case 97: // BSC Testnet
      // BSC测试网使用USDT替代USDC
      usdcAddress = process.env.BSC_TESTNET_USDT_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet USDT
      console.log('ℹ️  BSC Testnet: Using USDT address as payment token.');
      break;
    default:
      // 测试网或本地，使用零地址（需要后续设置）
      usdcAddress = '0x0000000000000000000000000000000000000000';
      console.warn('⚠️  Unknown network, using zero address for USDC. Please update after deployment.');
  }

  console.log('Network:', network.name, 'Chain ID:', chainId);
  console.log('USDC Address:', usdcAddress);

  // 部署合约
  const ERC8004SessionManager = await ethers.getContractFactory('ERC8004SessionManager');
  const sessionManager = await ERC8004SessionManager.deploy(usdcAddress);
  const deployedContract = await sessionManager.waitForDeployment();
  const contractAddress = await deployedContract.getAddress();

  console.log('✅ ERC8004SessionManager deployed to:', contractAddress);

  // 设置 Relayer 地址（从环境变量获取，或使用部署者地址）
  // 注意：测试环境可以使用同一个钱包，生产环境建议分开
  const relayerAddress = process.env.RELAYER_ADDRESS || deployer.address;
  
  console.log('Setting Relayer address to:', relayerAddress);
  await sessionManager.setRelayer(relayerAddress);
  console.log('✅ Relayer set to:', relayerAddress);
  
  if (relayerAddress === deployer.address) {
    console.log('ℹ️  Using deployer address as Relayer (OK for testing).');
  }

  // 输出部署信息
  console.log('\n📋 Deployment Summary:');
  console.log('====================');
  console.log('Contract Address:', contractAddress);
  console.log('USDC Address:', usdcAddress);
  console.log('Relayer Address:', relayerAddress);
  console.log('Network:', network.name);
  console.log('Chain ID:', network.chainId);
  console.log('\n💡 Next Steps:');
  console.log('1. Update .env file with ERC8004_CONTRACT_ADDRESS=' + contractAddress);
  console.log('2. Update .env file with USDC_ADDRESS=' + usdcAddress);
  console.log('3. Update .env file with RELAYER_ADDRESS=' + relayerAddress);
  console.log('4. Verify contract on block explorer (if on testnet/mainnet)');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:');
    console.error(error);
    process.exit(1);
  });

