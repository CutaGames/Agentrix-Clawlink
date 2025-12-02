import { ethers } from "hardhat";

/**
 * 快速配置 Commission 合约（使用已部署的地址）
 * 
 * 这个脚本使用硬编码的地址，用于快速配置 Commission 合约
 */
async function main() {
  // 已部署的合约地址
  const commissionAddress = "0xd220A50F62a333929cB1a219134dF7D4c3e2f62F";
  
  // BSC 测试网 USDT 地址
  const settlementToken = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  
  // Agentrix 金库地址（使用部署者地址）
  const agentrixTreasury = "0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3";
  
  // 系统返利池地址（默认使用 treasury 地址）
  const systemRebatePool = agentrixTreasury;

  console.log("⚙️  Configuring Commission contract...");
  console.log("Commission Address:", commissionAddress);
  console.log("Settlement Token:", settlementToken);
  console.log("Agentrix Treasury:", agentrixTreasury);
  console.log("System Rebate Pool:", systemRebatePool);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  console.log("");

  const Commission = await ethers.getContractFactory("Commission");
  const commission = Commission.attach(commissionAddress);

  // 检查是否已经配置
  try {
    const currentToken = await commission.settlementToken();
    if (currentToken && currentToken !== ethers.ZeroAddress) {
      console.log("⚠️  Commission contract already configured!");
      console.log("Current settlement token:", currentToken);
      console.log("If you want to reconfigure, please do it manually.");
      return;
    }
  } catch (error) {
    // 如果查询失败，继续配置
    console.log("Contract not configured yet, proceeding with configuration...");
  }

  // 配置结算代币、金库和返利池（一次性配置）
  console.log("Setting settlement token, treasury and rebate pool...");
  const tx = await commission.configureSettlementToken(
    settlementToken,
    agentrixTreasury,
    systemRebatePool
  );
  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  await tx.wait();
  console.log("✅ Commission contract configured successfully!");
  console.log("");
  console.log("📋 Configuration Summary:");
  console.log("   Settlement Token:", settlementToken);
  console.log("   Agentrix Treasury:", agentrixTreasury);
  console.log("   System Rebate Pool:", systemRebatePool);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Configuration failed:");
    console.error(error);
    process.exit(1);
  });

