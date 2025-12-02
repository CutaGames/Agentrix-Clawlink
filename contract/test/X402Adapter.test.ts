import { expect } from "chai";
import { ethers } from "hardhat";
import { X402Adapter, PaymentRouter } from "../typechain-types";

describe("X402Adapter", function () {
  let paymentRouter: PaymentRouter;
  let x402Adapter: X402Adapter;
  let owner: any;
  let payer: any;
  let recipient: any;
  let relayer: any;

  beforeEach(async function () {
    [owner, payer, recipient, relayer] = await ethers.getSigners();

    // 部署PaymentRouter
    const PaymentRouterFactory = await ethers.getContractFactory("PaymentRouter");
    paymentRouter = await PaymentRouterFactory.deploy();
    await paymentRouter.waitForDeployment();

    // 部署X402Adapter
    const X402AdapterFactory = await ethers.getContractFactory("X402Adapter");
    x402Adapter = await X402AdapterFactory.deploy(await paymentRouter.getAddress());
    await x402Adapter.waitForDeployment();

    // 设置中继器
    await x402Adapter.setRelayer(relayer.address);

    // 向合约存入ETH
    await owner.sendTransaction({
      to: await x402Adapter.getAddress(),
      value: ethers.parseEther("10"),
    });
  });

  describe("创建X402支付会话", function () {
    it("应该成功创建支付会话", async function () {
      const paymentId = ethers.id("test-payment");
      const amount = ethers.parseEther("1");
      const compressedData = ethers.toUtf8Bytes("compressed-data");
      const expiresAt = (await ethers.provider.getBlock("latest"))!.timestamp + 300;

      const tx = await x402Adapter.connect(payer).createSession(
        paymentId,
        recipient.address,
        amount,
        compressedData,
        expiresAt
      );

      await expect(tx)
        .to.emit(x402Adapter, "X402SessionCreated")
        .withArgs(
          ethers.anyValue,
          paymentId,
          payer.address,
          amount
        );
    });
  });

  describe("执行X402支付", function () {
    let sessionId: string;
    let paymentId: string;

    beforeEach(async function () {
      paymentId = ethers.id("test-payment");
      const amount = ethers.parseEther("1");
      const compressedData = ethers.toUtf8Bytes("compressed-data");
      const expiresAt = (await ethers.provider.getBlock("latest"))!.timestamp + 300;

      const tx = await x402Adapter.connect(payer).createSession(
        paymentId,
        recipient.address,
        amount,
        compressedData,
        expiresAt
      );

      const receipt = await tx.wait();
      const event = receipt!.logs.find(
        (log: any) => log.fragment?.name === "X402SessionCreated"
      );
      sessionId = event!.topics[1];
    });

    it("应该成功执行支付（中继器）", async function () {
      const signatures = ethers.toUtf8Bytes("signatures");

      await expect(
        x402Adapter.connect(relayer).executePayment(sessionId, signatures)
      )
        .to.emit(x402Adapter, "X402PaymentExecuted")
        .withArgs(
          sessionId,
          paymentId,
          recipient.address,
          ethers.parseEther("1"),
          ethers.anyValue
        );
    });

    it("应该拒绝非中继器执行", async function () {
      const signatures = ethers.toUtf8Bytes("signatures");

      await expect(
        x402Adapter.connect(payer).executePayment(sessionId, signatures)
      ).to.be.revertedWith("Only relayer can execute");
    });

    it("应该拒绝已执行的支付", async function () {
      const signatures = ethers.toUtf8Bytes("signatures");

      // 第一次执行
      await x402Adapter.connect(relayer).executePayment(sessionId, signatures);

      // 第二次执行应该失败
      await expect(
        x402Adapter.connect(relayer).executePayment(sessionId, signatures)
      ).to.be.revertedWith("Payment already executed");
    });
  });
});

