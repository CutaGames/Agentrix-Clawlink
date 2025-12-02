import { expect } from "chai";
import { ethers } from "hardhat";
import { Commission } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Commission", function () {
  let commission: Commission;
  let owner: HardhatEthersSigner;
  let payee: HardhatEthersSigner;
  let merchant: HardhatEthersSigner;
  let executor: HardhatEthersSigner;
  let referrer: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let rebatePool: HardhatEthersSigner;
  let settlementToken: any; // Mock ERC20 token

  beforeEach(async function () {
    [owner, payee, merchant, executor, referrer, treasury, rebatePool] = await ethers.getSigners();

    // 部署一个简单的 ERC20 代币用于测试
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    settlementToken = await MockERC20.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    await settlementToken.waitForDeployment();

    // 部署 Commission 合约
    const CommissionFactory = await ethers.getContractFactory("Commission");
    commission = await CommissionFactory.deploy();
    await commission.waitForDeployment();

    // 配置结算代币和金库
    await commission.configureSettlementToken(
      await settlementToken.getAddress(),
      treasury.address,
      rebatePool.address
    );

    // 向合约转入代币用于测试
    await settlementToken.transfer(await commission.getAddress(), ethers.parseEther("10000"));
  });

  describe("配置", function () {
    it("应该成功配置结算代币和金库", async function () {
      const tokenAddress = await settlementToken.getAddress();
      const treasuryAddress = treasury.address;
      const rebateAddress = rebatePool.address;

      expect(await commission.settlementToken()).to.equal(tokenAddress);
      expect(await commission.agentrixTreasury()).to.equal(treasuryAddress);
      expect(await commission.systemRebatePool()).to.equal(rebateAddress);
    });

    it("应该拒绝无效地址", async function () {
      await expect(
        commission.configureSettlementToken(
          ethers.ZeroAddress,
          treasury.address,
          rebatePool.address
        )
      ).to.be.revertedWith("Invalid addresses");
    });
  });

  describe("新分账功能", function () {
    let orderId: string;
    let merchantMPCWallet: HardhatEthersSigner;
    let user: HardhatEthersSigner;

    beforeEach(async function () {
      [merchantMPCWallet, user] = await ethers.getSigners();
      orderId = ethers.id("test-order-split-1");
    });

    it("应该成功设置分账配置", async function () {
      const sessionId = ethers.id("test-session-1");
      const splitConfig = {
        merchantMPCWallet: merchantMPCWallet.address,
        merchantAmount: ethers.parseEther("100"),
        referrer: referrer.address,
        referralFee: ethers.parseEther("5"),
        executor: executor.address,
        executionFee: ethers.parseEther("10"),
        platformFee: ethers.parseEther("15"),
        executorHasWallet: true,
        settlementTime: 0, // 即时结算
        isDisputed: false,
        sessionId: sessionId,
      };

      await expect(commission.setSplitConfig(orderId, splitConfig))
        .to.emit(commission, "SplitConfigSet")
        .withArgs(orderId, [
          merchantMPCWallet.address,
          ethers.parseEther("100"),
          referrer.address,
          ethers.parseEther("5"),
          executor.address,
          ethers.parseEther("10"),
          ethers.parseEther("15"),
          true,
          0,
          false,
          sessionId,
        ]);

      const config = await commission.getSplitConfig(orderId);
      expect(config.merchantMPCWallet).to.equal(merchantMPCWallet.address);
      expect(config.merchantAmount).to.equal(ethers.parseEther("100"));
    });

    it("应该成功执行 QuickPay 分账", async function () {
      const sessionId = ethers.id("test-session-2");
      const splitConfig = {
        merchantMPCWallet: merchantMPCWallet.address,
        merchantAmount: ethers.parseEther("100"),
        referrer: referrer.address,
        referralFee: ethers.parseEther("5"),
        executor: executor.address,
        executionFee: ethers.parseEther("10"),
        platformFee: ethers.parseEther("15"),
        executorHasWallet: true,
        settlementTime: 0,
        isDisputed: false,
        sessionId: sessionId,
      };

      await commission.setSplitConfig(orderId, splitConfig);

      // 用户授权 USDC
      const totalAmount = ethers.parseEther("130"); // 100 + 5 + 10 + 15
      await settlementToken.transfer(user.address, totalAmount);
      await settlementToken.connect(user).approve(await commission.getAddress(), totalAmount);

      // 执行 QuickPay 分账
      await expect(commission.connect(user).quickPaySplit(orderId, totalAmount))
        .to.emit(commission, "PaymentReceived")
        .to.emit(commission, "PaymentAutoSplit");

      // 验证分账结果
      expect(await settlementToken.balanceOf(merchantMPCWallet.address)).to.equal(
        ethers.parseEther("100"),
      );
      expect(await settlementToken.balanceOf(referrer.address)).to.equal(ethers.parseEther("5"));
      expect(await settlementToken.balanceOf(executor.address)).to.equal(ethers.parseEther("10"));
      expect(await settlementToken.balanceOf(treasury.address)).to.equal(ethers.parseEther("15"));
    });

    it("应该成功执行钱包转账分账", async function () {
      const sessionId = ethers.id("test-session-3");
      const splitConfig = {
        merchantMPCWallet: merchantMPCWallet.address,
        merchantAmount: ethers.parseEther("100"),
        referrer: referrer.address,
        referralFee: ethers.parseEther("5"),
        executor: executor.address,
        executionFee: ethers.parseEther("10"),
        platformFee: ethers.parseEther("15"),
        executorHasWallet: true,
        settlementTime: 0,
        isDisputed: false,
        sessionId: sessionId,
      };

      await commission.setSplitConfig(orderId, splitConfig);

      // 用户授权 USDC
      const totalAmount = ethers.parseEther("130");
      await settlementToken.transfer(user.address, totalAmount);
      await settlementToken.connect(user).approve(await commission.getAddress(), totalAmount);

      // 执行钱包转账分账
      await expect(commission.connect(user).walletSplit(orderId, totalAmount))
        .to.emit(commission, "PaymentReceived")
        .to.emit(commission, "PaymentAutoSplit");

      // 验证分账结果
      expect(await settlementToken.balanceOf(merchantMPCWallet.address)).to.equal(
        ethers.parseEther("100"),
      );
    });

    it("应该拒绝未设置分账配置的订单", async function () {
      const totalAmount = ethers.parseEther("130");
      await settlementToken.transfer(user.address, totalAmount);
      await settlementToken.connect(user).approve(await commission.getAddress(), totalAmount);

      await expect(
        commission.connect(user).quickPaySplit(orderId, totalAmount),
      ).to.be.revertedWith("Order config not found");
    });

    it("应该拒绝有争议的订单", async function () {
      const sessionId = ethers.id("test-session-4");
      const splitConfig = {
        merchantMPCWallet: merchantMPCWallet.address,
        merchantAmount: ethers.parseEther("100"),
        referrer: referrer.address,
        referralFee: ethers.parseEther("5"),
        executor: executor.address,
        executionFee: ethers.parseEther("10"),
        platformFee: ethers.parseEther("15"),
        executorHasWallet: true,
        settlementTime: 0,
        isDisputed: true, // 有争议
        sessionId: sessionId,
      };

      await commission.setSplitConfig(orderId, splitConfig);

      const totalAmount = ethers.parseEther("130");
      await settlementToken.transfer(user.address, totalAmount);
      await settlementToken.connect(user).approve(await commission.getAddress(), totalAmount);

      await expect(
        commission.connect(user).quickPaySplit(orderId, totalAmount),
      ).to.be.revertedWith("Order is disputed");
    });
  });

  describe("同步订单", function () {
    it("应该成功同步订单", async function () {
      const orderId = ethers.id("test-order-1");
      const settlementTime = (await ethers.provider.getBlock("latest"))!.timestamp + 86400; // 1天后

      await expect(
        commission.syncOrder(
          orderId,
          merchant.address,
          referrer.address,
          executor.address,
          ethers.parseEther("100"), // merchantAmount
          ethers.parseEther("5"), // referralFee
          ethers.parseEther("10"), // executionFee
          ethers.parseEther("15"), // platformFee
          settlementTime,
          true, // executorHasWallet
          false, // isDisputed
          3 // Status.DELIVERED
        )
      )
        .to.emit(commission, "OrderSynced")
        .withArgs(orderId, 3, settlementTime);

      const order = await commission.orders(orderId);
      expect(order.orderId).to.equal(orderId);
      expect(order.merchant).to.equal(merchant.address);
      expect(order.status).to.equal(3); // DELIVERED
    });

    it("应该拒绝无效订单ID", async function () {
      await expect(
        commission.syncOrder(
          ethers.ZeroHash,
          merchant.address,
          referrer.address,
          executor.address,
          ethers.parseEther("100"),
          ethers.parseEther("5"),
          ethers.parseEther("10"),
          ethers.parseEther("15"),
          (await ethers.provider.getBlock("latest"))!.timestamp + 86400,
          true,
          false,
          3
        )
      ).to.be.revertedWith("Invalid order");
    });
  });

  describe("记录分润（新版本）", function () {
    it("应该成功记录分润", async function () {
      const amount = ethers.parseEther("1");
      const sessionId = ethers.id("test-session-1");

      await expect(
        commission.recordCommission(
          payee.address,
          0, // AGENT
          0, // EXECUTION
          amount,
          await settlementToken.getAddress(),
          ethers.parseEther("100"), // commissionBase
          ethers.parseEther("0.1"), // channelFee
          sessionId
        )
      )
        .to.emit(commission, "CommissionRecorded");

      const balance = await commission.pendingBalances(
        payee.address,
        await settlementToken.getAddress()
      );
      expect(balance).to.equal(amount);
    });
  });

  describe("分发佣金", function () {
    let orderId: string;
    const settlementTime = 0; // 立即可结算

    beforeEach(async function () {
      orderId = ethers.id("test-order-2");

      // 同步订单
      await commission.syncOrder(
        orderId,
        merchant.address,
        referrer.address,
        executor.address,
        ethers.parseEther("100"), // merchantAmount
        ethers.parseEther("5"), // referralFee
        ethers.parseEther("10"), // executionFee
        ethers.parseEther("15"), // platformFee
        settlementTime,
        true, // executorHasWallet
        false, // isDisputed
        3 // Status.DELIVERED
      );
    });

    it("应该成功分发佣金（执行者有钱包）", async function () {
      const merchantBalanceBefore = await settlementToken.balanceOf(merchant.address);
      const executorBalanceBefore = await settlementToken.balanceOf(executor.address);
      const treasuryBalanceBefore = await settlementToken.balanceOf(treasury.address);

      await expect(commission.distributeCommission(orderId))
        .to.emit(commission, "CommissionDistributed")
        .withArgs(orderId, ethers.parseEther("100"));

      // 检查余额变化
      expect(await settlementToken.balanceOf(merchant.address)).to.equal(
        merchantBalanceBefore + ethers.parseEther("100")
      );
      expect(await settlementToken.balanceOf(executor.address)).to.equal(
        executorBalanceBefore + ethers.parseEther("10")
      );
      expect(await settlementToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore + ethers.parseEther("15")
      );

      // 检查订单状态
      const order = await commission.orders(orderId);
      expect(order.status).to.equal(5); // SETTLED
    });

    it("应该将执行佣金转到返利池（执行者无钱包）", async function () {
      // 重新同步订单，executorHasWallet = false
      await commission.syncOrder(
        orderId,
        merchant.address,
        referrer.address,
        executor.address,
        ethers.parseEther("100"),
        ethers.parseEther("5"),
        ethers.parseEther("10"),
        ethers.parseEther("15"),
        settlementTime,
        false, // executorHasWallet = false
        false,
        3
      );

      const rebatePoolBalanceBefore = await settlementToken.balanceOf(rebatePool.address);

      await commission.distributeCommission(orderId);

      // 执行佣金应该转到返利池
      expect(await settlementToken.balanceOf(rebatePool.address)).to.equal(
        rebatePoolBalanceBefore + ethers.parseEther("10")
      );
    });

    it("应该拒绝未就绪的订单", async function () {
      // 创建 PENDING 状态的订单
      const pendingOrderId = ethers.id("test-order-pending");
      await commission.syncOrder(
        pendingOrderId,
        merchant.address,
        referrer.address,
        executor.address,
        ethers.parseEther("100"),
        ethers.parseEther("5"),
        ethers.parseEther("10"),
        ethers.parseEther("15"),
        settlementTime,
        true,
        false,
        0 // Status.PENDING
      );

      await expect(commission.distributeCommission(pendingOrderId)).to.be.revertedWith(
        "Order not ready"
      );
    });

    it("应该拒绝有争议的订单", async function () {
      await commission.setOrderDispute(orderId, true);

      await expect(commission.distributeCommission(orderId)).to.be.revertedWith(
        "Order is disputed"
      );
    });

    it("应该拒绝仍在锁定期内的订单", async function () {
      const futureOrderId = ethers.id("test-order-future");
      const futureSettlementTime = (await ethers.provider.getBlock("latest"))!.timestamp + 86400;

      await commission.syncOrder(
        futureOrderId,
        merchant.address,
        referrer.address,
        executor.address,
        ethers.parseEther("100"),
        ethers.parseEther("5"),
        ethers.parseEther("10"),
        ethers.parseEther("15"),
        futureSettlementTime,
        true,
        false,
        3
      );

      await expect(commission.distributeCommission(futureOrderId)).to.be.revertedWith(
        "Still in locking period"
      );
    });
  });

  describe("创建结算", function () {
    beforeEach(async function () {
      // 先记录一些分润
      await commission.recordCommission(
        payee.address,
        0, // AGENT
        0, // EXECUTION
        ethers.parseEther("5"),
        await settlementToken.getAddress(),
        ethers.parseEther("100"),
        ethers.parseEther("0.1"),
        ethers.id("test-session-2")
      );
    });

    it("应该成功创建结算", async function () {
      await expect(
        commission.createSettlement(
          payee.address,
          0, // AGENT
          await settlementToken.getAddress()
        )
      )
        .to.emit(commission, "SettlementCreated")
        .withArgs(
          ethers.anyValue,
          payee.address,
          0,
          ethers.parseEther("5"),
          await settlementToken.getAddress()
        );
    });
  });
});
