import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ARN Protocol contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

  // Configuration
  const USDT_ADDRESS = process.env.BSC_TESTNET_USDC_ADDRESS || "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  const COMMISSION_CONTRACT = process.env.COMMISSION_CONTRACT_ADDRESS || "0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C";
  
  console.log("\n=== Configuration ===");
  console.log("USDT Address:", USDT_ADDRESS);
  console.log("Commission Contract:", COMMISSION_CONTRACT);

  // 1. Deploy ArnTreasury
  console.log("\n[1/7] Deploying ArnTreasury...");
  const ArnTreasury = await ethers.getContractFactory("ArnTreasury");
  const treasury = await ArnTreasury.deploy(deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ ArnTreasury deployed to:", treasuryAddress);

  // 2. Deploy ArnFeeSplitter
  console.log("\n[2/7] Deploying ArnFeeSplitter...");
  const ArnFeeSplitter = await ethers.getContractFactory("ArnFeeSplitter");
  const feeSplitter = await ArnFeeSplitter.deploy(treasuryAddress, COMMISSION_CONTRACT);
  await feeSplitter.waitForDeployment();
  const feeSplitterAddress = await feeSplitter.getAddress();
  console.log("✅ ArnFeeSplitter deployed to:", feeSplitterAddress);

  // 3. Deploy ArnSessionManager
  console.log("\n[3/7] Deploying ArnSessionManager...");
  const ArnSessionManager = await ethers.getContractFactory("ArnSessionManager");
  const sessionManager = await ArnSessionManager.deploy(USDT_ADDRESS);
  await sessionManager.waitForDeployment();
  const sessionManagerAddress = await sessionManager.getAddress();
  console.log("✅ ArnSessionManager deployed to:", sessionManagerAddress);

  // 4. Deploy ReceiptRegistry
  console.log("\n[4/7] Deploying ReceiptRegistry...");
  const ReceiptRegistry = await ethers.getContractFactory("ReceiptRegistry");
  const receiptRegistry = await ReceiptRegistry.deploy(deployer.address);
  await receiptRegistry.waitForDeployment();
  const receiptRegistryAddress = await receiptRegistry.getAddress();
  console.log("✅ ReceiptRegistry deployed to:", receiptRegistryAddress);

  // 5. Deploy EpochManager
  console.log("\n[5/7] Deploying EpochManager...");
  const EpochManager = await ethers.getContractFactory("EpochManager");
  const epochManager = await EpochManager.deploy(deployer.address);
  await epochManager.waitForDeployment();
  const epochManagerAddress = await epochManager.getAddress();
  console.log("✅ EpochManager deployed to:", epochManagerAddress);

  // 6. Deploy MerkleDistributor
  console.log("\n[6/7] Deploying MerkleDistributor...");
  const MerkleDistributor = await ethers.getContractFactory("MerkleDistributor");
  const merkleDistributor = await MerkleDistributor.deploy(deployer.address, treasuryAddress);
  await merkleDistributor.waitForDeployment();
  const merkleDistributorAddress = await merkleDistributor.getAddress();
  console.log("✅ MerkleDistributor deployed to:", merkleDistributorAddress);

  // 7. Deploy AttestationRegistry
  console.log("\n[7/7] Deploying AttestationRegistry...");
  const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
  const attestationRegistry = await AttestationRegistry.deploy(
    deployer.address,
    USDT_ADDRESS,           // bondToken
    ethers.parseUnits("10", 18), // minBondAmount: 10 USDT
    7 * 24 * 60 * 60,       // challengePeriod: 7 days
    5000                    // slashPercentage: 50%
  );
  await attestationRegistry.waitForDeployment();
  const attestationRegistryAddress = await attestationRegistry.getAddress();
  console.log("✅ AttestationRegistry deployed to:", attestationRegistryAddress);

  // Setup Roles
  console.log("\n=== Setting up Roles ===");

  // Grant EMITTER_ROLE to FeeSplitter so it can record receipts
  const EMITTER_ROLE = await receiptRegistry.EMITTER_ROLE();
  await receiptRegistry.grantRole(EMITTER_ROLE, feeSplitterAddress);
  console.log("✅ Granted EMITTER_ROLE to ArnFeeSplitter");

  // Grant DISTRIBUTOR_ROLE to MerkleDistributor
  const DISTRIBUTOR_ROLE = await treasury.DISTRIBUTOR_ROLE();
  await treasury.grantRole(DISTRIBUTOR_ROLE, merkleDistributorAddress);
  console.log("✅ Granted DISTRIBUTOR_ROLE to MerkleDistributor");

  // Summary
  console.log("\n========================================");
  console.log("=== ARN Protocol Deployment Summary ===");
  console.log("========================================");
  console.log(`ArnTreasury:         ${treasuryAddress}`);
  console.log(`ArnFeeSplitter:      ${feeSplitterAddress}`);
  console.log(`ArnSessionManager:   ${sessionManagerAddress}`);
  console.log(`ReceiptRegistry:     ${receiptRegistryAddress}`);
  console.log(`EpochManager:        ${epochManagerAddress}`);
  console.log(`MerkleDistributor:   ${merkleDistributorAddress}`);
  console.log(`AttestationRegistry: ${attestationRegistryAddress}`);
  console.log("========================================");

  // Output for .env file
  console.log("\n=== Copy to .env ===");
  console.log(`ARN_TREASURY_ADDRESS=${treasuryAddress}`);
  console.log(`ARN_FEE_SPLITTER_ADDRESS=${feeSplitterAddress}`);
  console.log(`ARN_SESSION_MANAGER_ADDRESS=${sessionManagerAddress}`);
  console.log(`ARN_RECEIPT_REGISTRY_ADDRESS=${receiptRegistryAddress}`);
  console.log(`ARN_EPOCH_MANAGER_ADDRESS=${epochManagerAddress}`);
  console.log(`ARN_MERKLE_DISTRIBUTOR_ADDRESS=${merkleDistributorAddress}`);
  console.log(`ARN_ATTESTATION_REGISTRY_ADDRESS=${attestationRegistryAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
