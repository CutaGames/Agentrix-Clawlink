import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BudgetPool, MockERC20 } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BudgetPool", function () {
  let budgetPool: BudgetPool;
  let mockToken: MockERC20;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let poolOwner: SignerWithAddress;
  let participant1: SignerWithAddress;
  let participant2: SignerWithAddress;
  let reviewer: SignerWithAddress;
  let funder: SignerWithAddress;

  const MICRO_UNIT = 1000000n; // 1 USDC = 1000000
  const PLATFORM_FEE_BPS = 50; // 0.5%
  const BASIS_POINTS = 10000n;

  // 默认 QualityGate 结构体
  const DEFAULT_QUALITY_GATE = {
    minQualityScore: 60,
    requiresApproval: true,
    autoReleaseDelay: 0,
  };

  const NO_QUALITY_GATE = {
    minQualityScore: 0,
    requiresApproval: false,
    autoReleaseDelay: 0,
  };

  beforeEach(async function () {
    [owner, treasury, poolOwner, participant1, participant2, reviewer, funder] = await ethers.getSigners();

    // 部署 Mock ERC20 代币
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("Mock USDC", "USDC", 6);
    await mockToken.waitForDeployment();

    // 部署 BudgetPool (3 个参数: token, treasury, platformFeeBps)
    const BudgetPoolFactory = await ethers.getContractFactory("BudgetPool");
    budgetPool = await BudgetPoolFactory.deploy(
      await mockToken.getAddress(),
      treasury.address,
      PLATFORM_FEE_BPS
    );
    await budgetPool.waitForDeployment();

    // 给测试账户铸造代币
    const mintAmount = ethers.parseUnits("100000", 6); // 100,000 USDC
    await mockToken.mint(funder.address, mintAmount);
    await mockToken.mint(poolOwner.address, mintAmount);

    // 授权合约使用代币
    await mockToken.connect(funder).approve(await budgetPool.getAddress(), mintAmount);
    await mockToken.connect(poolOwner).approve(await budgetPool.getAddress(), mintAmount);
  });

  // ============ Helper: 创建并充值预算池 ============
  async function createAndFundPool(
    budget: bigint,
    qualityGate = DEFAULT_QUALITY_GATE
  ): Promise<string> {
    const deadline = (await time.latest()) + 30 * 86400;
    const tx = await budgetPool.connect(poolOwner).createPool(
      "Test Pool",
      "Test Description",
      budget,
      deadline,
      qualityGate
    );
    const receipt = await tx.wait();
    // 从 PoolCreated 事件中获取 poolId
    const event = receipt?.logs.find(
      (log: any) => log.fragment?.name === "PoolCreated"
    );
    const poolId = (event as any).args[0];

    // 充值
    await budgetPool.connect(poolOwner).fundPool(poolId, budget);
    return poolId;
  }

  // ============ 1. Deployment Tests ============
  describe("Deployment", function () {
    it("Should set the correct settlement token", async function () {
      expect(await budgetPool.settlementToken()).to.equal(await mockToken.getAddress());
    });

    it("Should set the correct platform treasury", async function () {
      expect(await budgetPool.platformTreasury()).to.equal(treasury.address);
    });

    it("Should set the correct platform fee", async function () {
      expect(await budgetPool.platformFeeBps()).to.equal(PLATFORM_FEE_BPS);
    });
  });

  // ============ 2. Pool Creation Tests ============
  describe("Pool Creation", function () {
    it("Should create a budget pool", async function () {
      const budget = 10000n * MICRO_UNIT;
      const deadline = (await time.latest()) + 30 * 86400;

      const tx = await budgetPool.connect(poolOwner).createPool(
        "Marketing Campaign Q1",
        "Q1 marketing budget",
        budget,
        deadline,
        DEFAULT_QUALITY_GATE
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "PoolCreated"
      );
      expect(event).to.not.be.undefined;

      const poolId = (event as any).args[0];
      const pool = await budgetPool.getPool(poolId);
      expect(pool.owner).to.equal(poolOwner.address);
      expect(pool.name).to.equal("Marketing Campaign Q1");
      expect(pool.totalBudget).to.equal(budget);
      expect(pool.status).to.equal(0); // DRAFT
    });

    it("Should reject pool with zero budget", async function () {
      const deadline = (await time.latest()) + 86400;
      await expect(
        budgetPool.connect(poolOwner).createPool("Test", "Desc", 0, deadline, NO_QUALITY_GATE)
      ).to.be.revertedWith("Budget too low");
    });
  });

  // ============ 3. Fund Pool Tests ============
  describe("Fund Pool", function () {
    it("Should fund a pool fully", async function () {
      const budget = 10000n * MICRO_UNIT;
      const deadline = (await time.latest()) + 30 * 86400;

      const tx = await budgetPool.connect(poolOwner).createPool(
        "Fund Test", "Desc", budget, deadline, NO_QUALITY_GATE
      );
      const receipt = await tx.wait();
      const poolId = (receipt?.logs.find((l: any) => l.fragment?.name === "PoolCreated") as any).args[0];

      await budgetPool.connect(poolOwner).fundPool(poolId, budget);

      const pool = await budgetPool.getPool(poolId);
      expect(pool.fundedAmount).to.equal(budget);
      expect(pool.status).to.equal(1); // FUNDED

      // 验证代币已转入合约
      const contractBalance = await mockToken.balanceOf(await budgetPool.getAddress());
      expect(contractBalance).to.equal(budget);
    });
  });

  // ============ 4. Milestone Tests ============
  describe("Milestone Management", function () {
    let poolId: string;
    const budget = 10000n * MICRO_UNIT;

    beforeEach(async function () {
      poolId = await createAndFundPool(budget, NO_QUALITY_GATE);
    });

    it("Should create a milestone with participants", async function () {
      const tx = await budgetPool.connect(poolOwner).createMilestone(
        poolId,
        "Design Phase",
        "Complete UI/UX design",
        3000, // 30% of pool
        [participant1.address, participant2.address],
        [7000, 3000] // 70% / 30%
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "MilestoneCreated"
      );
      expect(event).to.not.be.undefined;

      const milestoneId = (event as any).args[0];
      const milestone = await budgetPool.getMilestone(milestoneId);
      expect(milestone.title).to.equal("Design Phase");
      expect(milestone.percentOfPool).to.equal(3000);
      expect(milestone.status).to.equal(0); // PENDING
      // 30% of 10000 USDC = 3000 USDC
      expect(milestone.budgetAmount).to.equal(3000n * MICRO_UNIT);
    });

    it("Should reject milestone with shares not equal to 100%", async function () {
      await expect(
        budgetPool.connect(poolOwner).createMilestone(
          poolId,
          "Bad Milestone",
          "Desc",
          3000,
          [participant1.address, participant2.address],
          [5000, 3000] // 50% + 30% = 80% != 100%
        )
      ).to.be.revertedWith("Shares must equal 100%");
    });
  });

  // ============ 5. Full Lifecycle Test ============
  describe("Full Lifecycle: Create -> Fund -> Milestone -> Approve -> Release -> Claim", function () {
    let poolId: string;
    let milestoneId: string;
    const budget = 10000n * MICRO_UNIT;

    beforeEach(async function () {
      // 1. 创建并充值预算池 (无质量门控，方便测试)
      poolId = await createAndFundPool(budget, NO_QUALITY_GATE);

      // 2. 创建里程碑 (30% = 3000 USDC, participant1=70%, participant2=30%)
      const tx = await budgetPool.connect(poolOwner).createMilestone(
        poolId,
        "Phase 1",
        "First phase",
        3000, // 30%
        [participant1.address, participant2.address],
        [7000, 3000]
      );
      const receipt = await tx.wait();
      milestoneId = (receipt?.logs.find((l: any) => l.fragment?.name === "MilestoneCreated") as any).args[0];

      // 3. 添加审批人
      await budgetPool.connect(poolOwner).addApprover(poolId, reviewer.address);

      // 4. 激活预算池
      await budgetPool.connect(poolOwner).activatePool(poolId);
    });

    it("Pool should be ACTIVE with milestone", async function () {
      const pool = await budgetPool.getPool(poolId);
      expect(pool.status).to.equal(2); // ACTIVE
    });

    it("Should complete full milestone lifecycle", async function () {
      // 5. 开始里程碑 (participant1 或 poolOwner)
      await budgetPool.connect(poolOwner).startMilestone(milestoneId);
      let milestone = await budgetPool.getMilestone(milestoneId);
      expect(milestone.status).to.equal(1); // IN_PROGRESS

      // 6. 提交里程碑 (participant1 提交)
      const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes("design-v1.zip"));
      await budgetPool.connect(participant1).submitMilestone(milestoneId, deliverableHash);
      milestone = await budgetPool.getMilestone(milestoneId);
      expect(milestone.status).to.equal(2); // SUBMITTED

      // 7. 审批里程碑 (reviewer 审批, 质量分 85)
      await budgetPool.connect(reviewer).approveMilestone(milestoneId, 85);
      milestone = await budgetPool.getMilestone(milestoneId);
      expect(milestone.status).to.equal(3); // APPROVED
      expect(milestone.qualityScore).to.equal(85);

      // 8. 释放里程碑资金
      await budgetPool.connect(poolOwner).releaseMilestoneFunds(milestoneId);
      milestone = await budgetPool.getMilestone(milestoneId);
      expect(milestone.status).to.equal(5); // RELEASED

      // 9. 验证资金分配
      // 里程碑金额 = 10000 * 30% = 3000 USDC
      // 平台费 = 3000 * 0.5% = 15 USDC
      // 可分配 = 3000 - 15 = 2985 USDC
      // participant1 = 70% of 2985 = 2089.5 USDC
      // participant2 = 30% of 2985 = 895.5 USDC
      const p1Balance = await budgetPool.getPendingBalance(participant1.address);
      const p2Balance = await budgetPool.getPendingBalance(participant2.address);

      // 由于整数除法，验证近似值
      expect(p1Balance).to.be.gt(0);
      expect(p2Balance).to.be.gt(0);
      // p1 应该约为 p2 的 7/3 倍
      expect(p1Balance * 3n).to.be.closeTo(p2Balance * 7n, MICRO_UNIT);
    });

    it("Should allow participants to claim earnings", async function () {
      // 完成里程碑流程
      await budgetPool.connect(poolOwner).startMilestone(milestoneId);
      const hash = ethers.keccak256(ethers.toUtf8Bytes("deliverable"));
      await budgetPool.connect(participant1).submitMilestone(milestoneId, hash);
      await budgetPool.connect(reviewer).approveMilestone(milestoneId, 85);
      await budgetPool.connect(poolOwner).releaseMilestoneFunds(milestoneId);

      // participant1 提取收益
      const pendingBefore = await budgetPool.getPendingBalance(participant1.address);
      expect(pendingBefore).to.be.gt(0);

      const balanceBefore = await mockToken.balanceOf(participant1.address);
      await budgetPool.connect(participant1).claim();
      const balanceAfter = await mockToken.balanceOf(participant1.address);

      expect(balanceAfter - balanceBefore).to.equal(pendingBefore);

      // 提取后 pending 应该为 0
      const pendingAfter = await budgetPool.getPendingBalance(participant1.address);
      expect(pendingAfter).to.equal(0);
    });

    it("Should pay platform fee on release", async function () {
      // 完成里程碑流程
      await budgetPool.connect(poolOwner).startMilestone(milestoneId);
      const hash = ethers.keccak256(ethers.toUtf8Bytes("deliverable"));
      await budgetPool.connect(participant1).submitMilestone(milestoneId, hash);
      await budgetPool.connect(reviewer).approveMilestone(milestoneId, 85);

      const treasuryBefore = await mockToken.balanceOf(treasury.address);
      await budgetPool.connect(poolOwner).releaseMilestoneFunds(milestoneId);
      const treasuryAfter = await mockToken.balanceOf(treasury.address);

      // 平台费 = 3000 USDC * 0.5% = 15 USDC
      const expectedFee = (3000n * MICRO_UNIT * BigInt(PLATFORM_FEE_BPS)) / BASIS_POINTS;
      expect(treasuryAfter - treasuryBefore).to.equal(expectedFee);
    });
  });

  // ============ 6. Quality Gate Tests ============
  describe("Quality Gate", function () {
    it("Should enforce minimum quality score", async function () {
      const budget = 5000n * MICRO_UNIT;
      const qualityGate = { minQualityScore: 70, requiresApproval: true, autoReleaseDelay: 0 };
      const poolId = await createAndFundPool(budget, qualityGate);

      // 创建里程碑
      const tx = await budgetPool.connect(poolOwner).createMilestone(
        poolId, "QG Test", "Desc", 5000, [participant1.address], [10000]
      );
      const receipt = await tx.wait();
      const milestoneId = (receipt?.logs.find((l: any) => l.fragment?.name === "MilestoneCreated") as any).args[0];

      await budgetPool.connect(poolOwner).addApprover(poolId, reviewer.address);
      await budgetPool.connect(poolOwner).activatePool(poolId);
      await budgetPool.connect(poolOwner).startMilestone(milestoneId);
      await budgetPool.connect(participant1).submitMilestone(
        milestoneId, ethers.keccak256(ethers.toUtf8Bytes("work"))
      );

      // 质量分 50 < 最低 70，应该被拒绝
      await expect(
        budgetPool.connect(reviewer).approveMilestone(milestoneId, 50)
      ).to.be.revertedWith("Quality too low");

      // 质量分 85 >= 70，应该通过
      await budgetPool.connect(reviewer).approveMilestone(milestoneId, 85);
      const milestone = await budgetPool.getMilestone(milestoneId);
      expect(milestone.status).to.equal(3); // APPROVED
    });
  });

  // ============ 7. Edge Cases ============
  describe("Edge Cases", function () {
    it("Should reject non-owner adding approver", async function () {
      const budget = 5000n * MICRO_UNIT;
      const poolId = await createAndFundPool(budget, NO_QUALITY_GATE);

      await expect(
        budgetPool.connect(participant1).addApprover(poolId, reviewer.address)
      ).to.be.revertedWith("Not pool owner");
    });

    it("Should reject non-participant submitting milestone", async function () {
      const budget = 5000n * MICRO_UNIT;
      const poolId = await createAndFundPool(budget, NO_QUALITY_GATE);

      const tx = await budgetPool.connect(poolOwner).createMilestone(
        poolId, "Test", "Desc", 5000, [participant1.address], [10000]
      );
      const receipt = await tx.wait();
      const milestoneId = (receipt?.logs.find((l: any) => l.fragment?.name === "MilestoneCreated") as any).args[0];

      await budgetPool.connect(poolOwner).activatePool(poolId);
      await budgetPool.connect(poolOwner).startMilestone(milestoneId);

      // participant2 不是参与者，不能提交
      await expect(
        budgetPool.connect(participant2).submitMilestone(
          milestoneId, ethers.keccak256(ethers.toUtf8Bytes("fake"))
        )
      ).to.be.revertedWith("Not participant");
    });
  });
});
