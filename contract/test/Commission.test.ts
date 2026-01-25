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
      expect(await commission.paymindTreasury()).to.equal(treasuryAddress);
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
    // 使用独立的 signer，避免与 owner 冲突
    let merchantMPCWallet: HardhatEthersSigner;
    let user: HardhatEthersSigner;

    beforeEach(async function () {
      const signers = await ethers.getSigners();
      // 使用数组后面的 signer，避免与 owner/payee/merchant/executor/referrer/treasury/rebatePool 冲突
      merchantMPCWallet = signers[10];
      user = signers[11];
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
        offRampFee: 0, // off-ramp fee (默认0)
        executorHasWallet: true,
        settlementTime: 0, // 即时结算
        isDisputed: false,
        sessionId: sessionId,
        // Audit Proof 扩展字段
        proofHash: ethers.ZeroHash,
        auditor: ethers.ZeroAddress,
        requiresProof: false,
        proofVerified: false,
      };

      await expect(commission.setSplitConfig(orderId, splitConfig))
        .to.emit(commission, "SplitConfigSet");

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
        offRampFee: 0,
        executorHasWallet: true,
        settlementTime: 0,
        isDisputed: false,
        sessionId: sessionId,
        // Audit Proof 扩展字段
        proofHash: ethers.ZeroHash,
        auditor: ethers.ZeroAddress,
        requiresProof: false,
        proofVerified: false,
      };

      await commission.setSplitConfig(orderId, splitConfig);

      // 记录分账前的余额
      const merchantBalanceBefore = await settlementToken.balanceOf(merchantMPCWallet.address);
      const referrerBalanceBefore = await settlementToken.balanceOf(referrer.address);
      const executorBalanceBefore = await settlementToken.balanceOf(executor.address);
      const treasuryBalanceBefore = await settlementToken.balanceOf(treasury.address);

      // 用户授权 USDC
      const totalAmount = ethers.parseEther("130"); // 100 + 5 + 10 + 15
      await settlementToken.transfer(user.address, totalAmount);
      await settlementToken.connect(user).approve(await commission.getAddress(), totalAmount);

      // 执行 QuickPay 分账
      await expect(commission.connect(user).quickPaySplit(orderId, totalAmount))
        .to.emit(commission, "PaymentReceived")
        .to.emit(commission, "PaymentAutoSplit");

      // 验证分账结果（使用余额差值）
      expect(await settlementToken.balanceOf(merchantMPCWallet.address)).to.equal(
        merchantBalanceBefore + ethers.parseEther("100"),
      );
      expect(await settlementToken.balanceOf(referrer.address)).to.equal(
        referrerBalanceBefore + ethers.parseEther("5"),
      );
      expect(await settlementToken.balanceOf(executor.address)).to.equal(
        executorBalanceBefore + ethers.parseEther("10"),
      );
      expect(await settlementToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore + ethers.parseEther("15"),
      );
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
        offRampFee: 0,
        executorHasWallet: true,
        settlementTime: 0,
        isDisputed: false,
        sessionId: sessionId,
        // Audit Proof 扩展字段
        proofHash: ethers.ZeroHash,
        auditor: ethers.ZeroAddress,
        requiresProof: false,
        proofVerified: false,
      };

      await commission.setSplitConfig(orderId, splitConfig);

      // 记录分账前的余额
      const merchantBalanceBefore = await settlementToken.balanceOf(merchantMPCWallet.address);

      // 用户授权 USDC
      const totalAmount = ethers.parseEther("130");
      await settlementToken.transfer(user.address, totalAmount);
      await settlementToken.connect(user).approve(await commission.getAddress(), totalAmount);

      // 执行钱包转账分账
      await expect(commission.connect(user).walletSplit(orderId, totalAmount))
        .to.emit(commission, "PaymentReceived")
        .to.emit(commission, "PaymentAutoSplit");

      // 验证分账结果（使用余额差值）
      expect(await settlementToken.balanceOf(merchantMPCWallet.address)).to.equal(
        merchantBalanceBefore + ethers.parseEther("100"),
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
        offRampFee: 0,
        executorHasWallet: true,
        settlementTime: 0,
        isDisputed: true, // 有争议
        sessionId: sessionId,
        // Audit Proof 扩展字段
        proofHash: ethers.ZeroHash,
        auditor: ethers.ZeroAddress,
        requiresProof: false,
        proofVerified: false,
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
      expect(order.status).to.equal(4); // Status.SETTLED
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

      // setOrderDispute 会将订单状态设为 FROZEN，所以会触发 "Order not ready" 错误
      // 这是预期行为，因为 FROZEN 状态不等于 DELIVERED
      await expect(commission.distributeCommission(orderId)).to.be.revertedWith(
        "Order not ready"
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
      // 只验证事件发出，不验证具体参数（因为 settlementId 是动态生成的）
      await expect(
        commission.createSettlement(
          payee.address,
          0, // AGENT
          await settlementToken.getAddress()
        )
      ).to.emit(commission, "SettlementCreated");
    });
  });

  // ============ V5.0 测试 ============
  
  describe("V5.0: 费率配置", function () {
    it("应该成功初始化 V5 费率", async function () {
      await commission.initializeV5Rates();
      
      // 验证扫描商品费率
      expect(await commission.scannedFeeRates(3)).to.equal(100); // SCANNED_UCP = 1%
      expect(await commission.scannedFeeRates(4)).to.equal(100); // SCANNED_X402 = 1%
      expect(await commission.scannedFeeRates(5)).to.equal(30);  // SCANNED_FT = 0.3%
      expect(await commission.scannedFeeRates(6)).to.equal(30);  // SCANNED_NFT = 0.3%
      
      // 验证 Skill 层级费率
      expect(await commission.layerPlatformFees(0)).to.equal(50);  // INFRA = 0.5%
      expect(await commission.layerPlatformFees(1)).to.equal(50);  // RESOURCE = 0.5%
      expect(await commission.layerPlatformFees(2)).to.equal(100); // LOGIC = 1%
      expect(await commission.layerPlatformFees(3)).to.equal(300); // COMPOSITE = 3%
      
      expect(await commission.layerPoolRates(0)).to.equal(200);  // INFRA = 2%
      expect(await commission.layerPoolRates(1)).to.equal(250);  // RESOURCE = 2.5%
      expect(await commission.layerPoolRates(2)).to.equal(400);  // LOGIC = 4%
      expect(await commission.layerPoolRates(3)).to.equal(700);  // COMPOSITE = 7%
    });

    it("应该成功设置 X402 通道费率", async function () {
      await expect(commission.setX402ChannelFeeRate(30)) // 0.3%
        .to.emit(commission, "X402ChannelFeeRateUpdated")
        .withArgs(0, 30);
      
      expect(await commission.x402ChannelFeeRate()).to.equal(30);
    });

    it("应该拒绝过高的 X402 通道费率", async function () {
      await expect(commission.setX402ChannelFeeRate(400)) // 4%
        .to.be.revertedWith("Rate too high");
    });

    it("应该成功设置扫描商品费率", async function () {
      await commission.setScannedFeeRate(3, 150); // SCANNED_UCP = 1.5%
      expect(await commission.scannedFeeRates(3)).to.equal(150);
    });

    it("应该成功设置 Skill 层级费率", async function () {
      await commission.setLayerRates(3, 400, 800); // COMPOSITE = 4% + 8%
      expect(await commission.layerPlatformFees(3)).to.equal(400);
      expect(await commission.layerPoolRates(3)).to.equal(800);
    });
  });

  describe("V5.0: 计算分账金额", function () {
    beforeEach(async function () {
      await commission.initializeV5Rates();
    });

    it("应该正确计算 LOGIC 层级分账（双Agent）", async function () {
      const amount = ethers.parseEther("100");
      const result = await commission.calculateV5Split(
        amount,
        2, // LOGIC
        true, // hasReferrer
        true, // hasExecutor
        true  // executorHasWallet
      );
      
      // LOGIC: 1% 平台费 + 4% 激励池
      // 商户: 100 - 1 - 4 = 95
      // 平台费: 1
      // 执行Agent: 4 * 0.7 = 2.8
      // 推荐Agent: 4 * 0.3 = 1.2
      expect(result.merchantAmount).to.equal(ethers.parseEther("95"));
      expect(result.platformFee).to.equal(ethers.parseEther("1"));
      expect(result.executorFee).to.equal(ethers.parseEther("2.8"));
      expect(result.referrerFee).to.equal(ethers.parseEther("1.2"));
      expect(result.treasuryFee).to.equal(0);
    });

    it("应该正确计算 COMPOSITE 层级分账（仅执行Agent）", async function () {
      const amount = ethers.parseEther("100");
      const result = await commission.calculateV5Split(
        amount,
        3, // COMPOSITE
        false, // hasReferrer
        true,  // hasExecutor
        true   // executorHasWallet
      );
      
      // COMPOSITE: 3% 平台费 + 7% 激励池
      // 商户: 100 - 3 - 7 = 90
      // 平台费: 3
      // 执行Agent: 7 * 0.7 = 4.9
      // Treasury: 7 * 0.3 = 2.1 (推荐缺席)
      expect(result.merchantAmount).to.equal(ethers.parseEther("90"));
      expect(result.platformFee).to.equal(ethers.parseEther("3"));
      expect(result.executorFee).to.equal(ethers.parseEther("4.9"));
      expect(result.referrerFee).to.equal(0);
      expect(result.treasuryFee).to.equal(ethers.parseEther("2.1"));
    });

    it("应该正确计算无Agent场景", async function () {
      const amount = ethers.parseEther("100");
      const result = await commission.calculateV5Split(
        amount,
        1, // RESOURCE
        false, // hasReferrer
        false, // hasExecutor
        false  // executorHasWallet
      );
      
      // RESOURCE: 0.5% 平台费 + 2.5% 激励池
      // 商户: 100 - 0.5 - 2.5 = 97
      // 平台费: 0.5
      // Treasury: 2.5 (全部进Treasury)
      expect(result.merchantAmount).to.equal(ethers.parseEther("97"));
      expect(result.platformFee).to.equal(ethers.parseEther("0.5"));
      expect(result.executorFee).to.equal(0);
      expect(result.referrerFee).to.equal(0);
      expect(result.treasuryFee).to.equal(ethers.parseEther("2.5"));
    });

    it("应该正确处理执行Agent无钱包场景", async function () {
      const amount = ethers.parseEther("100");
      const result = await commission.calculateV5Split(
        amount,
        2, // LOGIC
        true,  // hasReferrer
        true,  // hasExecutor
        false  // executorHasWallet = false
      );
      
      // 执行Agent份额进Treasury
      expect(result.executorFee).to.equal(0);
      expect(result.referrerFee).to.equal(ethers.parseEther("1.2"));
      expect(result.treasuryFee).to.equal(ethers.parseEther("2.8")); // 执行Agent份额
    });
  });

  describe("V5.0: 扫描商品分账", function () {
    let orderId: string;
    let merchantMPCWallet: HardhatEthersSigner;
    let user: HardhatEthersSigner;

    beforeEach(async function () {
      const signers = await ethers.getSigners();
      merchantMPCWallet = signers[10];
      user = signers[11];
      orderId = ethers.id("test-scanned-order-1");
      
      await commission.initializeV5Rates();
      
      // 设置分账配置
      const splitConfig = {
        merchantMPCWallet: merchantMPCWallet.address,
        merchantAmount: 0,
        referrer: ethers.ZeroAddress,
        referralFee: 0,
        executor: ethers.ZeroAddress,
        executionFee: 0,
        platformFee: 0,
        offRampFee: 0,
        executorHasWallet: false,
        settlementTime: 0,
        isDisputed: false,
        sessionId: ethers.ZeroHash,
        proofHash: ethers.ZeroHash,
        auditor: ethers.ZeroAddress,
        requiresProof: false,
        proofVerified: false,
      };
      await commission.setSplitConfig(orderId, splitConfig);
    });

    it("应该成功执行 UCP 扫描商品分账", async function () {
      const originalAmount = ethers.parseEther("100");
      // UCP 扫描费率 1%，用户额外支付 1
      const userExtraFee = ethers.parseEther("1");
      const totalAmount = originalAmount + userExtraFee;
      
      await settlementToken.transfer(user.address, totalAmount);
      await settlementToken.connect(user).approve(await commission.getAddress(), totalAmount);
      
      const merchantBalanceBefore = await settlementToken.balanceOf(merchantMPCWallet.address);
      const treasuryBalanceBefore = await settlementToken.balanceOf(treasury.address);
      
      await expect(
        commission.connect(user).scannedProductSplit(
          orderId,
          originalAmount,
          3, // SCANNED_UCP
          ethers.ZeroAddress // 无推荐Agent
        )
      ).to.emit(commission, "ScannedProductPayment");
      
      // 商户收到原始金额
      expect(await settlementToken.balanceOf(merchantMPCWallet.address)).to.equal(
        merchantBalanceBefore + originalAmount
      );
      // 平台收到用户额外费用
      expect(await settlementToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore + userExtraFee
      );
    });

    it("应该成功执行带推荐Agent的扫描商品分账", async function () {
      const originalAmount = ethers.parseEther("100");
      const userExtraFee = ethers.parseEther("1"); // 1%
      const totalAmount = originalAmount + userExtraFee;
      
      await settlementToken.transfer(user.address, totalAmount);
      await settlementToken.connect(user).approve(await commission.getAddress(), totalAmount);
      
      const referrerBalanceBefore = await settlementToken.balanceOf(referrer.address);
      const treasuryBalanceBefore = await settlementToken.balanceOf(treasury.address);
      
      await commission.connect(user).scannedProductSplit(
        orderId,
        originalAmount,
        3, // SCANNED_UCP
        referrer.address // 有推荐Agent
      );
      
      // 推荐Agent获得平台费用的20%: 1 * 0.2 = 0.2
      expect(await settlementToken.balanceOf(referrer.address)).to.equal(
        referrerBalanceBefore + ethers.parseEther("0.2")
      );
      // 平台收到剩余: 1 - 0.2 = 0.8
      expect(await settlementToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore + ethers.parseEther("0.8")
      );
    });

    it("应该成功执行 NFT 扫描商品分账（0.3%费率）", async function () {
      const originalAmount = ethers.parseEther("100");
      // NFT 扫描费率 0.3%
      const userExtraFee = ethers.parseEther("0.3");
      const totalAmount = originalAmount + userExtraFee;
      
      await settlementToken.transfer(user.address, totalAmount);
      await settlementToken.connect(user).approve(await commission.getAddress(), totalAmount);
      
      const merchantBalanceBefore = await settlementToken.balanceOf(merchantMPCWallet.address);
      
      await commission.connect(user).scannedProductSplit(
        orderId,
        originalAmount,
        6, // SCANNED_NFT
        ethers.ZeroAddress
      );
      
      // 商户收到原始金额
      expect(await settlementToken.balanceOf(merchantMPCWallet.address)).to.equal(
        merchantBalanceBefore + originalAmount
      );
    });

    it("应该拒绝非扫描来源", async function () {
      const originalAmount = ethers.parseEther("100");
      const totalAmount = originalAmount + ethers.parseEther("1");
      
      await settlementToken.transfer(user.address, totalAmount);
      await settlementToken.connect(user).approve(await commission.getAddress(), totalAmount);
      
      await expect(
        commission.connect(user).scannedProductSplit(
          orderId,
          originalAmount,
          0, // NATIVE (非扫描来源)
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Not scanned source");
    });
  });

  describe("V5.0: AutoPay 分账", function () {
    let orderId: string;
    let merchantMPCWallet: HardhatEthersSigner;
    let user: HardhatEthersSigner;
    let relayer: HardhatEthersSigner;

    beforeEach(async function () {
      const signers = await ethers.getSigners();
      merchantMPCWallet = signers[10];
      user = signers[11];
      relayer = signers[12];
      orderId = ethers.id("test-autopay-order-1");
      
      // 设置 relayer
      await commission.setRelayer(relayer.address, true);
      
      // 设置分账配置
      const splitConfig = {
        merchantMPCWallet: merchantMPCWallet.address,
        merchantAmount: ethers.parseEther("95"),
        referrer: referrer.address,
        referralFee: ethers.parseEther("1.2"),
        executor: executor.address,
        executionFee: ethers.parseEther("2.8"),
        platformFee: ethers.parseEther("1"),
        offRampFee: 0,
        executorHasWallet: true,
        settlementTime: 0,
        isDisputed: false,
        sessionId: ethers.ZeroHash,
        proofHash: ethers.ZeroHash,
        auditor: ethers.ZeroAddress,
        requiresProof: false,
        proofVerified: false,
      };
      await commission.setSplitConfig(orderId, splitConfig);
    });

    it("应该成功执行 AutoPay 分账", async function () {
      const amount = ethers.parseEther("100");
      
      await settlementToken.transfer(user.address, amount);
      await settlementToken.connect(user).approve(await commission.getAddress(), amount);
      
      const merchantBalanceBefore = await settlementToken.balanceOf(merchantMPCWallet.address);
      const executorBalanceBefore = await settlementToken.balanceOf(executor.address);
      const referrerBalanceBefore = await settlementToken.balanceOf(referrer.address);
      
      await expect(
        commission.connect(relayer).autoPaySplit(orderId, amount, user.address)
      )
        .to.emit(commission, "PaymentReceived")
        .to.emit(commission, "PaymentAutoSplit");
      
      // 验证分账结果
      expect(await settlementToken.balanceOf(merchantMPCWallet.address)).to.equal(
        merchantBalanceBefore + ethers.parseEther("95")
      );
      expect(await settlementToken.balanceOf(executor.address)).to.equal(
        executorBalanceBefore + ethers.parseEther("2.8")
      );
      expect(await settlementToken.balanceOf(referrer.address)).to.equal(
        referrerBalanceBefore + ethers.parseEther("1.2")
      );
    });

    it("应该拒绝非 relayer 调用", async function () {
      const amount = ethers.parseEther("100");
      
      await settlementToken.transfer(user.address, amount);
      await settlementToken.connect(user).approve(await commission.getAddress(), amount);
      
      await expect(
        commission.connect(user).autoPaySplit(orderId, amount, user.address)
      ).to.be.revertedWith("Not relayer");
    });
  });
});
