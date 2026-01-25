import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * 🚀 Agentrix Full Contract Redeployment Script (V2 Optimized)
 * 
 * 部署顺序：
 * 1. MockERC20 (作为 Agentrix USDC)
 * 2. PaymentRouter
 * 3. X402Adapter (依赖 PaymentRouter)
 * 4. AutoPay
 * 5. AuditProof
 * 6. Commission
 * 7. ERC8004SessionManager (依赖 MockERC20)
 * 
 * 包含完整配置。
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("==================================================");
  console.log("🚀 Agentrix Full Contract Redeployment (V2)");
  console.log("==================================================");
  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name, "(ChainId:", network.chainId.toString() + ")");
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH/BNB");
  console.log("==================================================\n");

  const treasuryAddress = process.env.PAYMIND_TREASURY_ADDRESS || deployer.address;
  const systemRelayer = deployer.address; // 默认使用部署者作为 Relayer，正式环境应更改

  // 1. 部署 MockERC20 (Agentrix USDC)
  console.log("📦 1/7: Deploying MockERC20...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Agentrix USDC", "AUSDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ MockERC20 deployed to:", usdcAddress);

  // 2. 部署 PaymentRouter
  console.log("📦 2/7: Deploying PaymentRouter...");
  const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
  const paymentRouter = await PaymentRouter.deploy();
  await paymentRouter.waitForDeployment();
  const paymentRouterAddress = await paymentRouter.getAddress();
  console.log("✅ PaymentRouter deployed to:", paymentRouterAddress);

  // 3. 部署 X402Adapter
  console.log("📦 3/7: Deploying X402Adapter...");
  const X402Adapter = await ethers.getContractFactory("X402Adapter");
  const x402Adapter = await X402Adapter.deploy(paymentRouterAddress);
  await x402Adapter.waitForDeployment();
  const x402AdapterAddress = await x402Adapter.getAddress();
  console.log("✅ X402Adapter deployed to:", x402AdapterAddress);

  // 4. 部署 AutoPay
  console.log("📦 4/7: Deploying AutoPay...");
  const AutoPay = await ethers.getContractFactory("AutoPay");
  const autoPay = await AutoPay.deploy();
  await autoPay.waitForDeployment();
  const autoPayAddress = await autoPay.getAddress();
  console.log("✅ AutoPay deployed to:", autoPayAddress);

  // 5. 部署 AuditProof
  console.log("📦 5/7: Deploying AuditProof...");
  const AuditProof = await ethers.getContractFactory("AuditProof");
  const auditProof = await AuditProof.deploy(treasuryAddress);
  await auditProof.waitForDeployment();
  const auditProofAddress = await auditProof.getAddress();
  console.log("✅ AuditProof deployed to:", auditProofAddress);

  // 6. 部署 Commission
  console.log("📦 6/7: Deploying Commission...");
  const Commission = await ethers.getContractFactory("Commission");
  const commission = await Commission.deploy();
  await commission.waitForDeployment();
  const commissionAddress = await commission.getAddress();
  console.log("✅ Commission deployed to:", commissionAddress);

  // 7. 部署 ERC8004SessionManager
  console.log("📦 7/7: Deploying ERC8004SessionManager...");
  const ERC8004 = await ethers.getContractFactory("ERC8004SessionManager");
  const erc8004 = await ERC8004.deploy(usdcAddress);
  await erc8004.waitForDeployment();
  const erc8004Address = await erc8004.getAddress();
  console.log("✅ ERC8004SessionManager deployed to:", erc8004Address);

  console.log("\n⚙️  Configuring contracts...");

  // 配置 X402Adapter Relayer
  console.log("   - Setting X402Adapter relayer...");
  await (await x402Adapter.setRelayer(systemRelayer)).wait();

  // 配置 ERC8004 Relayer
  console.log("   - Setting ERC8004 relayer...");
  await (await erc8004.setRelayer(systemRelayer)).wait();

  // 配置 PaymentRouter
  console.log("   - Adding X402Adapter to PaymentRouter...");
  await (await paymentRouter.setPaymentChannel(
    2, // X402 channel
    x402AdapterAddress,
    true,
    100, // priority
    0,
    ethers.parseUnits("1000000", 6)
  )).wait();

  // 配置 AuditProof
  console.log("   - Configuring AuditProof...");
  await (await auditProof.setTrustedAuditor(deployer.address, true)).wait();
  await (await auditProof.setDefaultPlatformFeeRate(100)).wait(); // 1%

  // 配置 Commission
  console.log("   - Configuring Commission...");
  await (await commission.configureSettlementToken(usdcAddress, treasuryAddress, deployer.address)).wait();
  await (await (commission as any).setTrustedAuditor(auditProofAddress, true)).wait(); // 关键：将 AuditProof 设为受信任审计员

  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AUSDC: usdcAddress,
      PaymentRouter: paymentRouterAddress,
      X402Adapter: x402AdapterAddress,
      AutoPay: autoPayAddress,
      AuditProof: auditProofAddress,
      Commission: commissionAddress,
      ERC8004SessionManager: erc8004Address
    }
  };

  // 保存到文件
  const resultPath = path.join(process.cwd(), `deployment-res-${network.name}-${network.chainId}.json`);
  fs.writeFileSync(resultPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${resultPath}`);

  console.log("\n==================================================");
  console.log("✅ ALL CONTRACTS REDEPLOYED SUCCESSFULLY");
  console.log("==================================================");
  console.log("New Contract Addresses:");
  console.log("AUSDC:                 ", usdcAddress);
  console.log("PaymentRouter:         ", paymentRouterAddress);
  console.log("X402Adapter:           ", x402AdapterAddress);
  console.log("AutoPay:               ", autoPayAddress);
  console.log("AuditProof:            ", auditProofAddress);
  console.log("Commission:            ", commissionAddress);
  console.log("ERC8004SessionManager: ", erc8004Address);
  console.log("==================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
