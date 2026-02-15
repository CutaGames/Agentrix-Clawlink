import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentInfo {
  network: string;
  chainId: number;
  contractName: string;
  address: string;
  deployedAt: string;
  deployer: string;
  constructorArgs: any[];
  transactionHash: string;
  blockNumber: number;
}

async function main() {
  console.log("=".repeat(60));
  console.log("BudgetPool Deployment Script");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.config.chainId}`);
  console.log("");

  // 获取部署者
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("");

  // 配置参数
  const config = getNetworkConfig(network.name);
  console.log("Configuration:");
  console.log(`  Settlement Token: ${config.settlementToken}`);
  console.log(`  Platform Treasury: ${config.platformTreasury}`);
  console.log(`  Platform Fee: ${config.platformFeeBps} bps (${config.platformFeeBps / 100}%)`);
  console.log("");

  // 确认部署
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("⚠️  You are deploying to a live network!");
    console.log("   Press Ctrl+C within 5 seconds to cancel...");
    await delay(5000);
  }

  // 部署合约
  console.log("Deploying BudgetPool...");
  const BudgetPool = await ethers.getContractFactory("BudgetPool");
  const budgetPool = await BudgetPool.deploy(
    config.settlementToken,
    config.platformTreasury,
    config.platformFeeBps
  );

  await budgetPool.waitForDeployment();
  const contractAddress = await budgetPool.getAddress();
  const deployTx = budgetPool.deploymentTransaction();

  console.log("");
  console.log("✅ BudgetPool deployed successfully!");
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   Transaction Hash: ${deployTx?.hash}`);
  console.log(`   Block Number: ${deployTx?.blockNumber}`);
  console.log("");

  // 初始化配置
  console.log("Initializing contract configuration...");

  // 设置平台费率
  if (config.platformFeeBps > 0) {
    console.log("  Setting platform fee...");
    const tx = await budgetPool.setPlatformFee(config.platformFeeBps);
    await tx.wait();
    console.log(`  ✅ Platform fee set to ${config.platformFeeBps} bps`);
  }

  // 设置管理员
  if (config.admins && config.admins.length > 0) {
    console.log("  Setting admins...");
    for (const admin of config.admins) {
      const tx = await budgetPool.setAdmin(admin, true);
      await tx.wait();
      console.log(`    ✅ Admin added: ${admin}`);
    }
  }

  // 设置全局审阅者
  if (config.globalReviewers && config.globalReviewers.length > 0) {
    console.log("  Setting global reviewers...");
    for (const reviewer of config.globalReviewers) {
      const tx = await budgetPool.setGlobalReviewer(reviewer, true);
      await tx.wait();
      console.log(`    ✅ Global reviewer added: ${reviewer}`);
    }
  }

  console.log("");

  // 验证部署
  console.log("Verifying deployment...");
  const settlementToken = await budgetPool.settlementToken();
  const treasury = await budgetPool.platformTreasury();
  const platformFee = await budgetPool.platformFeeBps();

  console.log(`  Settlement Token: ${settlementToken} ${settlementToken === config.settlementToken ? "✅" : "❌"}`);
  console.log(`  Platform Treasury: ${treasury} ${treasury === config.platformTreasury ? "✅" : "❌"}`);
  console.log(`  Platform Fee: ${platformFee} bps (${Number(platformFee) / 100}%)`);
  console.log("");

  // 保存部署信息
  const deploymentInfo: DeploymentInfo = {
    network: network.name,
    chainId: network.config.chainId || 0,
    contractName: "BudgetPool",
    address: contractAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    constructorArgs: [config.settlementToken, config.platformTreasury],
    transactionHash: deployTx?.hash || "",
    blockNumber: deployTx?.blockNumber || 0
  };

  saveDeploymentInfo(deploymentInfo);

  console.log("=".repeat(60));
  console.log("Deployment Complete!");
  console.log("=".repeat(60));
  console.log("");
  console.log("Next steps:");
  console.log("1. Verify contract on block explorer (if applicable)");
  console.log("2. Update backend .env with contract address");
  console.log("3. Configure pool creation permissions");
  console.log("4. Set up monitoring for pool events");
  console.log("");

  return contractAddress;
}

interface NetworkConfig {
  settlementToken: string;
  platformTreasury: string;
  platformFeeBps: number;
  admins?: string[];
  globalReviewers?: string[];
}

function getNetworkConfig(networkName: string): NetworkConfig {
  const configs: Record<string, NetworkConfig> = {
    // 本地开发
    hardhat: {
      settlementToken: "0x0000000000000000000000000000000000000001",
      platformTreasury: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      platformFeeBps: 30, // 0.3% — confirmed by CEO 2026-02-08
    },
    localhost: {
      settlementToken: "0x0000000000000000000000000000000000000001",
      platformTreasury: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      platformFeeBps: 30, // 0.3% — confirmed by CEO 2026-02-08
    },

    // BSC Testnet
    bscTestnet: {
      settlementToken: process.env.BSC_TESTNET_USDC_ADDRESS || "0x64544969ed7EBf5f083679233325356EbE738930",
      platformTreasury: process.env.PAYMIND_TREASURY_ADDRESS || process.env.PLATFORM_TREASURY || "",
      platformFeeBps: 30, // 0.3% — confirmed by CEO 2026-02-08
      admins: process.env.ADMIN_ADDRESSES?.split(",") || [process.env.RELAYER_ADDRESS].filter(Boolean),
      globalReviewers: process.env.REVIEWER_ADDRESSES?.split(",") || [],
    },

    // BSC Mainnet
    bsc: {
      settlementToken: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      platformTreasury: process.env.PLATFORM_TREASURY || "",
      platformFeeBps: 30, // 0.3% — confirmed by CEO 2026-02-08
      admins: process.env.ADMIN_ADDRESSES?.split(",") || [],
      globalReviewers: process.env.REVIEWER_ADDRESSES?.split(",") || [],
    },

    // Base Mainnet
    base: {
      settlementToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      platformTreasury: process.env.PLATFORM_TREASURY || "",
      platformFeeBps: 30, // 0.3% — confirmed by CEO 2026-02-08
      admins: process.env.ADMIN_ADDRESSES?.split(",") || [],
    },

    // Base Sepolia
    baseSepolia: {
      settlementToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      platformTreasury: process.env.PLATFORM_TREASURY || "",
      platformFeeBps: 30, // 0.3% — confirmed by CEO 2026-02-08
      admins: process.env.ADMIN_ADDRESSES?.split(",") || [],
    },

    // Polygon
    polygon: {
      settlementToken: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      platformTreasury: process.env.PLATFORM_TREASURY || "",
      platformFeeBps: 30, // 0.3% — confirmed by CEO 2026-02-08
      admins: process.env.ADMIN_ADDRESSES?.split(",") || [],
      globalReviewers: process.env.REVIEWER_ADDRESSES?.split(",") || [],
    },
  };

  const config = configs[networkName];
  if (!config) {
    throw new Error(`No configuration found for network: ${networkName}`);
  }

  if (!config.settlementToken || config.settlementToken === "") {
    throw new Error("Settlement token address is required");
  }
  if (!config.platformTreasury || config.platformTreasury === "") {
    throw new Error("Platform treasury address is required");
  }

  return config;
}

function saveDeploymentInfo(info: DeploymentInfo) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkDir = path.join(deploymentsDir, info.network);
  if (!fs.existsSync(networkDir)) {
    fs.mkdirSync(networkDir, { recursive: true });
  }

  const filePath = path.join(networkDir, `${info.contractName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(info, null, 2));
  console.log(`Deployment info saved to: ${filePath}`);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
