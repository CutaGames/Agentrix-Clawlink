import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * 部署 AuditProof 合约和更新后的 Commission 合约
 * 支持 BSC 测试网和 Base 测试网
 * 
 * 使用方法:
 * npx hardhat run scripts/deploy-audit-proof.ts --network bscTestnet
 * npx hardhat run scripts/deploy-audit-proof.ts --network baseTestnet
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("🚀 Deploying AuditProof & Updated Commission");
  console.log("============================================");
  console.log("Deployer address:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("");

  // 检测网络
  const isBase = network.chainId === 84532n; // Base Sepolia
  const isBsc = network.chainId === 97n;      // BSC Testnet
  
  let networkName = "unknown";
  let treasuryAddress = process.env.PAYMIND_TREASURY_ADDRESS || deployer.address;
  
  if (isBase) {
    networkName = "Base Sepolia";
    console.log("🔷 Deploying to Base Sepolia Testnet");
  } else if (isBsc) {
    networkName = "BSC Testnet";
    console.log("🟡 Deploying to BSC Testnet");
  } else {
    console.log("⚠️  Unknown network, proceeding anyway...");
  }
  console.log("");

  // 1. 部署 AuditProof 合约
  console.log("📦 Step 1: Deploying AuditProof...");
  const AuditProof = await ethers.getContractFactory("AuditProof");
  const auditProof = await AuditProof.deploy(treasuryAddress);
  await auditProof.waitForDeployment();
  const auditProofAddress = await auditProof.getAddress();
  console.log("✅ AuditProof deployed to:", auditProofAddress);
  console.log("");

  // 2. 部署更新后的 Commission 合约（如果需要）
  const existingCommissionAddress = process.env.COMMISSION_CONTRACT_ADDRESS;
  let commissionAddress = existingCommissionAddress;
  
  console.log("📦 Step 2: Checking Commission contract...");
  if (existingCommissionAddress) {
    console.log("ℹ️  Existing Commission at:", existingCommissionAddress);
    console.log("   Skipping redeployment. To redeploy, remove COMMISSION_CONTRACT_ADDRESS from .env");
  } else {
    console.log("📦 Deploying new Commission with Audit Proof support...");
    const Commission = await ethers.getContractFactory("Commission");
    const commission = await Commission.deploy();
    await commission.waitForDeployment();
    commissionAddress = await commission.getAddress();
    console.log("✅ Commission deployed to:", commissionAddress);
  }
  console.log("");

  // 3. 配置 AuditProof 合约
  console.log("⚙️  Step 3: Configuring AuditProof...");
  try {
    // 设置默认审计员（部署者）
    const tx1 = await auditProof.setTrustedAuditor(deployer.address, true);
    await tx1.wait();
    console.log("✅ Set deployer as trusted auditor");

    // 设置平台费率 (1%)
    const tx2 = await auditProof.setDefaultPlatformFeeRate(100);
    await tx2.wait();
    console.log("✅ Set platform fee rate to 1%");
  } catch (error: any) {
    console.error("❌ Failed to configure AuditProof:", error.message);
  }
  console.log("");

  // 4. 如果有 Commission 合约，配置它
  if (commissionAddress) {
    console.log("⚙️  Step 4: Configuring Commission...");
    try {
      const Commission = await ethers.getContractFactory("Commission");
      const commission = Commission.attach(commissionAddress) as any;

      // 设置 AuditProof 合约为受信任审计员
      const tx = await commission.setTrustedAuditor(auditProofAddress, true);
      await tx.wait();
      console.log("✅ Set AuditProof as trusted auditor in Commission");
    } catch (error: any) {
      console.error("⚠️  Failed to configure Commission:", error.message);
      console.log("   This may be expected if the contract doesn't have setTrustedAuditor yet");
    }
  }
  console.log("");

  // 5. 部署摘要
  console.log("============================================");
  console.log("📋 Deployment Summary for", networkName);
  console.log("============================================");
  console.log("AuditProof:", auditProofAddress);
  console.log("Commission:", commissionAddress || "N/A");
  console.log("Treasury:", treasuryAddress);
  console.log("");

  // 6. 生成 .env 更新内容
  const envUpdates = `
# ${networkName} - Deployed on ${new Date().toISOString()}
AUDIT_PROOF_CONTRACT_ADDRESS=${auditProofAddress}
${!existingCommissionAddress ? `COMMISSION_CONTRACT_ADDRESS=${commissionAddress}` : '# Commission already deployed'}
`;

  console.log("📝 Add these to your .env file:");
  console.log(envUpdates);

  // 7. 自动更新 .env 文件
  const envPath = path.join(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    
    // 更新或添加 AUDIT_PROOF_CONTRACT_ADDRESS
    if (envContent.includes("AUDIT_PROOF_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /AUDIT_PROOF_CONTRACT_ADDRESS=.*/,
        `AUDIT_PROOF_CONTRACT_ADDRESS=${auditProofAddress}`
      );
    } else {
      envContent += `\nAUDIT_PROOF_CONTRACT_ADDRESS=${auditProofAddress}`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated .env file");
  }

  // 8. 验证指南
  console.log("");
  console.log("🔍 To verify contracts on explorer:");
  if (isBsc) {
    console.log(`npx hardhat verify --network bscTestnet ${auditProofAddress} "${treasuryAddress}"`);
  } else if (isBase) {
    console.log(`npx hardhat verify --network baseTestnet ${auditProofAddress} "${treasuryAddress}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
