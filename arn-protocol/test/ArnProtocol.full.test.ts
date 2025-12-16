import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ArnFeeSplitter,
  ArnTreasury,
  ReceiptRegistry,
  EpochManager,
  MerkleDistributor,
  AttestationRegistry,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

describe("ARN Protocol", function () {
  let feeSplitter: ArnFeeSplitter;
  let treasury: ArnTreasury;
  let receiptRegistry: ReceiptRegistry;
  let epochManager: EpochManager;
  let merkleDistributor: MerkleDistributor;
  let attestationRegistry: AttestationRegistry;
  
  let owner: SignerWithAddress;
  let merchant: SignerWithAddress;
  let user: SignerWithAddress;
  let agent: SignerWithAddress;
  let challenger: SignerWithAddress;

  beforeEach(async function () {
    [owner, merchant, user, agent, challenger] = await ethers.getSigners();

    // Deploy Treasury
    const ArnTreasury = await ethers.getContractFactory("ArnTreasury");
    treasury = await ArnTreasury.deploy(owner.address);
    const treasuryAddress = await treasury.getAddress();

    // Deploy FeeSplitter (mock commission contract as owner for testing)
    const ArnFeeSplitter = await ethers.getContractFactory("ArnFeeSplitter");
    feeSplitter = await ArnFeeSplitter.deploy(treasuryAddress, owner.address);

    // Deploy ReceiptRegistry
    const ReceiptRegistry = await ethers.getContractFactory("ReceiptRegistry");
    receiptRegistry = await ReceiptRegistry.deploy(owner.address);

    // Deploy EpochManager
    const EpochManager = await ethers.getContractFactory("EpochManager");
    epochManager = await EpochManager.deploy(owner.address);

    // Deploy MerkleDistributor
    const MerkleDistributor = await ethers.getContractFactory("MerkleDistributor");
    merkleDistributor = await MerkleDistributor.deploy(owner.address, treasuryAddress);
  });

  describe("ArnFeeSplitter", function () {
    it("Should split native payment correctly with 0.3% fee", async function () {
      const amount = ethers.parseEther("1.0");
      const feeBps = 30n; // 0.3%
      const expectedFee = (amount * feeBps) / 10000n;
      const expectedMerchant = amount - expectedFee;

      const routeRef = ethers.toUtf8Bytes("agent:123");

      await expect(
        feeSplitter.connect(user).splitPaymentNative(merchant.address, routeRef, { value: amount })
      ).to.changeEtherBalances(
        [user, merchant, treasury],
        [-amount, expectedMerchant, expectedFee]
      );
    });

    it("Should emit PaymentSplit event", async function () {
      const amount = ethers.parseEther("1.0");
      const routeRef = ethers.toUtf8Bytes("agent:123");
      const feeBps = 30n;
      const expectedFee = (amount * feeBps) / 10000n;
      const expectedMerchant = amount - expectedFee;

      await expect(
        feeSplitter.connect(user).splitPaymentNative(merchant.address, routeRef, { value: amount })
      )
        .to.emit(feeSplitter, "PaymentSplit")
        .withArgs(
          ethers.ZeroAddress,
          merchant.address,
          amount,
          expectedMerchant,
          expectedFee,
          ethers.keccak256(routeRef)
        );
    });
  });

  describe("ArnTreasury", function () {
    it("Should have correct distribution ratios", async function () {
      expect(await treasury.WATCHER_BPS()).to.equal(4000n);
      expect(await treasury.OPERATOR_BPS()).to.equal(3000n);
      expect(await treasury.PUBLIC_GOODS_BPS()).to.equal(2000n);
      expect(await treasury.SECURITY_RESERVE_BPS()).to.equal(1000n);
    });

    it("Should receive funds", async function () {
      const amount = ethers.parseEther("1.0");
      const treasuryAddress = await treasury.getAddress();
      
      await owner.sendTransaction({
        to: treasuryAddress,
        value: amount,
      });

      expect(await ethers.provider.getBalance(treasuryAddress)).to.equal(amount);
    });
  });

  describe("ReceiptRegistry", function () {
    it("Should record receipt correctly", async function () {
      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-1"));
      const amount = ethers.parseUnits("100", 18);
      const protocolFee = ethers.parseUnits("0.3", 18);
      const epochId = 1n;
      const routeRefHash = ethers.keccak256(ethers.toUtf8Bytes("agent:123"));

      await receiptRegistry.recordReceipt(
        paymentId,
        user.address,
        merchant.address,
        agent.address,
        ethers.ZeroAddress, // ETH
        amount,
        protocolFee,
        epochId,
        routeRefHash
      );

      const receipt = await receiptRegistry.getReceipt(paymentId);
      expect(receipt.payer).to.equal(user.address);
      expect(receipt.merchant).to.equal(merchant.address);
      expect(receipt.agent).to.equal(agent.address);
      expect(receipt.amount).to.equal(amount);
    });

    it("Should track epoch stats", async function () {
      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-1"));
      const amount = ethers.parseUnits("100", 18);
      const protocolFee = ethers.parseUnits("0.3", 18);
      const epochId = 1n;

      await receiptRegistry.recordReceipt(
        paymentId,
        user.address,
        merchant.address,
        agent.address,
        ethers.ZeroAddress,
        amount,
        protocolFee,
        epochId,
        ethers.ZeroHash
      );

      const [totalReceipts, totalVolume, totalFees] = await receiptRegistry.getEpochStats(epochId);
      expect(totalReceipts).to.equal(1n);
      expect(totalVolume).to.equal(amount);
      expect(totalFees).to.equal(protocolFee);
    });
  });

  describe("EpochManager", function () {
    it("Should initialize with epoch 1", async function () {
      expect(await epochManager.getCurrentEpochId()).to.equal(1n);
    });

    it("Should not advance epoch before time", async function () {
      expect(await epochManager.canAdvanceEpoch()).to.be.false;
    });

    it("Should advance epoch after duration", async function () {
      // Fast forward 7 days
      await time.increase(7 * 24 * 60 * 60 + 1);
      
      // First finalize current epoch
      await epochManager.finalizeEpoch(1, ethers.keccak256(ethers.toUtf8Bytes("root")), 1000n);
      
      expect(await epochManager.canAdvanceEpoch()).to.be.true;
      
      await epochManager.advanceEpoch();
      expect(await epochManager.getCurrentEpochId()).to.equal(2n);
    });

    it("Should finalize epoch with merkle root", async function () {
      const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("test-root"));
      const totalRewards = ethers.parseUnits("1000", 18);

      await epochManager.finalizeEpoch(1, merkleRoot, totalRewards);

      expect(await epochManager.getMerkleRoot(1)).to.equal(merkleRoot);
      expect(await epochManager.isEpochFinalized(1)).to.be.true;
    });
  });

  describe("MerkleDistributor", function () {
    it("Should set merkle root", async function () {
      const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("test-root"));
      
      await merkleDistributor.setMerkleRoot(1, ethers.ZeroAddress, merkleRoot);
      
      expect(await merkleDistributor.epochMerkleRoots(1, ethers.ZeroAddress)).to.equal(merkleRoot);
    });
  });

  describe("AttestationRegistry", function () {
    let mockToken: any;

    beforeEach(async function () {
      // Deploy mock ERC20 token
      const MockToken = await ethers.getContractFactory("ArnTreasury"); // Using Treasury as mock
      mockToken = await MockToken.deploy(owner.address);
      
      // Deploy AttestationRegistry
      const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
      attestationRegistry = await AttestationRegistry.deploy(
        owner.address,
        await mockToken.getAddress(),
        ethers.parseUnits("10", 18), // minBondAmount
        7 * 24 * 60 * 60,            // 7 days challenge period
        5000                          // 50% slash
      );
    });

    it("Should submit attestation without bond", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("quality-proof"));
      
      const tx = await attestationRegistry.connect(agent).submitAttestation(contentHash, 0);
      const receipt = await tx.wait();
      
      // Find AttestationSubmitted event
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "AttestationSubmitted"
      );
      expect(event).to.not.be.undefined;
    });

    it("Should validate attestation after challenge period", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("quality-proof"));
      
      const tx = await attestationRegistry.connect(agent).submitAttestation(contentHash, 0);
      const receipt = await tx.wait();
      
      // Get attestation ID from event
      const iface = attestationRegistry.interface;
      const eventLog = receipt?.logs.find(
        (log: any) => {
          try {
            const parsed = iface.parseLog(log);
            return parsed?.name === "AttestationSubmitted";
          } catch {
            return false;
          }
        }
      );
      
      const parsed = iface.parseLog(eventLog!);
      const attestationId = parsed?.args[0];

      // Fast forward past challenge period
      await time.increase(7 * 24 * 60 * 60 + 1);

      // Validate
      await attestationRegistry.validate(attestationId);
      
      const att = await attestationRegistry.getAttestation(attestationId);
      expect(att.status).to.equal(1n); // Validated
    });
  });
});
