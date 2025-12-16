import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying Commission with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");

  // 1. Deploy Commission
  const Commission = await ethers.getContractFactory("Commission");
  const commission = await Commission.deploy();
  await commission.waitForDeployment();
  const commissionAddress = await commission.getAddress();
  console.log("✅ Commission deployed to:", commissionAddress);

  // 2. Configure Commission
  // Get config from env or use defaults (matching backend/.env)
  const settlementToken = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"; // BSC Testnet USDT
  const treasury = deployer.address; // Use deployer as treasury for now
  const rebatePool = deployer.address; // Use deployer as rebate pool for now

  console.log("⚙️  Configuring Commission...");
  console.log("   - Token:", settlementToken);
  console.log("   - Treasury:", treasury);
  console.log("   - Rebate Pool:", rebatePool);

  const tx1 = await commission.configureSettlementToken(settlementToken, treasury, rebatePool);
  await tx1.wait();
  console.log("✅ Settlement token configured");

  // 3. Authorize Relayer (The deployer/backend wallet)
  console.log("⚙️  Authorizing Relayer:", deployer.address);
  const tx2 = await commission.setRelayer(deployer.address, true);
  await tx2.wait();
  console.log("✅ Relayer authorized");

  console.log("");
  console.log("🎉 Deployment Complete!");
  console.log("----------------------------------------");
  console.log("NEW COMMISSION ADDRESS:", commissionAddress);
  console.log("----------------------------------------");
  console.log("⚠️  Please update COMMISSION_CONTRACT_ADDRESS in backend/.env");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
