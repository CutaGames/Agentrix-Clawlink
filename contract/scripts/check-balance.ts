import { ethers } from "hardhat";

async function main() {
  const usdtAddress = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  const addresses = [
    "0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3",
    "0x6c1a26eB7adc25822f91e3389A33528508a81F0c",
    "0x1f5D9bB59Fdb91c9f82291F7b896dE07d31888a5"
  ];

  const token = await ethers.getContractAt(["function balanceOf(address) view returns (uint256)", "function symbol() view returns (string)", "function decimals() view returns (uint8)"], usdtAddress);
  
  const symbol = await token.symbol();
  const decimals = await token.decimals();

  for (const targetAddress of addresses) {
    const balance = await token.balanceOf(targetAddress);
    console.log(`Balance of ${targetAddress}: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  }
}

main().catch(console.error);
