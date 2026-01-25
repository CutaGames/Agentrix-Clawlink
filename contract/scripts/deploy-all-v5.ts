import { ethers } from "hardhat";

/**
 * 完整部署脚本 - 部署所有 V5.0 更新的合约到 BSC 测试网
 * 
 * 需要部署的合约：
 * 1. PaymentRouter - 添加了 Pausable 和安全改进
 * 2. X402Adapter - 添加了 EIP-712 签名验证和 Pausable
 * 3. ERC8004SessionManager - 添加了 Pausable 和安全改进
 * 
 * 已部署的合约（本次不重新部署）：
 * - Commission V5.0: 0x5E8023659620DFD296f48f92Da0AE48c9CB443f0
 * - AutoPay V5.0: 0xEb9bEa57Fc2924BBdbCD2a8eE81388F4d5B23058
 * - USDC: 0xc23453b4842FDc4360A0a3518E2C0f51a2069386
 */

const EXISTING_CONTRACTS = {
  Commission: "0x5E8023659620DFD296f48f92Da0AE48c9CB443f0",
  AutoPay: "0xEb9bEa57Fc2924BBdbCD2a8eE81388F4d5B23058",
  USDC: "0xc23453b4842FDc4360A0a3518E2C0f51a2069386",
};

const RELAYER_ADDRESS = "0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3";

interface DeployedContracts {
  PaymentRouter: string;
  X402Adapter: string;
  ERC8004SessionManager: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying All V5.0 Updated Contracts to BSC Testnet");
  console.log("========================================================");
  console.log("Deployer address:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("");

  const deployed: DeployedContracts = {
    PaymentRouter: "",
    X402Adapter: "",
    ERC8004SessionManager: "",
  };

  // ============ 1. Deploy PaymentRouter ============
  console.log("📦 Step 1: Deploying PaymentRouter...");
  try {
    const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
    const paymentRouter = await PaymentRouter.deploy();
    await paymentRouter.waitForDeployment();
    deployed.PaymentRouter = await paymentRouter.getAddress();
    console.log("✅ PaymentRouter deployed to:", deployed.PaymentRouter);

    // 配置支付通道
    console.log("   Configuring payment channels...");
    // WALLET 通道 (method = 1)
    await paymentRouter.setPaymentChannel(
      1, // WALLET
      ethers.ZeroAddress,
      true,
      1,
      0,
      ethers.parseEther("1000000")
    );
    console.log("   ✅ WALLET channel configured");
  } catch (error: any) {
    console.error("❌ PaymentRouter deployment failed:", error.message);
    throw error;
  }
  console.log("");

  // ============ 2. Deploy X402Adapter ============
  console.log("📦 Step 2: Deploying X402Adapter...");
  try {
    const X402Adapter = await ethers.getContractFactory("X402Adapter");
    const x402Adapter = await X402Adapter.deploy(deployed.PaymentRouter);
    await x402Adapter.waitForDeployment();
    deployed.X402Adapter = await x402Adapter.getAddress();
    console.log("✅ X402Adapter deployed to:", deployed.X402Adapter);

    // 设置 Relayer
    console.log("   Setting relayer...");
    await x402Adapter.setRelayer(RELAYER_ADDRESS);
    console.log("   ✅ Relayer set to:", RELAYER_ADDRESS);
  } catch (error: any) {
    console.error("❌ X402Adapter deployment failed:", error.message);
    throw error;
  }
  console.log("");

  // ============ 3. Deploy ERC8004SessionManager ============
  console.log("📦 Step 3: Deploying ERC8004SessionManager...");
  try {
    const ERC8004SessionManager = await ethers.getContractFactory("ERC8004SessionManager");
    const sessionManager = await ERC8004SessionManager.deploy(EXISTING_CONTRACTS.USDC);
    await sessionManager.waitForDeployment();
    deployed.ERC8004SessionManager = await sessionManager.getAddress();
    console.log("✅ ERC8004SessionManager deployed to:", deployed.ERC8004SessionManager);

    // 设置 Relayer
    console.log("   Setting relayer...");
    await sessionManager.setRelayer(RELAYER_ADDRESS);
    console.log("   ✅ Relayer set to:", RELAYER_ADDRESS);
  } catch (error: any) {
    console.error("❌ ERC8004SessionManager deployment failed:", error.message);
    throw error;
  }
  console.log("");

  // ============ 4. Configure PaymentRouter X402 Channel ============
  console.log("⚙️  Step 4: Configuring PaymentRouter X402 channel...");
  try {
    const paymentRouter = await ethers.getContractAt("PaymentRouter", deployed.PaymentRouter);
    // X402 通道 (method = 2)
    await paymentRouter.setPaymentChannel(
      2, // X402
      deployed.X402Adapter,
      true,
      2,
      0,
      ethers.parseEther("1000000")
    );
    console.log("✅ X402 channel configured with X402Adapter address");
  } catch (error: any) {
    console.error("❌ X402 channel configuration failed:", error.message);
  }
  console.log("");

  // ============ 5. Verify Deployments ============
  console.log("🔍 Step 5: Verifying deployments...");
  
  // Verify PaymentRouter
  try {
    const pr = await ethers.getContractAt("PaymentRouter", deployed.PaymentRouter);
    const prOwner = await pr.owner();
    console.log("   PaymentRouter owner:", prOwner);
  } catch (e: any) {
    console.log("   ❌ PaymentRouter verification failed:", e.message);
  }

  // Verify X402Adapter
  try {
    const x402 = await ethers.getContractAt("X402Adapter", deployed.X402Adapter);
    const x402Relayer = await x402.relayer();
    const x402Router = await x402.paymentRouter();
    console.log("   X402Adapter relayer:", x402Relayer);
    console.log("   X402Adapter paymentRouter:", x402Router);
  } catch (e: any) {
    console.log("   ❌ X402Adapter verification failed:", e.message);
  }

  // Verify ERC8004SessionManager
  try {
    const sm = await ethers.getContractAt("ERC8004SessionManager", deployed.ERC8004SessionManager);
    const smOwner = await sm.owner();
    const smToken = await sm.paymentToken();
    console.log("   ERC8004SessionManager owner:", smOwner);
    console.log("   ERC8004SessionManager paymentToken:", smToken);
  } catch (e: any) {
    console.log("   ❌ ERC8004SessionManager verification failed:", e.message);
  }
  console.log("");

  // ============ Summary ============
  console.log("========================================================");
  console.log("📋 Deployment Summary - All V5.0 Contracts");
  console.log("========================================================");
  console.log("");
  console.log("New Deployments:");
  console.log("  PaymentRouter:", deployed.PaymentRouter);
  console.log("  X402Adapter:", deployed.X402Adapter);
  console.log("  ERC8004SessionManager:", deployed.ERC8004SessionManager);
  console.log("");
  console.log("Existing Contracts (not redeployed):");
  console.log("  Commission V5.0:", EXISTING_CONTRACTS.Commission);
  console.log("  AutoPay V5.0:", EXISTING_CONTRACTS.AutoPay);
  console.log("  USDC:", EXISTING_CONTRACTS.USDC);
  console.log("");
  console.log("Network: BSC Testnet (Chain ID: 97)");
  console.log("");

  // 输出环境变量配置
  console.log("💡 Update your .env files:");
  console.log("");
  console.log("# contract/.env and backend/.env");
  console.log(`PAYMENT_ROUTER_ADDRESS=${deployed.PaymentRouter}`);
  console.log(`X402_ADAPTER_ADDRESS=${deployed.X402Adapter}`);
  console.log(`ERC8004_SESSION_MANAGER_ADDRESS=${deployed.ERC8004SessionManager}`);
  console.log("");

  // 输出 JSON 格式的部署结果
  console.log("📄 Deployment JSON:");
  console.log(JSON.stringify({
    network: "bscTestnet",
    chainId: "97",
    timestamp: new Date().toISOString(),
    contracts: {
      ...EXISTING_CONTRACTS,
      ...deployed,
    }
  }, null, 2));

  return deployed;
}

main()
  .then((deployed) => {
    console.log("");
    console.log("✅ All deployments completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
