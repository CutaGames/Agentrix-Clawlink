import { expect } from "chai";
import { ethers } from "hardhat";
import { AutoPay } from "../typechain-types";

describe("AutoPay", function () {
  let autoPay: AutoPay;
  let owner: any;
  let user: any;
  let agent: any;
  let recipient: any;

  beforeEach(async function () {
    [owner, user, agent, recipient] = await ethers.getSigners();

    const AutoPayFactory = await ethers.getContractFactory("AutoPay");
    autoPay = await AutoPayFactory.deploy();
    await autoPay.waitForDeployment();

    // 向合约存入一些ETH用于测试
    await owner.sendTransaction({
      to: await autoPay.getAddress(),
      value: ethers.parseEther("10"),
    });
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
      )
        .to.emit(autoPay, "GrantCreated")
        .withArgs(
          user.address,
          agent.address,
          singleLimit,
          dailyLimit,
          (await ethers.provider.getBlock("latest"))!.timestamp + duration
        );
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
      // 先执行一次支付
      await autoPay.connect(agent).executeAutoPayment(
        ethers.id("payment-1"),
        user.address,
        recipient.address,
        ethers.parseEther("4")
      );

      // 再次执行应该超过每日限额
      await expect(
        autoPay.connect(agent).executeAutoPayment(
          ethers.id("payment-2"),
          user.address,
          recipient.address,
          ethers.parseEther("2")
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
});

