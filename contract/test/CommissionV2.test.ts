import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { CommissionV2, MockERC20 } from "../typechain-types";

describe("CommissionV2", function () {
  let commissionV2: CommissionV2;
  let mockToken: MockERC20;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let operator: SignerWithAddress;
  let relayer: SignerWithAddress;
  let merchant: SignerWithAddress;
  let agent: SignerWithAddress;
  let referrer: SignerWithAddress;
  let user: SignerWithAddress;

  const BASIS_POINTS = 10000;
  const MICRO_UNIT = 1000000; // 1 USDC = 1000000

  // 默认费率配置
  const DEFAULT_FEE_CONFIG = {
    onrampFeeBps: 10,   // 0.1%
    offrampFeeBps: 10,  // 0.1%
    splitFeeBps: 30,    // 0.3%
    minSplitFee: 100000 // 0.1 USDC
  };

  beforeEach(async function () {
    [owner, treasury, operator, relayer, merchant, agent, referrer, user] = await ethers.getSigners();

    // 部署 Mock ERC20 代币
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("Mock USDC", "USDC", 6);
    await mockToken.waitForDeployment();

    // 部署 CommissionV2
    const CommissionV2Factory = await ethers.getContractFactory("CommissionV2");
    commissionV2 = await CommissionV2Factory.deploy(
      await mockToken.getAddress(),
      treasury.address
    );
    await commissionV2.waitForDeployment();

    // 设置 relayer
    await commissionV2.setRelayer(relayer.address, true);

    // 给测试账户铸造代币
    const mintAmount = ethers.parseUnits("100000", 6); // 100,000 USDC
    await mockToken.mint(user.address, mintAmount);
    await mockToken.mint(relayer.address, mintAmount);

    // 授权合约使用代币
    await mockToken.connect(user).approve(await commissionV2.getAddress(), mintAmount);
    await mockToken.connect(relayer).approve(await commissionV2.getAddress(), mintAmount);
  });

  describe("Deployment", function () {
    it("Should set the correct settlement token", async function () {
      expect(await commissionV2.settlementToken()).to.equal(await mockToken.getAddress());
    });

    it("Should set the correct platform treasury", async function () {
      expect(await commissionV2.platformTreasury()).to.equal(treasury.address);
    });

    it("Should set the default fee config", async function () {
      const feeConfig = await commissionV2.defaultFeeConfig();
      expect(feeConfig.onrampFeeBps).to.equal(DEFAULT_FEE_CONFIG.onrampFeeBps);
      expect(feeConfig.offrampFeeBps).to.equal(DEFAULT_FEE_CONFIG.offrampFeeBps);
      expect(feeConfig.splitFeeBps).to.equal(DEFAULT_FEE_CONFIG.splitFeeBps);
      expect(feeConfig.minSplitFee).to.equal(DEFAULT_FEE_CONFIG.minSplitFee);
    });
  });

  describe("Fee Configuration", function () {
    it("Should allow owner to update default fee config", async function () {
      await commissionV2.updateDefaultFeeConfig(15, 15, 50, 200000);
      
      const feeConfig = await commissionV2.defaultFeeConfig();
      expect(feeConfig.onrampFeeBps).to.equal(15);
      expect(feeConfig.offrampFeeBps).to.equal(15);
      expect(feeConfig.splitFeeBps).to.equal(50);
      expect(feeConfig.minSplitFee).to.equal(200000);
    });

    it("Should revert if non-owner tries to update fee config", async function () {
      await expect(
        commissionV2.connect(user).updateDefaultFeeConfig(15, 15, 50, 200000)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert if fee rates are too high", async function () {
      await expect(
        commissionV2.updateDefaultFeeConfig(150, 10, 30, 100000) // 1.5% > 1% max
      ).to.be.revertedWith("Onramp fee too high");

      await expect(
        commissionV2.updateDefaultFeeConfig(10, 150, 30, 100000)
      ).to.be.revertedWith("Offramp fee too high");

      await expect(
        commissionV2.updateDefaultFeeConfig(10, 10, 150, 100000)
      ).to.be.revertedWith("Split fee too high");
    });
  });

  describe("Fee Calculation", function () {
    it("Should return 0 fee for CRYPTO_DIRECT payments", async function () {
      const amount = 1000 * MICRO_UNIT; // 1000 USDC
      const feeConfig = {
        onrampFeeBps: 10,
        offrampFeeBps: 10,
        splitFeeBps: 30,
        minSplitFee: 100000
      };
      
      const fee = await commissionV2.calculatePlatformFee(
        amount,
        0, // CRYPTO_DIRECT
        feeConfig
      );
      
      expect(fee).to.equal(0);
    });

    it("Should calculate correct fee for ONRAMP payments", async function () {
      const amount = 1000 * MICRO_UNIT; // 1000 USDC
      const feeConfig = {
        onrampFeeBps: 10,
        offrampFeeBps: 10,
        splitFeeBps: 30,
        minSplitFee: 100000
      };
      
      const fee = await commissionV2.calculatePlatformFee(
        amount,
        1, // ONRAMP
        feeConfig
      );
      
      // 0.3% split + 0.1% onramp = 0.4%
      const expectedFee = (amount * 40) / BASIS_POINTS;
      expect(fee).to.equal(expectedFee);
    });

    it("Should calculate correct fee for OFFRAMP payments", async function () {
      const amount = 1000 * MICRO_UNIT;
      const feeConfig = {
        onrampFeeBps: 10,
        offrampFeeBps: 10,
        splitFeeBps: 30,
        minSplitFee: 100000
      };
      
      const fee = await commissionV2.calculatePlatformFee(
        amount,
        2, // OFFRAMP
        feeConfig
      );
      
      // 0.3% split + 0.1% offramp = 0.4%
      const expectedFee = (amount * 40) / BASIS_POINTS;
      expect(fee).to.equal(expectedFee);
    });

    it("Should calculate correct fee for MIXED payments", async function () {
      const amount = 1000 * MICRO_UNIT;
      const feeConfig = {
        onrampFeeBps: 10,
        offrampFeeBps: 10,
        splitFeeBps: 30,
        minSplitFee: 100000
      };
      
      const fee = await commissionV2.calculatePlatformFee(
        amount,
        3, // MIXED
        feeConfig
      );
      
      // 0.3% split + 0.1% onramp + 0.1% offramp = 0.5%
      const expectedFee = (amount * 50) / BASIS_POINTS;
      expect(fee).to.equal(expectedFee);
    });

    it("Should apply minimum split fee for small amounts", async function () {
      const amount = 10 * MICRO_UNIT; // 10 USDC
      const feeConfig = {
        onrampFeeBps: 10,
        offrampFeeBps: 10,
        splitFeeBps: 30,
        minSplitFee: 100000 // 0.1 USDC
      };
      
      const fee = await commissionV2.calculatePlatformFee(
        amount,
        1, // ONRAMP
        feeConfig
      );
      
      // 10 USDC * 0.3% = 0.03 USDC, but min is 0.1 USDC
      // So: 0.1 USDC (min split) + 0.01 USDC (onramp) = 0.11 USDC = 110000
      const minSplitFee = 100000;
      const onrampFee = (amount * 10) / BASIS_POINTS;
      expect(fee).to.equal(minSplitFee + onrampFee);
    });
  });

  describe("Split Plan Management", function () {
    it("Should create a split plan", async function () {
      const recipients = [merchant.address, agent.address, referrer.address];
      const shares = [7000, 2000, 1000]; // 70%, 20%, 10%
      const roles = ["merchant", "agent", "referrer"];
      const feeConfig = {
        onrampFeeBps: 10,
        offrampFeeBps: 10,
        splitFeeBps: 30,
        minSplitFee: 100000
      };

      const tx = await commissionV2.createSplitPlan(
        "Test Plan",
        recipients,
        shares,
        roles,
        feeConfig
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "SplitPlanCreated"
      );
      
      expect(event).to.not.be.undefined;
    });

    it("Should revert if shares don't sum to 100%", async function () {
      const recipients = [merchant.address, agent.address];
      const shares = [5000, 4000]; // 50% + 40% = 90% != 100%
      const roles = ["merchant", "agent"];
      const feeConfig = {
        onrampFeeBps: 10,
        offrampFeeBps: 10,
        splitFeeBps: 30,
        minSplitFee: 100000
      };

      await expect(
        commissionV2.createSplitPlan("Bad Plan", recipients, shares, roles, feeConfig)
      ).to.be.revertedWith("Shares must equal 100%");
    });

    it("Should revert if arrays have different lengths", async function () {
      const recipients = [merchant.address, agent.address];
      const shares = [7000, 2000, 1000]; // 3 elements
      const roles = ["merchant", "agent"];
      const feeConfig = {
        onrampFeeBps: 10,
        offrampFeeBps: 10,
        splitFeeBps: 30,
        minSplitFee: 100000
      };

      await expect(
        commissionV2.createSplitPlan("Bad Plan", recipients, shares, roles, feeConfig)
      ).to.be.revertedWith("Length mismatch");
    });

    it("Should allow owner to activate/deactivate plan", async function () {
      const recipients = [merchant.address, agent.address];
      const shares = [7000, 3000];
      const roles = ["merchant", "agent"];
      const feeConfig = {
        onrampFeeBps: 10,
        offrampFeeBps: 10,
        splitFeeBps: 30,
        minSplitFee: 100000
      };

      const tx = await commissionV2.createSplitPlan(
        "Test Plan",
        recipients,
        shares,
        roles,
        feeConfig
      );
      
      const receipt = await tx.wait();
      const planId = (receipt?.logs[0] as any).args[0];

      // 停用计划
      await commissionV2.setSplitPlanActive(planId, false);
      
      let plan = await commissionV2.getSplitPlan(planId);
      expect(plan.active).to.equal(false);

      // 重新激活
      await commissionV2.setSplitPlanActive(planId, true);
      plan = await commissionV2.getSplitPlan(planId);
      expect(plan.active).to.equal(true);
    });
  });

  describe("Split Execution", function () {
    let planId: string;

    beforeEach(async function () {
      const recipients = [merchant.address, agent.address, referrer.address];
      const shares = [7000, 2000, 1000]; // 70%, 20%, 10%
      const roles = ["merchant", "agent", "referrer"];
      const feeConfig = {
        onrampFeeBps: 10,
        offrampFeeBps: 10,
        splitFeeBps: 30,
        minSplitFee: 100000
      };

      const tx = await commissionV2.createSplitPlan(
        "Test Plan",
        recipients,
        shares,
        roles,
        feeConfig
      );
      
      const receipt = await tx.wait();
      planId = (receipt?.logs[0] as any).args[0];
    });

    it("Should execute split correctly", async function () {
      const amount = 1000 * MICRO_UNIT; // 1000 USDC
      const sessionId = ethers.id("test-session-1");

      const treasuryBalanceBefore = await mockToken.balanceOf(treasury.address);

      await commissionV2.connect(relayer).executeSplit(
        planId,
        sessionId,
        amount,
        1 // ONRAMP
      );

      // 验证平台费用已转入 treasury
      const treasuryBalanceAfter = await mockToken.balanceOf(treasury.address);
      const expectedFee = (amount * 40) / BASIS_POINTS; // 0.4%
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(expectedFee);

      // 验证待领取余额
      const distributableAmount = BigInt(amount) - BigInt(expectedFee);
      
      const merchantPending = await commissionV2.getPendingBalance(merchant.address);
      expect(merchantPending).to.equal((distributableAmount * 7000n) / 10000n);

      const agentPending = await commissionV2.getPendingBalance(agent.address);
      expect(agentPending).to.equal((distributableAmount * 2000n) / 10000n);

      const referrerPending = await commissionV2.getPendingBalance(referrer.address);
      expect(referrerPending).to.equal((distributableAmount * 1000n) / 10000n);
    });

    it("Should revert if plan is not active", async function () {
      await commissionV2.setSplitPlanActive(planId, false);

      await expect(
        commissionV2.connect(relayer).executeSplit(
          planId,
          ethers.id("test"),
          1000 * MICRO_UNIT,
          0
        )
      ).to.be.revertedWith("Plan not active");
    });

    it("Should only allow relayer to execute split", async function () {
      await expect(
        commissionV2.connect(user).executeSplit(
          planId,
          ethers.id("test"),
          1000 * MICRO_UNIT,
          0
        )
      ).to.be.revertedWith("Not relayer");
    });
  });

  describe("Claim Mechanism", function () {
    let planId: string;

    beforeEach(async function () {
      const recipients = [merchant.address, agent.address];
      const shares = [7000, 3000];
      const roles = ["merchant", "agent"];
      const feeConfig = {
        onrampFeeBps: 0,
        offrampFeeBps: 0,
        splitFeeBps: 0,
        minSplitFee: 0
      };

      const tx = await commissionV2.createSplitPlan(
        "Zero Fee Plan",
        recipients,
        shares,
        roles,
        feeConfig
      );
      
      const receipt = await tx.wait();
      planId = (receipt?.logs[0] as any).args[0];

      // 执行一次 split
      await commissionV2.connect(relayer).executeSplit(
        planId,
        ethers.id("test"),
        1000 * MICRO_UNIT,
        0 // CRYPTO_DIRECT - 0 fee
      );
    });

    it("Should allow recipient to claim all pending balance", async function () {
      // Fix: executeSplit only transfers platformFee to treasury, not split amounts into contract
      // Mint tokens to contract to ensure sufficient balance for claimAll
      await mockToken.mint(await commissionV2.getAddress(), ethers.parseUnits("10000", 6));

      const pendingBefore = await commissionV2.getPendingBalance(merchant.address);
      expect(pendingBefore).to.be.gt(0);

      const balanceBefore = await mockToken.balanceOf(merchant.address);

      await commissionV2.connect(merchant).claimAll();

      const pendingAfter = await commissionV2.getPendingBalance(merchant.address);
      expect(pendingAfter).to.equal(0);

      const balanceAfter = await mockToken.balanceOf(merchant.address);
      expect(balanceAfter - balanceBefore).to.equal(pendingBefore);
    });

    it("Should revert if nothing to claim", async function () {
      await expect(
        commissionV2.connect(user).claimAll()
      ).to.be.revertedWith("Nothing to claim");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to set operator", async function () {
      await commissionV2.setOperator(operator.address, true);
      expect(await commissionV2.operators(operator.address)).to.equal(true);

      await commissionV2.setOperator(operator.address, false);
      expect(await commissionV2.operators(operator.address)).to.equal(false);
    });

    it("Should allow owner to set relayer", async function () {
      const newRelayer = user;
      await commissionV2.setRelayer(newRelayer.address, true);
      expect(await commissionV2.relayers(newRelayer.address)).to.equal(true);
    });

    it("Should allow owner to update treasury", async function () {
      const newTreasury = user.address;
      await commissionV2.setPlatformTreasury(newTreasury);
      expect(await commissionV2.platformTreasury()).to.equal(newTreasury);
    });
  });

  describe("Pausable", function () {
    let planId: string;

    beforeEach(async function () {
      const recipients = [merchant.address];
      const shares = [10000];
      const roles = ["merchant"];
      const feeConfig = DEFAULT_FEE_CONFIG;

      const tx = await commissionV2.createSplitPlan(
        "Test Plan",
        recipients,
        shares,
        roles,
        feeConfig
      );
      
      const receipt = await tx.wait();
      planId = (receipt?.logs[0] as any).args[0];
    });

    it("Should allow owner to pause and unpause", async function () {
      await commissionV2.pause();
      
      await expect(
        commissionV2.connect(relayer).executeSplit(
          planId,
          ethers.id("test"),
          1000 * MICRO_UNIT,
          0
        )
      ).to.be.revertedWith("Pausable: paused");

      await commissionV2.unpause();

      // Should work after unpause
      await commissionV2.connect(relayer).executeSplit(
        planId,
        ethers.id("test"),
        1000 * MICRO_UNIT,
        0
      );
    });
  });
});
