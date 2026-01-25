import { ethers } from "hardhat";

async function main() {
  const usdtAddress =
    process.env.SETTLEMENT_TOKEN_ADDRESS ||
    "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  const targetAddress =
    process.env.USDT_MINT_TARGET ||
    "0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3";
  const amount = process.env.USDT_MINT_AMOUNT || "100000";

  const [signer] = await ethers.getSigners();
  console.log("🚀 Minting test USDT (V2)");
  console.log("Minter:", signer.address);
  console.log("Token :", usdtAddress);
  console.log("Target:", targetAddress);
  console.log("Amount:", amount, "USDT");

  const token = await ethers.getContractAt("IERC20", usdtAddress);
  
  let decimals = 18;
  try {
      // @ts-ignore
      decimals = Number(await token.decimals());
  } catch (e) {
      console.warn("Could not fetch decimals, defaulting to 18");
  }
  console.log("Decimals:", decimals);

  const mintAmount = ethers.parseUnits(amount, decimals);

  // Try 'mint'
  console.log("Trying 'mint'...");
  try {
      const tokenWithMint = await ethers.getContractAt(["function mint(address,uint256)"], usdtAddress);
      const tx = await tokenWithMint.mint(targetAddress, mintAmount);
      console.log("⛽️ Tx sent (mint):", tx.hash);
      await tx.wait();
      console.log("✅ Mint success!");
      return;
  } catch (e: any) {
      console.error("❌ 'mint' failed:", e.message);
  }

  // Try 'allocateTo'
  console.log("Trying 'allocateTo'...");
  try {
      const tokenWithAllocate = await ethers.getContractAt(["function allocateTo(address,uint256)"], usdtAddress);
      const tx = await tokenWithAllocate.allocateTo(targetAddress, mintAmount);
      console.log("⛽️ Tx sent (allocateTo):", tx.hash);
      await tx.wait();
      console.log("✅ allocateTo success!");
      return;
  } catch (e: any) {
      console.error("❌ 'allocateTo' failed:", e.message);
  }

  // Try 'faucet'
  console.log("Trying 'faucet'...");
  try {
      const tokenWithFaucet = await ethers.getContractAt(["function faucet(uint256)"], usdtAddress);
      const tx = await tokenWithFaucet.faucet(mintAmount);
      console.log("⛽️ Tx sent (faucet):", tx.hash);
      await tx.wait();
      console.log("✅ faucet success!");
      return;
  } catch (e: any) {
      console.error("❌ 'faucet' failed:", e.message);
  }

  console.error("🛑 All minting attempts failed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
