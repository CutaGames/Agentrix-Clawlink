import { expect } from "chai";
import { ethers } from "hardhat";
import { AutoPay } from "../typechain-types";

describe("AutoPay", function () {
  let autoPay: AutoPay;
  let paymentToken: any; // MockERC20
  let owner: any;
  let user: any;
  let agent: any;
  let recipient: any;

  beforeEach(async function () {
    [owner, user, agent, recipient] = await ethers.getSigners();

    // 部署 MockERC20 用于支付
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    paymentToken = await MockERC20.deploy("Test USDC", "USDC", ethers.parseEther("1000000"));
    await paymentToken.waitForDeployment();

    // 部署 AutoPay 合约
    const AutoPayFactory = await ethers.getContractFactory("AutoPay");
    autoPay = await AutoPayFactory.deploy();
    await autoPay.waitForDeployment();

    // 配置支付代币
    await autoPay.setPaymentToken(await paymentToken.getAddress());

    // 给用户转入代币用于测试
    await paymentToken.transfer(user.address, ethers.parseEther("100"));

    // 用户授权 AutoPay 合约使用代币
    await paymentToken.connect(user).approve(await autoPay.getAddress(), ethers.parseEther("1000"));
  });

  describe("创建授权", function () {
    it("应该成功创建授权", async function () {
      const singleLimit = ethers.parseEther("1");
      const dailyLimit = ethers.parseEther("5");
      const duration = 30 * 24 * 60 * 60; // 30天

      await expect(
        autoPay.connect(user).createGrant(
          agent.address,
          singleLimit,
          dailyLimit,
          duration
        )
      ).to.emit(autoPay, "GrantCreated");
    });

    it("应该拒绝无效的授权参数", async function () {
      const singleLimit = ethers.parseEther("10");
      const dailyLimit = ethers.parseEther("5"); // 单次限额大于每日限额

      await expect(
        autoPay.connect(user).createGrant(
          agent.address,
          singleLimit,
          dailyLimit,
          30 * 24 * 60 * 60
        )
      ).to.be.revertedWith("Single limit exceeds daily limit");
    });
  });

  describe("执行自动支付", function () {
    beforeEach(async function () {
      // 创建授权
      await autoPay.connect(user).createGrant(
        agent.address,
        ethers.parseEther("1"),
        ethers.parseEther("5"),
        30 * 24 * 60 * 60
      );
    });

    it("应该成功执行自动支付", async function () {
      const amount = ethers.parseEther("0.5");
      const paymentId = ethers.id("test-payment-1");

      await expect(
        autoPay.connect(agent).executeAutoPayment(
          paymentId,
          user.address,
          recipient.address,
          amount
        )
      )
        .to.emit(autoPay, "AutoPaymentExecuted")
        .withArgs(
          paymentId,
          user.address,
          agent.address,
          recipient.address,
          amount
        );
    });

    it("应该拒绝超过单次限额的支付", async function () {
      const amount = ethers.parseEther("2"); // 超过单次限额1 ETH
      const paymentId = ethers.id("test-payment-2");

      await expect(
        autoPay.connect(agent).executeAutoPayment(
          paymentId,
          user.address,
          recipient.address,
          amount
        )
      ).to.be.revertedWith("Amount exceeds single limit");
    });

    it("应该拒绝超过每日限额的支付", async function () {
      // 执行5次支付，每次1 ETH，总共用完5 ETH每日限额
      await autoPay.connect(agent).executeAutoPayment(
        ethers.id("payment-1"),
        user.address,
        recipient.address,
        ethers.parseEther("1")
      );
      await autoPay.connect(agent).executeAutoPayment(
        ethers.id("payment-2"),
        user.address,
        recipient.address,
        ethers.parseEther("1")
      );
      await autoPay.connect(agent).executeAutoPayment(
        ethers.id("payment-3"),
        user.address,
        recipient.address,
        ethers.parseEther("1")
      );
      await autoPay.connect(agent).executeAutoPayment(
        ethers.id("payment-4"),
        user.address,
        recipient.address,
        ethers.parseEther("1")
      );
      await autoPay.connect(agent).executeAutoPayment(
        ethers.id("payment-5"),
        user.address,
        recipient.address,
        ethers.parseEther("1")
      );

      // 第6次执行应该超过每日限额（5 + 1 = 6 > 5）
      await expect(
        autoPay.connect(agent).executeAutoPayment(
          ethers.id("payment-6"),
          user.address,
          recipient.address,
          ethers.parseEther("1")
        )
      ).to.be.revertedWith("Amount exceeds daily limit");
    });
  });

  describe("撤销授权", function () {
    beforeEach(async function () {
      await autoPay.connect(user).createGrant(
        agent.address,
        ethers.parseEther("1"),
        ethers.parseEther("5"),
        30 * 24 * 60 * 60
      );
    });

    it("应该成功撤销授权", async function () {
      await expect(
        autoPay.connect(user).revokeGrant(agent.address)
      )
        .to.emit(autoPay, "GrantRevoked")
        .withArgs(user.address, agent.address);
    });

    it("撤销后应该无法执行支付", async function () {
      await autoPay.connect(user).revokeGrant(agent.address);

      await expect(
        autoPay.connect(agent).executeAutoPayment(
          ethers.id("payment-after-revoke"),
          user.address,
          recipient.address,
          ethers.parseEther("0.5")
        )
      ).to.be.revertedWith("Grant not active");
    });
  });

  describe("V5.0: Commission 集成", function () {
    let commission: any;

    beforeEach(async function () {
      // 部署 Commission 合约
      const CommissionFactory = await ethers.getContractFactory("Commission");
      commission = await CommissionFactory.deploy();
      await commission.waitForDeployment();

      // 配置 Commission 合约
      const treasuryAddress = owner.address;
      const rebatePoolAddress = owner.address;
      await commission.configureSettlementToken(
        await paymentToken.getAddress(),
        treasuryAddress,
        rebatePoolAddress
      );

      // 初始化 V5 费率
      await commission.initializeV5Rates();

      // 设置 AutoPay 为 relayer
      await commission.setRelayer(await autoPay.getAddress(), true);

      // 创建授权
      await autoPay.connect(user).createGrant(
        agent.address,
        ethers.parseEther("10"),
        ethers.parseEther("50"),
        30 * 24 * 60 * 60
      );
    });

    it("应该成功设置 Commission 合约", async function () {
      await autoPay.setCommissionContract(await commission.getAddress());
      expect(await autoPay.commissionContract()).to.equal(await commission.getAddress());
    });

    it("应该成功启用分账模式", async function () {
      await autoPay.setSplitModeEnabled(true);
      expect(await autoPay.splitModeEnabled()).to.be.true;
    });

    it("分账模式关闭时应该直接转账", async function () {
      // 确保分账模式关闭
      await autoPay.setSplitModeEnabled(false);

      const amount = ethers.parseEther("1");
      const paymentId = ethers.id("direct-payment");
      const recipientBalanceBefore = await paymentToken.balanceOf(recipient.address);

      await autoPay.connect(agent).executeAutoPayment(
        paymentId,
        user.address,
        recipient.address,
        amount
      );

      const recipientBalanceAfter = await paymentToken.balanceOf(recipient.address);
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(amount);
    });

    it("分账模式开启时应该调用 Commission 分账", async function () {
      // 设置 Commission 合约和启用分账模式
      await autoPay.setCommissionContract(await commission.getAddress());
      await autoPay.setSplitModeEnabled(true);

      // 用户需要 approve Commission 合约
      await paymentToken.connect(user).approve(
        await commission.getAddress(),
        ethers.parseEther("1000")
      );

      // 设置分账配置 - 使用完整的 SplitConfig 结构体
      const orderId = ethers.id("split-payment");
      const amount = ethers.parseEther("1");
      const splitConfig = {
        merchantMPCWallet: recipient.address,
        merchantAmount: ethers.parseEther("0.975"),  // 97.5%
        referrer: ethers.ZeroAddress,
        referralFee: 0,
        executor: owner.address,
        executionFee: ethers.parseEther("0.02"),     // 2%
        platformFee: ethers.parseEther("0.005"),     // 0.5%
        offRampFee: 0,
        executorHasWallet: true,
        settlementTime: 0,
        isDisputed: false,
        sessionId: ethers.ZeroHash,
        proofHash: ethers.ZeroHash,
        auditor: ethers.ZeroAddress,
        requiresProof: false,
        proofVerified: false
      };
      await commission.setSplitConfig(orderId, splitConfig);

      // 执行支付 - 应该通过 Commission 分账
      await expect(
        autoPay.connect(agent).executeAutoPayment(
          orderId,
          user.address,
          recipient.address,
          amount
        )
      ).to.emit(autoPay, "AutoPaymentExecuted");
    });
  });
});

