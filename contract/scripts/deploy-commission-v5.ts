import { ethers } from "hardhat";

/**
 * 部署 Commission V5.0 合约到 BSC 测试网并自动配置
 * 
 * V5.0 新功能：
 * - 扫描商品分佣 (UCP/X402: 1%, FT/NFT: 0.3%)
 * - X402 通道费可配置 (默认 0%)
 * - Agent 分佣 7:3 (执行:推荐)
 * - AutoPay 分账支持
 * - Skill 层级费率配置
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying Commission V5.0 contract to BSC Testnet");
  console.log("====================================================");
  console.log("Deployer address:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("");

  // 从环境变量获取配置
  const usdcAddress = process.env.BSC_TESTNET_USDC_ADDRESS || process.env.SETTLEMENT_TOKEN_ADDRESS || "0xc23453b4842FDc4360A0a3518E2C0f51a2069386";
  const treasuryAddress = process.env.PAYMIND_TREASURY_ADDRESS || deployer.address;
  const rebatePoolAddress = process.env.SYSTEM_REBATE_POOL_ADDRESS || deployer.address;
  const relayerAddress = process.env.RELAYER_ADDRESS || deployer.address;

  console.log("📋 Configuration:");
  console.log("  USDC Address:", usdcAddress);
  console.log("  Treasury Address:", treasuryAddress);
  console.log("  Rebate Pool Address:", rebatePoolAddress);
  console.log("  Relayer Address:", relayerAddress);
  console.log("");

  // 1. 部署 Commission V5.0 合约
  console.log("📦 Step 1: Deploying Commission V5.0 contract...");
  const Commission = await ethers.getContractFactory("Commission");
  const commission = await Commission.deploy();
  await commission.waitForDeployment();
  const commissionAddress = await commission.getAddress();
  console.log("✅ Commission V5.0 deployed to:", commissionAddress);
  console.log("");

  // 2. 配置结算代币和金库
  console.log("⚙️  Step 2: Configuring settlement token and treasury...");
  try {
    const tx = await commission.configureSettlementToken(
      usdcAddress,
      treasuryAddress,
      rebatePoolAddress
    );
    await tx.wait();
    console.log("✅ Settlement token configured");
    console.log("   - Settlement Token:", usdcAddress);
    console.log("   - PayMind Treasury:", treasuryAddress);
    console.log("   - System Rebate Pool:", rebatePoolAddress);
  } catch (error: any) {
    console.error("❌ Failed to configure settlement token:", error.message);
    throw error;
  }
  console.log("");

  // 3. 初始化 V5.0 费率
  console.log("⚙️  Step 3: Initializing V5.0 rates...");
  try {
    const tx = await commission.initializeV5Rates();
    await tx.wait();
    console.log("✅ V5.0 rates initialized:");
    console.log("   - SCANNED_UCP: 1%");
    console.log("   - SCANNED_X402: 1%");
    console.log("   - SCANNED_FT: 0.3%");
    console.log("   - SCANNED_NFT: 0.3%");
    console.log("   - INFRA: 0.5% + 2%");
    console.log("   - RESOURCE: 0.5% + 2.5%");
    console.log("   - LOGIC: 1% + 4%");
    console.log("   - COMPOSITE: 3% + 7%");
  } catch (error: any) {
    console.error("❌ Failed to initialize V5 rates:", error.message);
    throw error;
  }
  console.log("");

  // 4. 设置 Relayer
  console.log("⚙️  Step 4: Setting up relayer...");
  try {
    const tx = await commission.setRelayer(relayerAddress, true);
    await tx.wait();
    console.log("✅ Relayer configured:", relayerAddress);
  } catch (error: any) {
    console.error("❌ Failed to set relayer:", error.message);
    throw error;
  }
  console.log("");

  // 5. 验证配置
  console.log("🔍 Step 5: Verifying configuration...");
  try {
    const settlementToken = await commission.settlementToken();
    const treasury = await commission.paymindTreasury();
    const rebatePool = await commission.systemRebatePool();
    const x402Rate = await commission.x402ChannelFeeRate();
    const scannedUcpRate = await commission.scannedFeeRates(3); // SCANNED_UCP
    const scannedNftRate = await commission.scannedFeeRates(6); // SCANNED_NFT
    const compositePoolRate = await commission.layerPoolRates(3); // COMPOSITE
    const isRelayer = await commission.relayers(relayerAddress);
    
    console.log("✅ Configuration verified:");
    console.log("   - Settlement Token:", settlementToken);
    console.log("   - PayMind Treasury:", treasury);
    console.log("   - System Rebate Pool:", rebatePool);
    console.log("   - X402 Channel Fee Rate:", Number(x402Rate) / 100, "%");
    console.log("   - Scanned UCP Rate:", Number(scannedUcpRate) / 100, "%");
    console.log("   - Scanned NFT Rate:", Number(scannedNftRate) / 100, "%");
    console.log("   - COMPOSITE Pool Rate:", Number(compositePoolRate) / 100, "%");
    console.log("   - Relayer Active:", isRelayer);
  } catch (error: any) {
    console.error("❌ Failed to verify configuration:", error.message);
  }
  console.log("");

  // 输出部署摘要
  console.log("====================================================");
  console.log("📋 Deployment Summary - Commission V5.0");
  console.log("====================================================");
  console.log("Commission Address:", commissionAddress);
  console.log("USDC Address:", usdcAddress);
  console.log("Treasury Address:", treasuryAddress);
  console.log("Rebate Pool Address:", rebatePoolAddress);
  console.log("Relayer Address:", relayerAddress);
  console.log("Network: BSC Testnet (Chain ID: 97)");
  console.log("");

  // 输出环境变量配置
  console.log("💡 Update your .env files:");
  console.log("");
  console.log("# contract/.env");
  console.log(`COMMISSION_CONTRACT_ADDRESS=${commissionAddress}`);
  console.log("");
  console.log("# backend/.env");
  console.log(`COMMISSION_CONTRACT_ADDRESS=${commissionAddress}`);
  console.log("");

  // 输出验证命令
  console.log("🔍 Verify contract on BSCScan:");
  console.log(`npx hardhat verify --network bscTestnet ${commissionAddress}`);
  console.log("");

  // V5.0 新功能测试建议
  console.log("🧪 V5.0 New Functions to Test:");
  console.log("   - initializeV5Rates() ✅ Already called");
  console.log("   - setX402ChannelFeeRate(uint16)");
  console.log("   - setScannedFeeRate(SkillSource, uint16)");
  console.log("   - setLayerRates(SkillLayer, uint16, uint16)");
  console.log("   - calculateV5Split(...)");
  console.log("   - autoPaySplit(...)");
  console.log("   - scannedProductSplit(...)");
  console.log("");

  return commissionAddress;
}

main()
  .then((address) => {
    console.log("✅ Deployment completed successfully!");
    console.log("New Commission V5.0 Address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
