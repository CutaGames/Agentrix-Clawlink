import { ethers } from "hardhat";

/**
 * 配置 Commission 合约
 * 
 * 需要配置的参数：
 * 1. settlementToken - 结算代币地址（如 USDT/USDC）
 * 2. paymindTreasury - PayMind 金库地址
 * 3. systemRebatePool - 系统返利池地址（可选）
 */
async function main() {
  // 支持命令行参数或环境变量
  const commissionAddress = process.argv[2] || process.env.COMMISSION_ADDRESS;
  if (!commissionAddress) {
    throw new Error("COMMISSION_ADDRESS not set. Use: npm run configure:commission <COMMISSION_ADDRESS> <SETTLEMENT_TOKEN> <TREASURY_ADDRESS> [REBATE_POOL_ADDRESS]");
  }

  const settlementToken = process.argv[3] || process.env.SETTLEMENT_TOKEN_ADDRESS;
  if (!settlementToken) {
    throw new Error("SETTLEMENT_TOKEN_ADDRESS not set. Use: npm run configure:commission <COMMISSION_ADDRESS> <SETTLEMENT_TOKEN> <TREASURY_ADDRESS> [REBATE_POOL_ADDRESS]");
  }

  const paymindTreasury = process.argv[4] || process.env.PAYMIND_TREASURY_ADDRESS;
  if (!paymindTreasury) {
    throw new Error("PAYMIND_TREASURY_ADDRESS not set. Use: npm run configure:commission <COMMISSION_ADDRESS> <SETTLEMENT_TOKEN> <TREASURY_ADDRESS> [REBATE_POOL_ADDRESS]");
  }

  const systemRebatePool = process.argv[5] || process.env.SYSTEM_REBATE_POOL_ADDRESS || paymindTreasury; // 默认使用 treasury 地址

  console.log("⚙️  Configuring Commission contract...");
  console.log("Commission Address:", commissionAddress);
  console.log("Settlement Token:", settlementToken);
  console.log("PayMind Treasury:", paymindTreasury);
  console.log("System Rebate Pool:", systemRebatePool);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const Commission = await ethers.getContractFactory("Commission");
  const commission = Commission.attach(commissionAddress);

  // 配置结算代币、金库和返利池（一次性配置）
  console.log("Setting settlement token, treasury and rebate pool...");
  const tx = await commission.configureSettlementToken(
    settlementToken,
    paymindTreasury,
    systemRebatePool
  );
  await tx.wait();
  console.log("✅ Commission contract configured successfully");

  console.log("");
  console.log("✅ Commission contract configured successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Configuration failed:");
    console.error(error);
    process.exit(1);
  });

