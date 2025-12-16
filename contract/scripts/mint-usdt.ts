import { ethers } from "hardhat";

/**
 * 快速向指定地址 mint 测试 USDT（默认 10,000 枚）
 *
 * 依赖：
 * - SETTLEMENT_TOKEN_ADDRESS 指向可 mint 的 USDT/MockUSDT 合约
 * - PRIVATE_KEY 拥有 mint 权限
 */
async function main() {
  const usdtAddress =
    process.env.SETTLEMENT_TOKEN_ADDRESS ||
    "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  const targetAddress =
    process.env.USDT_MINT_TARGET ||
    "0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3";
  const amount = process.env.USDT_MINT_AMOUNT || "10000";

  const [signer] = await ethers.getSigners();
  console.log("🚀 Minting test USDT");
  console.log("Minter:", signer.address);
  console.log("Token :", usdtAddress);
  console.log("Target:", targetAddress);
  console.log("Amount:", amount, "USDT");

  const token = await ethers.getContractAt("MockERC20", usdtAddress);
  
  let decimals = 18;
  try {
      decimals = Number(await token.decimals());
  } catch (e) {
      console.warn("Could not fetch decimals, defaulting to 18");
  }
  console.log("Decimals:", decimals);

  const tx = await token.mint(targetAddress, ethers.parseUnits(amount, decimals));
  console.log("⛽️ Tx sent:", tx.hash);
  await tx.wait();
  console.log("✅ Mint success!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Mint failed:", error);
    process.exit(1);
  });


