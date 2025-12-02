import { ethers } from "hardhat";

/**
 * 部署Commission合约到BSC测试网并自动配置
 * 
 * 前置条件：
 * - 已配置 .env 文件中的 PRIVATE_KEY
 * - 已配置 BSC_TESTNET_USDT_ADDRESS（可选，有默认值）
 * - 已配置 AGENTRIX_TREASURY_ADDRESS（可选，使用部署者地址）
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying Commission contract to BSC Testnet");
  console.log("================================================");
  console.log("Deployer address:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("");

  // 从环境变量获取配置
  const usdtAddress = process.env.BSC_TESTNET_USDT_ADDRESS || "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  const treasuryAddress = process.env.AGENTRIX_TREASURY_ADDRESS || deployer.address;
  const rebatePoolAddress = process.env.SYSTEM_REBATE_POOL_ADDRESS || deployer.address;

  console.log("📋 Configuration:");
  console.log("  USDT Address:", usdtAddress);
  console.log("  Treasury Address:", treasuryAddress);
  console.log("  Rebate Pool Address:", rebatePoolAddress);
  console.log("");

  // 1. 部署Commission合约
  console.log("📦 Step 1: Deploying Commission contract...");
  const Commission = await ethers.getContractFactory("Commission");
  const commission = await Commission.deploy();
  await commission.waitForDeployment();
  const commissionAddress = await commission.getAddress();
  console.log("✅ Commission deployed to:", commissionAddress);
  console.log("");

  // 2. 配置结算代币和金库
  console.log("⚙️  Step 2: Configuring settlement token and treasury...");
  try {
    const tx = await commission.configureSettlementToken(
      usdtAddress,
      treasuryAddress,
      rebatePoolAddress
    );
    await tx.wait();
    console.log("✅ Settlement token configured");
    console.log("   - Settlement Token:", usdtAddress);
    console.log("   - Agentrix Treasury:", treasuryAddress);
    console.log("   - System Rebate Pool:", rebatePoolAddress);
  } catch (error: any) {
    console.error("❌ Failed to configure settlement token:", error.message);
    throw error;
  }
  console.log("");

  // 3. 验证配置
  console.log("🔍 Step 3: Verifying configuration...");
  try {
    const settlementToken = await commission.settlementToken();
    const treasury = await commission.agentrixTreasury();
    const rebatePool = await commission.systemRebatePool();
    
    console.log("✅ Configuration verified:");
    console.log("   - Settlement Token:", settlementToken);
    console.log("   - Agentrix Treasury:", treasury);
    console.log("   - System Rebate Pool:", rebatePool);
    
    if (settlementToken.toLowerCase() !== usdtAddress.toLowerCase()) {
      console.warn("⚠️  Warning: Settlement token address mismatch!");
    }
  } catch (error: any) {
    console.error("❌ Failed to verify configuration:", error.message);
  }
  console.log("");

  // 输出部署摘要
  console.log("================================================");
  console.log("📋 Deployment Summary");
  console.log("================================================");
  console.log("Commission Address:", commissionAddress);
  console.log("USDT Address:", usdtAddress);
  console.log("Treasury Address:", treasuryAddress);
  console.log("Rebate Pool Address:", rebatePoolAddress);
  console.log("Network: BSC Testnet (Chain ID: 97)");
  console.log("");

  // 输出环境变量配置建议
  console.log("💡 Next Steps:");
  console.log("1. Update backend/.env file:");
  console.log(`   COMMISSION_CONTRACT_ADDRESS=${commissionAddress}`);
  console.log(`   USDC_ADDRESS=${usdtAddress}`);
  console.log("");
  console.log("2. Verify contract on BSCScan:");
  console.log(`   npx hardhat verify --network bscTestnet ${commissionAddress}`);
  console.log("");
  console.log("3. Test new functions:");
  console.log("   - quickPaySplit()");
  console.log("   - walletSplit()");
  console.log("   - setSplitConfig()");
  console.log("   - getSplitConfig()");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

