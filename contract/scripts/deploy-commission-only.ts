import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Commission with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const Commission = await ethers.getContractFactory("Commission");
  const commission = await Commission.deploy();
  await commission.waitForDeployment();
  console.log("Commission deployed to:", await commission.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
