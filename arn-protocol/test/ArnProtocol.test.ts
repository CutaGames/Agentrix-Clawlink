import { expect } from "chai";
import { ethers } from "hardhat";
import { ArnFeeSplitter, ArnTreasury } from "../typechain-types";

describe("ARN Protocol", function () {
  let feeSplitter: ArnFeeSplitter;
  let treasury: ArnTreasury;
  let owner: any;
  let merchant: any;
  let user: any;

  beforeEach(async function () {
    [owner, merchant, user] = await ethers.getSigners();

    // Deploy Treasury
    const ArnTreasury = await ethers.getContractFactory("ArnTreasury");
    treasury = await ArnTreasury.deploy(owner.address);

    // Deploy FeeSplitter (with mock commission contract as owner)
    const ArnFeeSplitter = await ethers.getContractFactory("ArnFeeSplitter");
    feeSplitter = await ArnFeeSplitter.deploy(await treasury.getAddress(), owner.address);
  });

  it("Should split native payment correctly", async function () {
    const amount = ethers.parseEther("1.0");
    const feeBps = 30n; // 0.3%
    const expectedFee = (amount * feeBps) / 10000n;
    const expectedMerchant = amount - expectedFee;

    const routeRef = ethers.toUtf8Bytes("agent:123");

    // User pays 1 ETH
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
    ).to.emit(feeSplitter, "PaymentSplit")
     .withArgs(ethers.ZeroAddress, merchant.address, amount, expectedMerchant, expectedFee, ethers.keccak256(routeRef));
  });
});
