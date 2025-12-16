import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy Treasury
  const ArnTreasury = await ethers.getContractFactory("ArnTreasury");
  const treasury = await ArnTreasury.deploy(deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("ArnTreasury deployed to:", treasuryAddress);

  // 2. Deploy FeeSplitter
  // Note: Commission Contract Address on BSC Testnet (from previous context or env)
  // If not set, use a placeholder or the previously deployed address if known.
  // Assuming Commission contract is already deployed at: 0x... (Need to get this from user or config)
  // For now, using a placeholder or env var.
  const commissionContractAddress = process.env.COMMISSION_CONTRACT_ADDRESS || "0xa0C571F348Bc1C8E08F8fcFc8805254eF128B48D"; 
  
  if (commissionContractAddress === "0x0000000000000000000000000000000000000000") {
      console.warn("WARNING: COMMISSION_CONTRACT_ADDRESS is not set. FeeSplitter will fail to forward funds.");
  }

  const ArnFeeSplitter = await ethers.getContractFactory("ArnFeeSplitter");
  const feeSplitter = await ArnFeeSplitter.deploy(treasuryAddress, commissionContractAddress);
  await feeSplitter.waitForDeployment();
  const feeSplitterAddress = await feeSplitter.getAddress();
  console.log("ArnFeeSplitter deployed to:", feeSplitterAddress);

  // 3. Deploy ArnSessionManager (X402 V2)
  // Note: Using a mock USDC address for deployment if not on a known network
  // BSC Testnet USDT: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
  const usdcAddress = process.env.USDC_ADDRESS || "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"; 
  const ArnSessionManager = await ethers.getContractFactory("ArnSessionManager");
  const sessionManager = await ArnSessionManager.deploy(usdcAddress);
  await sessionManager.waitForDeployment();
  const sessionManagerAddress = await sessionManager.getAddress();
  console.log("ArnSessionManager deployed to:", sessionManagerAddress);

  // 4. Setup Roles (Optional)
  console.log("Deployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
