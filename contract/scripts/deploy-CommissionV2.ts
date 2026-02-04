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
  console.log("CommissionV2 Deployment Script");
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
  console.log("");

  // 确认部署
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("⚠️  You are deploying to a live network!");
    console.log("   Press Ctrl+C within 5 seconds to cancel...");
    await delay(5000);
  }

  // 部署合约
  console.log("Deploying CommissionV2...");
  const CommissionV2 = await ethers.getContractFactory("CommissionV2");
  const commissionV2 = await CommissionV2.deploy(
    config.settlementToken,
    config.platformTreasury
  );

  await commissionV2.waitForDeployment();
  const contractAddress = await commissionV2.getAddress();
  const deployTx = commissionV2.deploymentTransaction();

  console.log("");
  console.log("✅ CommissionV2 deployed successfully!");
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   Transaction Hash: ${deployTx?.hash}`);
  console.log(`   Block Number: ${deployTx?.blockNumber}`);
  console.log("");

  // 初始化配置
  console.log("Initializing contract configuration...");

  // 设置默认费率 (如果需要自定义)
  if (config.customFeeConfig) {
    console.log("  Setting custom fee config...");
    const tx = await commissionV2.updateDefaultFeeConfig(
      config.customFeeConfig.onrampFeeBps,
      config.customFeeConfig.offrampFeeBps,
      config.customFeeConfig.splitFeeBps,
      config.customFeeConfig.minSplitFee
    );
    await tx.wait();
    console.log("  ✅ Fee config updated");
  }

  // 设置 Relayer
  if (config.relayers && config.relayers.length > 0) {
    console.log("  Setting relayers...");
    for (const relayer of config.relayers) {
      const tx = await commissionV2.setRelayer(relayer, true);
      await tx.wait();
      console.log(`    ✅ Relayer added: ${relayer}`);
    }
  }

  // 设置 Operators
  if (config.operators && config.operators.length > 0) {
    console.log("  Setting operators...");
    for (const operator of config.operators) {
      const tx = await commissionV2.setOperator(operator, true);
      await tx.wait();
      console.log(`    ✅ Operator added: ${operator}`);
    }
  }

  console.log("");

  // 验证部署
  console.log("Verifying deployment...");
  const settlementToken = await commissionV2.settlementToken();
  const treasury = await commissionV2.platformTreasury();
  const feeConfig = await commissionV2.defaultFeeConfig();

  console.log(`  Settlement Token: ${settlementToken} ${settlementToken === config.settlementToken ? "✅" : "❌"}`);
  console.log(`  Platform Treasury: ${treasury} ${treasury === config.platformTreasury ? "✅" : "❌"}`);
  console.log(`  Fee Config:`);
  console.log(`    - Onramp Fee: ${feeConfig.onrampFeeBps} bps (${Number(feeConfig.onrampFeeBps) / 100}%)`);
  console.log(`    - Offramp Fee: ${feeConfig.offrampFeeBps} bps (${Number(feeConfig.offrampFeeBps) / 100}%)`);
  console.log(`    - Split Fee: ${feeConfig.splitFeeBps} bps (${Number(feeConfig.splitFeeBps) / 100}%)`);
  console.log(`    - Min Split Fee: ${feeConfig.minSplitFee} (${Number(feeConfig.minSplitFee) / 1000000} USDC)`);
  console.log("");

  // 保存部署信息
  const deploymentInfo: DeploymentInfo = {
    network: network.name,
    chainId: network.config.chainId || 0,
    contractName: "CommissionV2",
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
  console.log("3. Create system split plan templates");
  console.log("");

  // 返回合约地址用于其他脚本
  return contractAddress;
}

interface NetworkConfig {
  settlementToken: string;
  platformTreasury: string;
  relayers?: string[];
  operators?: string[];
  customFeeConfig?: {
    onrampFeeBps: number;
    offrampFeeBps: number;
    splitFeeBps: number;
    minSplitFee: number;
  };
}

function getNetworkConfig(networkName: string): NetworkConfig {
  const configs: Record<string, NetworkConfig> = {
    // 本地开发
    hardhat: {
      settlementToken: "0x0000000000000000000000000000000000000001", // Placeholder
      platformTreasury: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat account #0
    },
    localhost: {
      settlementToken: "0x0000000000000000000000000000000000000001",
      platformTreasury: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    },

    // BSC Testnet
    bscTestnet: {
      settlementToken: process.env.BSC_TESTNET_USDC_ADDRESS || "0x64544969ed7EBf5f083679233325356EbE738930", // USDC on BSC Testnet
      platformTreasury: process.env.PAYMIND_TREASURY_ADDRESS || process.env.PLATFORM_TREASURY || "",
      relayers: process.env.RELAYER_ADDRESSES?.split(",") || [process.env.RELAYER_ADDRESS].filter(Boolean),
      operators: process.env.OPERATOR_ADDRESSES?.split(",") || [],
    },

    // BSC Mainnet
    bsc: {
      settlementToken: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC on BSC
      platformTreasury: process.env.PLATFORM_TREASURY || "",
      relayers: process.env.RELAYER_ADDRESSES?.split(",") || [],
      operators: process.env.OPERATOR_ADDRESSES?.split(",") || [],
      customFeeConfig: {
        onrampFeeBps: 10,  // 0.1%
        offrampFeeBps: 10, // 0.1%
        splitFeeBps: 30,   // 0.3%
        minSplitFee: 100000 // 0.1 USDC
      }
    },

    // Base Mainnet
    base: {
      settlementToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
      platformTreasury: process.env.PLATFORM_TREASURY || "",
      relayers: process.env.RELAYER_ADDRESSES?.split(",") || [],
      operators: process.env.OPERATOR_ADDRESSES?.split(",") || [],
    },

    // Base Sepolia
    baseSepolia: {
      settlementToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
      platformTreasury: process.env.PLATFORM_TREASURY || "",
      relayers: process.env.RELAYER_ADDRESSES?.split(",") || [],
    },

    // Polygon
    polygon: {
      settlementToken: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC on Polygon
      platformTreasury: process.env.PLATFORM_TREASURY || "",
      relayers: process.env.RELAYER_ADDRESSES?.split(",") || [],
      operators: process.env.OPERATOR_ADDRESSES?.split(",") || [],
    },
  };

  const config = configs[networkName];
  if (!config) {
    throw new Error(`No configuration found for network: ${networkName}`);
  }

  // 验证必填配置
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
