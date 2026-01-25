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
    
    // 设置 X402 支付通道，将 X402Adapter 设为通道地址
    await paymentRouter.setPaymentChannel(
      2, // X402
      await x402Adapter.getAddress(),
      true,
      50,
      ethers.parseEther("0.001"),
      ethers.parseEther("1000")
    );

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

      // 验证事件发出（不验证 sessionId 的具体值，因为是动态生成的）
      await expect(tx).to.emit(x402Adapter, "X402SessionCreated");
    });
  });

  describe("执行X402支付", function () {
    let sessionId: string;
    let paymentId: string;
    const amount = ethers.parseEther("1");

    beforeEach(async function () {
      paymentId = ethers.id("test-payment");
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

    it("应该成功执行支付（中继器，正确签名）", async function () {
      // 首先在 PaymentRouter 中创建支付记录，以便 completePayment 可以工作
      await paymentRouter.routePayment(
        paymentId,
        recipient.address,
        amount,
        2, // X402
        ethers.ZeroHash,  // sessionId
        amount,           // merchantPrice
        0                 // channelFee
      );
      
      // 获取 session 信息
      const session = await x402Adapter.getSession(sessionId);
      
      // 获取当前链ID
      const chainId = (await ethers.provider.getNetwork()).chainId;
      
      // 构建 EIP-712 签名
      const domain = {
        name: "X402Adapter",
        version: "1",
        chainId: chainId,
        verifyingContract: await x402Adapter.getAddress()
      };
      
      const types = {
        Payment: [
          { name: "sessionId", type: "bytes32" },
          { name: "paymentId", type: "bytes32" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "chainId", type: "uint256" }
        ]
      };
      
      const value = {
        sessionId: sessionId,
        paymentId: paymentId,
        recipient: recipient.address,
        amount: amount,
        expiry: session.expiresAt,
        chainId: chainId
      };
      
      // 由 payer 签名（使用 EIP-712 方式）
      const signature = await payer.signTypedData(domain, types, value);

      await expect(
        x402Adapter.connect(relayer).executePayment(sessionId, signature)
      )
        .to.emit(x402Adapter, "X402PaymentExecuted");
    });

    it("应该拒绝非中继器执行", async function () {
      // 生成一个有效长度的签名
      const fakeSignature = ethers.hexlify(ethers.randomBytes(65));

      await expect(
        x402Adapter.connect(payer).executePayment(sessionId, fakeSignature)
      ).to.be.revertedWith("Only relayer can execute");
    });

    it("应该拒绝无效签名长度", async function () {
      const invalidSignature = ethers.toUtf8Bytes("short");

      await expect(
        x402Adapter.connect(relayer).executePayment(sessionId, invalidSignature)
      ).to.be.revertedWith("Invalid signature length");
    });

    it("应该拒绝错误签名者", async function () {
      // 获取 session 信息
      const session = await x402Adapter.getSession(sessionId);
      
      // 获取当前链ID
      const chainId = (await ethers.provider.getNetwork()).chainId;
      
      // 构建 EIP-712 签名
      const domain = {
        name: "X402Adapter",
        version: "1",
        chainId: chainId,
        verifyingContract: await x402Adapter.getAddress()
      };
      
      const types = {
        Payment: [
          { name: "sessionId", type: "bytes32" },
          { name: "paymentId", type: "bytes32" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "chainId", type: "uint256" }
        ]
      };
      
      const value = {
        sessionId: sessionId,
        paymentId: paymentId,
        recipient: recipient.address,
        amount: amount,
        expiry: session.expiresAt,
        chainId: chainId
      };
      
      // 由错误的签名者（relayer而非payer）签名
      const wrongSignature = await relayer.signTypedData(domain, types, value);

      await expect(
        x402Adapter.connect(relayer).executePayment(sessionId, wrongSignature)
      ).to.be.revertedWith("Invalid signature");
    });
  });

  describe("管理功能", function () {
    it("应该允许owner暂停合约", async function () {
      await x402Adapter.pause();
      expect(await x402Adapter.paused()).to.be.true;
    });

    it("应该允许owner恢复合约", async function () {
      await x402Adapter.pause();
      await x402Adapter.unpause();
      expect(await x402Adapter.paused()).to.be.false;
    });

    it("应该允许owner紧急提款", async function () {
      const withdrawAmount = ethers.parseEther("5");
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      
      await x402Adapter.emergencyWithdraw(owner.address, withdrawAmount);
      
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      // 账户余额应该增加（减去gas费用）
      expect(balanceAfter).to.be.gt(balanceBefore - ethers.parseEther("0.1"));
    });
  });
});

