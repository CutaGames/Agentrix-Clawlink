import { ethers } from "hardhat";

/**
 * 部署 ERC8004SessionManager V5.0
 */

const USDC_ADDRESS = "0xc23453b4842FDc4360A0a3518E2C0f51a2069386";
const RELAYER_ADDRESS = "0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying ERC8004SessionManager V5.0");
  console.log("========================================");
  console.log("Deployer:", deployer.address);
  console.log("");

  const ERC8004SessionManager = await ethers.getContractFactory("ERC8004SessionManager");
  const sessionManager = await ERC8004SessionManager.deploy(USDC_ADDRESS);
  await sessionManager.waitForDeployment();
  const address = await sessionManager.getAddress();
  console.log("✅ ERC8004SessionManager deployed to:", address);

  // 设置 Relayer
  console.log("   Setting relayer...");
  await sessionManager.setRelayer(RELAYER_ADDRESS);
  console.log("   ✅ Relayer set to:", RELAYER_ADDRESS);

  // 验证
  const owner = await sessionManager.owner();
  const token = await sessionManager.paymentToken();
  const relayer = await sessionManager.relayer();
  console.log("");
  console.log("Verification:");
  console.log("  Owner:", owner);
  console.log("  Payment Token:", token);
  console.log("  Relayer:", relayer);

  console.log("");
  console.log(`ERC8004_SESSION_MANAGER_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
