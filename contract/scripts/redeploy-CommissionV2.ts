import { ethers } from "hardhat";

/**
 * 重新部署 CommissionV2 合约
 * 修复: executeSplit() 现在会把分配金额转入合约，确保 claimAll() 有足够余额
 * 
 * 运行: npx hardhat run scripts/redeploy-CommissionV2.ts --network bscTestnet
 */
async function main() {
  const SETTLEMENT_TOKEN = process.env.SETTLEMENT_TOKEN_ADDRESS;
  const TREASURY = process.env.PAYMIND_TREASURY_ADDRESS;

  if (!SETTLEMENT_TOKEN || !TREASURY) {
    throw new Error("Missing SETTLEMENT_TOKEN_ADDRESS or PAYMIND_TREASURY_ADDRESS in .env");
  }

  console.log("=== Redeploying CommissionV2 (Bug Fix) ===");
  console.log("Settlement Token:", SETTLEMENT_TOKEN);
  console.log("Treasury:", TREASURY);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  console.log("");

  // Deploy CommissionV2
  const CommissionV2Factory = await ethers.getContractFactory("CommissionV2");
  const commissionV2 = await CommissionV2Factory.deploy(SETTLEMENT_TOKEN, TREASURY);
  await commissionV2.waitForDeployment();

  const newAddress = await commissionV2.getAddress();
  console.log("CommissionV2 deployed to:", newAddress);
  console.log("");

  // Set relayer
  const RELAYER = process.env.RELAYER_ADDRESS;
  if (RELAYER) {
    const tx = await commissionV2.setRelayer(RELAYER, true);
    await tx.wait();
    console.log("Relayer set:", RELAYER);
  }

  console.log("");
  console.log("=== Deployment Complete ===");
  console.log("OLD CommissionV2:", process.env.COMMISSION_V2_ADDRESS || "unknown");
  console.log("NEW CommissionV2:", newAddress);
  console.log("");
  console.log("TODO: Update the following files:");
  console.log("  1. contract/.env  -> COMMISSION_V2_ADDRESS=" + newAddress);
  console.log("  2. backend/.env   -> COMMISSION_V2_ADDRESS=" + newAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
