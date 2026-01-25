import { ethers } from "hardhat";

/**
 * 部署 AutoPay V5.0 合约到 BSC 测试网
 * 
 * V5.0 新功能：
 * - 集成 Commission 合约进行分账
 * - 支持分账模式开关
 */

const COMMISSION_V5_ADDRESS = "0x5E8023659620DFD296f48f92Da0AE48c9CB443f0";
const USDC_ADDRESS = "0xc23453b4842FDc4360A0a3518E2C0f51a2069386";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying AutoPay V5.0 contract to BSC Testnet");
  console.log("=================================================");
  console.log("Deployer address:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("");

  console.log("📋 Configuration:");
  console.log("  Commission V5.0 Address:", COMMISSION_V5_ADDRESS);
  console.log("  USDC Address:", USDC_ADDRESS);
  console.log("");

  // 1. 部署 AutoPay V5.0 合约
  console.log("📦 Step 1: Deploying AutoPay V5.0 contract...");
  const AutoPay = await ethers.getContractFactory("AutoPay");
  const autoPay = await AutoPay.deploy();
  await autoPay.waitForDeployment();
  const autoPayAddress = await autoPay.getAddress();
  console.log("✅ AutoPay V5.0 deployed to:", autoPayAddress);
  console.log("");

  // 2. 设置支付代币
  console.log("⚙️  Step 2: Setting payment token...");
  try {
    const tx1 = await autoPay.setPaymentToken(USDC_ADDRESS);
    await tx1.wait();
    console.log("✅ Payment token set to:", USDC_ADDRESS);
  } catch (error: any) {
    console.error("❌ Failed to set payment token:", error.message);
    throw error;
  }
  console.log("");

  // 3. 设置 Commission 合约
  console.log("⚙️  Step 3: Setting Commission contract...");
  try {
    const tx2 = await autoPay.setCommissionContract(COMMISSION_V5_ADDRESS);
    await tx2.wait();
    console.log("✅ Commission contract set to:", COMMISSION_V5_ADDRESS);
  } catch (error: any) {
    console.error("❌ Failed to set Commission contract:", error.message);
    throw error;
  }
  console.log("");

  // 4. 启用分账模式
  console.log("⚙️  Step 4: Enabling split mode...");
  try {
    const tx3 = await autoPay.setSplitModeEnabled(true);
    await tx3.wait();
    console.log("✅ Split mode enabled");
  } catch (error: any) {
    console.error("❌ Failed to enable split mode:", error.message);
    throw error;
  }
  console.log("");

  // 5. 验证配置
  console.log("🔍 Step 5: Verifying configuration...");
  try {
    const paymentToken = await autoPay.paymentToken();
    const commissionContract = await autoPay.commissionContract();
    const splitModeEnabled = await autoPay.splitModeEnabled();
    
    console.log("✅ Configuration verified:");
    console.log("   - Payment Token:", paymentToken);
    console.log("   - Commission Contract:", commissionContract);
    console.log("   - Split Mode Enabled:", splitModeEnabled);
  } catch (error: any) {
    console.error("❌ Failed to verify configuration:", error.message);
  }
  console.log("");

  // 输出部署摘要
  console.log("=================================================");
  console.log("📋 Deployment Summary - AutoPay V5.0");
  console.log("=================================================");
  console.log("AutoPay Address:", autoPayAddress);
  console.log("Commission V5.0 Address:", COMMISSION_V5_ADDRESS);
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("Network: BSC Testnet (Chain ID: 97)");
  console.log("");

  // 输出环境变量配置
  console.log("💡 Update your .env files:");
  console.log("");
  console.log("# contract/.env and backend/.env");
  console.log(`AUTO_PAY_ADDRESS=${autoPayAddress}`);
  console.log("");

  return autoPayAddress;
}

main()
  .then((address) => {
    console.log("✅ Deployment completed successfully!");
    console.log("New AutoPay V5.0 Address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
