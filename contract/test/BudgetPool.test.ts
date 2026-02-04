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

  const MICRO_UNIT = 1000000; // 1 USDC = 1000000

  beforeEach(async function () {
    [owner, treasury, poolOwner, participant1, participant2, reviewer, funder] = await ethers.getSigners();

    // 部署 Mock ERC20 代币
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("Mock USDC", "USDC", 6);
    await mockToken.waitForDeployment();

    // 部署 BudgetPool
    const BudgetPoolFactory = await ethers.getContractFactory("BudgetPool");
    budgetPool = await BudgetPoolFactory.deploy(
      await mockToken.getAddress(),
      treasury.address
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

  describe("Deployment", function () {
    it("Should set the correct settlement token", async function () {
      expect(await budgetPool.settlementToken()).to.equal(await mockToken.getAddress());
    });

    it("Should set the correct platform treasury", async function () {
      expect(await budgetPool.platformTreasury()).to.equal(treasury.address);
    });
  });

  describe("Pool Creation", function () {
    it("Should create a budget pool", async function () {
      const name = "Marketing Campaign Q1";
      const budget = 10000 * MICRO_UNIT; // 10,000 USDC
      const startDate = await time.latest() + 86400; // Tomorrow
      const endDate = startDate + 30 * 86400; // 30 days later

      const tx = await budgetPool.connect(poolOwner).createPool(
        name,
        budget,
        startDate,
        endDate
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "PoolCreated"
      );
      
      expect(event).to.not.be.undefined;

      const poolId = (event as any).args[0];
      const pool = await budgetPool.getPool(poolId);
      
      expect(pool.name).to.equal(name);
      expect(pool.owner).to.equal(poolOwner.address);
      expect(pool.totalBudget).to.equal(budget);
      expect(pool.funded).to.equal(0);
      expect(pool.status).to.equal(0); // DRAFT
    });

    it("Should revert if end date is before start date", async function () {
      const startDate = await time.latest() + 86400;
      const endDate = startDate - 1;

      await expect(
        budgetPool.connect(poolOwner).createPool(
          "Bad Pool",
          10000 * MICRO_UNIT,
          startDate,
          endDate
        )
      ).to.be.revertedWith("End must be after start");
    });

    it("Should revert if budget is zero", async function () {
      const startDate = await time.latest() + 86400;
      const endDate = startDate + 30 * 86400;

      await expect(
        budgetPool.connect(poolOwner).createPool(
          "Zero Budget",
          0,
          startDate,
          endDate
        )
      ).to.be.revertedWith("Budget must be > 0");
    });
  });

  describe("Pool Funding", function () {
    let poolId: string;
    const budget = 10000 * MICRO_UNIT;

    beforeEach(async function () {
      const startDate = await time.latest() + 86400;
      const endDate = startDate + 30 * 86400;

      const tx = await budgetPool.connect(poolOwner).createPool(
        "Test Pool",
        budget,
        startDate,
        endDate
      );

      const receipt = await tx.wait();
      poolId = (receipt?.logs[0] as any).args[0];
    });

    it("Should allow funding a pool", async function () {
      const fundAmount = 5000 * MICRO_UNIT;

      await budgetPool.connect(funder).fundPool(poolId, fundAmount);

      const pool = await budgetPool.getPool(poolId);
      expect(pool.funded).to.equal(fundAmount);
    });

    it("Should emit FundingReceived event", async function () {
      const fundAmount = 5000 * MICRO_UNIT;

      await expect(budgetPool.connect(funder).fundPool(poolId, fundAmount))
        .to.emit(budgetPool, "FundingReceived")
        .withArgs(poolId, funder.address, fundAmount);
    });

    it("Should auto-activate pool when fully funded", async function () {
      await budgetPool.connect(funder).fundPool(poolId, budget);

      const pool = await budgetPool.getPool(poolId);
      expect(pool.status).to.equal(1); // ACTIVE
      expect(pool.funded).to.equal(budget);
    });

    it("Should revert if overfunding", async function () {
      const overAmount = budget + 1;

      await expect(
        budgetPool.connect(funder).fundPool(poolId, overAmount)
      ).to.be.revertedWith("Exceeds budget");
    });
  });

  describe("Milestone Management", function () {
    let poolId: string;
    const budget = 10000 * MICRO_UNIT;

    beforeEach(async function () {
      const startDate = await time.latest() + 86400;
      const endDate = startDate + 30 * 86400;

      const tx = await budgetPool.connect(poolOwner).createPool(
        "Test Pool",
        budget,
        startDate,
        endDate
      );

      const receipt = await tx.wait();
      poolId = (receipt?.logs[0] as any).args[0];

      // 完全注资
      await budgetPool.connect(funder).fundPool(poolId, budget);
    });

    it("Should create a milestone", async function () {
      const participants = [participant1.address, participant2.address];
      const shares = [6000, 4000]; // 60%, 40%
      const milestoneAmount = 2000 * MICRO_UNIT;
      const deadline = await time.latest() + 7 * 86400;

      const tx = await budgetPool.connect(poolOwner).createMilestone(
        poolId,
        "Phase 1",
        "Complete initial design",
        milestoneAmount,
        participants,
        shares,
        deadline
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "MilestoneCreated"
      );

      expect(event).to.not.be.undefined;
    });

    it("Should revert if milestone amount exceeds remaining budget", async function () {
      const participants = [participant1.address];
      const shares = [10000];
      const deadline = await time.latest() + 7 * 86400;

      await expect(
        budgetPool.connect(poolOwner).createMilestone(
          poolId,
          "Too Big",
          "Exceeds budget",
          budget + 1,
          participants,
          shares,
          deadline
        )
      ).to.be.revertedWith("Exceeds remaining budget");
    });

    it("Should revert if shares don't sum to 100%", async function () {
      const participants = [participant1.address, participant2.address];
      const shares = [5000, 4000]; // 90% != 100%
      const deadline = await time.latest() + 7 * 86400;

      await expect(
        budgetPool.connect(poolOwner).createMilestone(
          poolId,
          "Bad Shares",
          "",
          1000 * MICRO_UNIT,
          participants,
          shares,
          deadline
        )
      ).to.be.revertedWith("Shares must equal 100%");
    });

    it("Should only allow pool owner to create milestones", async function () {
      const participants = [participant1.address];
      const shares = [10000];
      const deadline = await time.latest() + 7 * 86400;

      await expect(
        budgetPool.connect(funder).createMilestone(
          poolId,
          "Unauthorized",
          "",
          1000 * MICRO_UNIT,
          participants,
          shares,
          deadline
        )
      ).to.be.revertedWith("Not pool owner");
    });
  });

  describe("Milestone Workflow", function () {
    let poolId: string;
    let milestoneId: string;
    const budget = 10000 * MICRO_UNIT;
    const milestoneAmount = 2000 * MICRO_UNIT;

    beforeEach(async function () {
      const startDate = await time.latest() + 86400;
      const endDate = startDate + 30 * 86400;

      let tx = await budgetPool.connect(poolOwner).createPool(
        "Test Pool",
        budget,
        startDate,
        endDate
      );

      let receipt = await tx.wait();
      poolId = (receipt?.logs[0] as any).args[0];

      // 完全注资
      await budgetPool.connect(funder).fundPool(poolId, budget);

      // 创建里程碑
      const participants = [participant1.address, participant2.address];
      const shares = [6000, 4000];
      const deadline = await time.latest() + 7 * 86400;

      tx = await budgetPool.connect(poolOwner).createMilestone(
        poolId,
        "Phase 1",
        "Complete initial design",
        milestoneAmount,
        participants,
        shares,
        deadline
      );

      receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "MilestoneCreated"
      );
      milestoneId = (event as any).args[1];
    });

    it("Should allow participant to submit work", async function () {
      const submissionLink = "https://github.com/example/pr/123";

      await budgetPool.connect(participant1).submitWork(
        poolId,
        milestoneId,
        submissionLink
      );

      const milestone = await budgetPool.getMilestone(poolId, milestoneId);
      expect(milestone.status).to.equal(1); // SUBMITTED
    });

    it("Should only allow participants to submit", async function () {
      await expect(
        budgetPool.connect(funder).submitWork(
          poolId,
          milestoneId,
          "https://example.com"
        )
      ).to.be.revertedWith("Not a participant");
    });

    it("Should allow owner to approve milestone", async function () {
      // 提交工作
      await budgetPool.connect(participant1).submitWork(
        poolId,
        milestoneId,
        "https://example.com"
      );

      // 审批通过
      await budgetPool.connect(poolOwner).approveMilestone(poolId, milestoneId);

      const milestone = await budgetPool.getMilestone(poolId, milestoneId);
      expect(milestone.status).to.equal(2); // APPROVED
    });

    it("Should allow owner to reject milestone", async function () {
      // 提交工作
      await budgetPool.connect(participant1).submitWork(
        poolId,
        milestoneId,
        "https://example.com"
      );

      // 拒绝
      const rejectReason = "Design does not meet requirements";
      await budgetPool.connect(poolOwner).rejectMilestone(
        poolId,
        milestoneId,
        rejectReason
      );

      const milestone = await budgetPool.getMilestone(poolId, milestoneId);
      expect(milestone.status).to.equal(3); // REJECTED
    });
  });

  describe("Fund Release", function () {
    let poolId: string;
    let milestoneId: string;
    const budget = 10000 * MICRO_UNIT;
    const milestoneAmount = 2000 * MICRO_UNIT;

    beforeEach(async function () {
      const startDate = await time.latest() + 86400;
      const endDate = startDate + 30 * 86400;

      let tx = await budgetPool.connect(poolOwner).createPool(
        "Test Pool",
        budget,
        startDate,
        endDate
      );

      let receipt = await tx.wait();
      poolId = (receipt?.logs[0] as any).args[0];

      // 完全注资
      await budgetPool.connect(funder).fundPool(poolId, budget);

      // 创建里程碑
      const participants = [participant1.address, participant2.address];
      const shares = [6000, 4000];
      const deadline = await time.latest() + 7 * 86400;

      tx = await budgetPool.connect(poolOwner).createMilestone(
        poolId,
        "Phase 1",
        "Complete initial design",
        milestoneAmount,
        participants,
        shares,
        deadline
      );

      receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "MilestoneCreated"
      );
      milestoneId = (event as any).args[1];

      // 提交并审批
      await budgetPool.connect(participant1).submitWork(
        poolId,
        milestoneId,
        "https://example.com"
      );
      await budgetPool.connect(poolOwner).approveMilestone(poolId, milestoneId);
    });

    it("Should release funds after approval", async function () {
      const p1BalanceBefore = await mockToken.balanceOf(participant1.address);
      const p2BalanceBefore = await mockToken.balanceOf(participant2.address);

      await budgetPool.connect(poolOwner).releaseFunds(poolId, milestoneId);

      const p1BalanceAfter = await mockToken.balanceOf(participant1.address);
      const p2BalanceAfter = await mockToken.balanceOf(participant2.address);

      // 60% of 2000 = 1200 USDC
      expect(p1BalanceAfter - p1BalanceBefore).to.equal(1200n * BigInt(MICRO_UNIT));
      // 40% of 2000 = 800 USDC
      expect(p2BalanceAfter - p2BalanceBefore).to.equal(800n * BigInt(MICRO_UNIT));

      const milestone = await budgetPool.getMilestone(poolId, milestoneId);
      expect(milestone.status).to.equal(4); // RELEASED
    });

    it("Should revert if milestone not approved", async function () {
      // 创建另一个未审批的里程碑
      const participants = [participant1.address];
      const shares = [10000];
      const deadline = await time.latest() + 7 * 86400;

      const tx = await budgetPool.connect(poolOwner).createMilestone(
        poolId,
        "Phase 2",
        "",
        1000 * MICRO_UNIT,
        participants,
        shares,
        deadline
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "MilestoneCreated"
      );
      const newMilestoneId = (event as any).args[1];

      await expect(
        budgetPool.connect(poolOwner).releaseFunds(poolId, newMilestoneId)
      ).to.be.revertedWith("Milestone not approved");
    });

    it("Should revert if already released", async function () {
      await budgetPool.connect(poolOwner).releaseFunds(poolId, milestoneId);

      await expect(
        budgetPool.connect(poolOwner).releaseFunds(poolId, milestoneId)
      ).to.be.revertedWith("Already released");
    });
  });

  describe("Pool Lifecycle", function () {
    let poolId: string;
    const budget = 10000 * MICRO_UNIT;

    beforeEach(async function () {
      const startDate = await time.latest() + 86400;
      const endDate = startDate + 30 * 86400;

      const tx = await budgetPool.connect(poolOwner).createPool(
        "Test Pool",
        budget,
        startDate,
        endDate
      );

      const receipt = await tx.wait();
      poolId = (receipt?.logs[0] as any).args[0];
    });

    it("Should allow owner to close draft pool", async function () {
      await budgetPool.connect(poolOwner).closePool(poolId);

      const pool = await budgetPool.getPool(poolId);
      expect(pool.status).to.equal(3); // CLOSED
    });

    it("Should allow owner to cancel active pool", async function () {
      // 先注资使其变为 ACTIVE
      await budgetPool.connect(funder).fundPool(poolId, budget);

      await budgetPool.connect(poolOwner).cancelPool(poolId);

      const pool = await budgetPool.getPool(poolId);
      expect(pool.status).to.equal(4); // CANCELLED
    });

    it("Should refund remaining funds when cancelled", async function () {
      await budgetPool.connect(funder).fundPool(poolId, budget);

      // 创建并完成一个里程碑
      const participants = [participant1.address];
      const shares = [10000];
      const deadline = await time.latest() + 7 * 86400;

      const tx = await budgetPool.connect(poolOwner).createMilestone(
        poolId,
        "Phase 1",
        "",
        2000 * MICRO_UNIT,
        participants,
        shares,
        deadline
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "MilestoneCreated"
      );
      const milestoneId = (event as any).args[1];

      await budgetPool.connect(participant1).submitWork(poolId, milestoneId, "https://example.com");
      await budgetPool.connect(poolOwner).approveMilestone(poolId, milestoneId);
      await budgetPool.connect(poolOwner).releaseFunds(poolId, milestoneId);

      // 取消池，应退还剩余资金
      const ownerBalanceBefore = await mockToken.balanceOf(poolOwner.address);

      await budgetPool.connect(poolOwner).cancelPool(poolId);

      const ownerBalanceAfter = await mockToken.balanceOf(poolOwner.address);
      // 剩余 8000 USDC 应该退还给 pool owner
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(8000n * BigInt(MICRO_UNIT));
    });
  });

  describe("Quality Gates", function () {
    let poolId: string;
    let milestoneId: string;
    const budget = 10000 * MICRO_UNIT;

    beforeEach(async function () {
      const startDate = await time.latest() + 86400;
      const endDate = startDate + 30 * 86400;

      let tx = await budgetPool.connect(poolOwner).createPool(
        "Test Pool",
        budget,
        startDate,
        endDate
      );

      let receipt = await tx.wait();
      poolId = (receipt?.logs[0] as any).args[0];

      await budgetPool.connect(funder).fundPool(poolId, budget);

      // 创建带质量门禁的里程碑
      const participants = [participant1.address];
      const shares = [10000];
      const deadline = await time.latest() + 7 * 86400;

      tx = await budgetPool.connect(poolOwner).createMilestoneWithQualityGates(
        poolId,
        "Phase 1",
        "",
        2000 * MICRO_UNIT,
        participants,
        shares,
        deadline,
        ["Code Review", "Security Audit", "Performance Test"]
      );

      receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "MilestoneCreated"
      );
      milestoneId = (event as any).args[1];

      // 添加审阅者
      await budgetPool.connect(poolOwner).addReviewer(poolId, reviewer.address);
    });

    it("Should require all quality gates to pass before approval", async function () {
      await budgetPool.connect(participant1).submitWork(
        poolId,
        milestoneId,
        "https://example.com"
      );

      // 尝试在质量门禁未通过时审批
      await expect(
        budgetPool.connect(poolOwner).approveMilestone(poolId, milestoneId)
      ).to.be.revertedWith("Quality gates not passed");
    });

    it("Should allow reviewer to pass quality gates", async function () {
      await budgetPool.connect(participant1).submitWork(
        poolId,
        milestoneId,
        "https://example.com"
      );

      // 通过所有质量门禁
      await budgetPool.connect(reviewer).passQualityGate(poolId, milestoneId, 0);
      await budgetPool.connect(reviewer).passQualityGate(poolId, milestoneId, 1);
      await budgetPool.connect(reviewer).passQualityGate(poolId, milestoneId, 2);

      // 现在可以审批
      await budgetPool.connect(poolOwner).approveMilestone(poolId, milestoneId);

      const milestone = await budgetPool.getMilestone(poolId, milestoneId);
      expect(milestone.status).to.equal(2); // APPROVED
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to set platform treasury", async function () {
      const newTreasury = funder.address;
      await budgetPool.connect(owner).setPlatformTreasury(newTreasury);
      expect(await budgetPool.platformTreasury()).to.equal(newTreasury);
    });

    it("Should revert if non-owner tries to set treasury", async function () {
      await expect(
        budgetPool.connect(funder).setPlatformTreasury(funder.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Emergency Functions", function () {
    let poolId: string;
    const budget = 10000 * MICRO_UNIT;

    beforeEach(async function () {
      const startDate = await time.latest() + 86400;
      const endDate = startDate + 30 * 86400;

      const tx = await budgetPool.connect(poolOwner).createPool(
        "Test Pool",
        budget,
        startDate,
        endDate
      );

      const receipt = await tx.wait();
      poolId = (receipt?.logs[0] as any).args[0];

      await budgetPool.connect(funder).fundPool(poolId, budget);
    });

    it("Should allow owner to pause contract", async function () {
      await budgetPool.connect(owner).pause();

      await expect(
        budgetPool.connect(funder).fundPool(poolId, 1000 * MICRO_UNIT)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to unpause contract", async function () {
      await budgetPool.connect(owner).pause();
      await budgetPool.connect(owner).unpause();

      // 创建新池测试 - 不应该 revert
      const startDate = await time.latest() + 86400;
      const endDate = startDate + 30 * 86400;

      await expect(
        budgetPool.connect(poolOwner).createPool(
          "New Pool",
          5000 * MICRO_UNIT,
          startDate,
          endDate
        )
      ).to.not.be.reverted;
    });

    it("Should allow emergency withdrawal by admin", async function () {
      const treasuryBalanceBefore = await mockToken.balanceOf(treasury.address);

      await budgetPool.connect(owner).emergencyWithdraw(poolId);

      const treasuryBalanceAfter = await mockToken.balanceOf(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(BigInt(budget));

      const pool = await budgetPool.getPool(poolId);
      expect(pool.status).to.equal(5); // EMERGENCY_CLOSED
    });
  });
});
