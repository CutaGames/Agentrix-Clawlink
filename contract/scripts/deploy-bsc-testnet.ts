import { ethers } from "hardhat";

/**
 * 部署所有 PayMind 合约到 BSC 测试网
 * 
 * 部署顺序：
 * 1. PaymentRouter (独立)
 * 2. X402Adapter (依赖 PaymentRouter)
 * 3. AutoPay (独立)
 * 4. Commission (独立，但需要后续配置)
 * 
 * 前置条件：
 * - 已部署 ERC8004SessionManager
 * - 配置了 .env 文件中的 BSC_TESTNET_RPC_URL 和 PRIVATE_KEY
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying PayMind contracts to BSC Testnet");
  console.log("================================================");
  console.log("Deployer address:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("");

  // 从环境变量获取已部署的 ERC8004 地址（如果存在）
  const erc8004Address = process.env.ERC8004_CONTRACT_ADDRESS || "";
  if (erc8004Address) {
    console.log("✅ ERC8004SessionManager already deployed at:", erc8004Address);
  } else {
    console.log("⚠️  ERC8004_CONTRACT_ADDRESS not set in .env");
  }
  console.log("");

  // 1. 部署 PaymentRouter
  console.log("📦 Step 1: Deploying PaymentRouter...");
  const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
  const paymentRouter = await PaymentRouter.deploy();
  await paymentRouter.waitForDeployment();
  const paymentRouterAddress = await paymentRouter.getAddress();
  console.log("✅ PaymentRouter deployed to:", paymentRouterAddress);
  console.log("");

  // 2. 部署 X402Adapter (需要 PaymentRouter 地址)
  console.log("📦 Step 2: Deploying X402Adapter...");
  const X402Adapter = await ethers.getContractFactory("X402Adapter");
  const x402Adapter = await X402Adapter.deploy(paymentRouterAddress);
  await x402Adapter.waitForDeployment();
  const x402AdapterAddress = await x402Adapter.getAddress();
  console.log("✅ X402Adapter deployed to:", x402AdapterAddress);
  console.log("");

  // 3. 部署 AutoPay
  console.log("📦 Step 3: Deploying AutoPay...");
  const AutoPay = await ethers.getContractFactory("AutoPay");
  const autoPay = await AutoPay.deploy();
  await autoPay.waitForDeployment();
  const autoPayAddress = await autoPay.getAddress();
  console.log("✅ AutoPay deployed to:", autoPayAddress);
  console.log("");

  // 4. 部署 Commission
  console.log("📦 Step 4: Deploying Commission...");
  const Commission = await ethers.getContractFactory("Commission");
  const commission = await Commission.deploy();
  await commission.waitForDeployment();
  const commissionAddress = await commission.getAddress();
  console.log("✅ Commission deployed to:", commissionAddress);
  console.log("");

  // 5. 配置 PaymentRouter - 添加 X402 支付渠道
  console.log("⚙️  Step 5: Configuring PaymentRouter...");
  try {
    const tx = await paymentRouter.setPaymentChannel(
      2, // X402 channel type
      x402AdapterAddress,
      true, // enabled
      100, // priority
      0, // minAmount
      ethers.parseEther("1000") // maxAmount
    );
    await tx.wait();
    console.log("✅ PaymentRouter configured with X402Adapter");
  } catch (error) {
    console.error("❌ Failed to configure PaymentRouter:", error);
  }
  console.log("");

  // 6. 配置 Commission - 需要设置 settlementToken 和 paymindTreasury
  console.log("⚙️  Step 6: Configuring Commission...");
  console.log("⚠️  Commission requires manual configuration:");
  console.log("   - Call configureSettlementToken(tokenAddress, treasuryAddress)");
  console.log("   - Set systemRebatePool address if needed");
  console.log("");

  // 输出部署摘要
  console.log("================================================");
  console.log("📋 Deployment Summary");
  console.log("================================================");
  console.log("PaymentRouter:", paymentRouterAddress);
  console.log("X402Adapter:", x402AdapterAddress);
  console.log("AutoPay:", autoPayAddress);
  console.log("Commission:", commissionAddress);
  if (erc8004Address) {
    console.log("ERC8004SessionManager:", erc8004Address);
  }
  console.log("");

  // 输出环境变量配置建议
  console.log("💡 Next Steps:");
  console.log("1. Update .env file with the following addresses:");
  console.log(`   PAYMENT_ROUTER_ADDRESS=${paymentRouterAddress}`);
  console.log(`   X402_ADAPTER_ADDRESS=${x402AdapterAddress}`);
  console.log(`   AUTO_PAY_ADDRESS=${autoPayAddress}`);
  console.log(`   COMMISSION_ADDRESS=${commissionAddress}`);
  console.log("");
  console.log("2. Configure Commission contract:");
  console.log(`   - Settlement Token: Set via configureSettlementToken()`);
  console.log(`   - PayMind Treasury: Set via configureSettlementToken()`);
  console.log(`   - System Rebate Pool: Set via setSystemRebatePool()`);
  console.log("");
  console.log("3. Verify contracts on BSCScan:");
  console.log(`   npx hardhat verify --network bscTestnet ${paymentRouterAddress}`);
  console.log(`   npx hardhat verify --network bscTestnet ${x402AdapterAddress} ${paymentRouterAddress}`);
  console.log(`   npx hardhat verify --network bscTestnet ${autoPayAddress}`);
  console.log(`   npx hardhat verify --network bscTestnet ${commissionAddress}`);
  console.log("");
  console.log("✅ Deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

