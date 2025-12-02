import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 部署 PaymentRouter
  console.log("\nDeploying PaymentRouter...");
  const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
  const paymentRouter = await PaymentRouter.deploy();
  await paymentRouter.waitForDeployment();
  const paymentRouterAddress = await paymentRouter.getAddress();
  console.log("PaymentRouter deployed to:", paymentRouterAddress);

  // 部署 X402Adapter
  console.log("\nDeploying X402Adapter...");
  const X402Adapter = await ethers.getContractFactory("X402Adapter");
  const x402Adapter = await X402Adapter.deploy(paymentRouterAddress);
  await x402Adapter.waitForDeployment();
  const x402AdapterAddress = await x402Adapter.getAddress();
  console.log("X402Adapter deployed to:", x402AdapterAddress);

  // 部署 AutoPay
  console.log("\nDeploying AutoPay...");
  const AutoPay = await ethers.getContractFactory("AutoPay");
  const autoPay = await AutoPay.deploy();
  await autoPay.waitForDeployment();
  const autoPayAddress = await autoPay.getAddress();
  console.log("AutoPay deployed to:", autoPayAddress);

  // 部署 Commission
  console.log("\nDeploying Commission...");
  const Commission = await ethers.getContractFactory("Commission");
  const commission = await Commission.deploy();
  await commission.waitForDeployment();
  const commissionAddress = await commission.getAddress();
  console.log("Commission deployed to:", commissionAddress);

  // 配置 PaymentRouter
  console.log("\nConfiguring PaymentRouter...");
  await paymentRouter.setPaymentChannel(
    2, // X402
    x402AdapterAddress,
    true,
    100, // priority
    0, // minAmount
    ethers.parseEther("1000") // maxAmount
  );
  console.log("PaymentRouter configured");

  console.log("\n=== Deployment Summary ===");
  console.log("PaymentRouter:", paymentRouterAddress);
  console.log("X402Adapter:", x402AdapterAddress);
  console.log("AutoPay:", autoPayAddress);
  console.log("Commission:", commissionAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

