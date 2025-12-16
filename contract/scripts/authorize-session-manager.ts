import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Authorizing SessionManager with account:", deployer.address);

  const commissionAddress = "0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C";
  const sessionManagerAddress = "0xFfEf72198A71B288EfE403AC07f9c60A1a99f29e";

  const Commission = await ethers.getContractFactory("Commission");
  const commission = Commission.attach(commissionAddress);

  console.log(`⚙️  Authorizing SessionManager (${sessionManagerAddress}) on Commission (${commissionAddress})...`);
  
  const tx = await commission.setRelayer(sessionManagerAddress, true);
  console.log("Transaction sent:", tx.hash);
  
  await tx.wait();
  console.log("✅ SessionManager authorized as Relayer");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
