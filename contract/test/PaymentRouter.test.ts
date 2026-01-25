import { expect } from "chai";
import { ethers } from "hardhat";
import { PaymentRouter } from "../typechain-types";

describe("PaymentRouter", function () {
  let paymentRouter: PaymentRouter;
  let owner: any;
  let payer: any;
  let recipient: any;

  beforeEach(async function () {
    [owner, payer, recipient] = await ethers.getSigners();

    const PaymentRouterFactory = await ethers.getContractFactory("PaymentRouter");
    paymentRouter = await PaymentRouterFactory.deploy();
    await paymentRouter.waitForDeployment();
  });

  describe("设置支付通道", function () {
    it("应该成功设置支付通道", async function () {
      const channelAddress = ethers.Wallet.createRandom().address;
      
      await paymentRouter.setPaymentChannel(
        0, // STRIPE
        channelAddress,
        true,
        50,
        ethers.parseEther("0.01"),
        ethers.parseEther("1000")
      );

      const channel = await paymentRouter.paymentChannels(0);
      expect(channel.channelAddress).to.equal(channelAddress);
      expect(channel.isActive).to.be.true;
    });
  });

  describe("路由支付", function () {
    beforeEach(async function () {
      // 设置钱包支付通道
      await paymentRouter.setPaymentChannel(
        1, // WALLET
        await paymentRouter.getAddress(),
        true,
        60,
        ethers.parseEther("0.001"),
        ethers.parseEther("1000")
      );
    });

    it("应该成功路由钱包支付（新接口）", async function () {
      const paymentId = ethers.id("test-payment");
      const sessionId = ethers.id("test-session");
      const amount = ethers.parseEther("1");

      await expect(
        paymentRouter.connect(payer).routePayment(
          paymentId,
          recipient.address,
          amount,
          1, // WALLET
          sessionId,  // sessionId
          amount,     // merchantPrice
          0,          // channelFee
          { value: amount }
        )
      )
        .to.emit(paymentRouter, "PaymentRouted")
        .to.emit(paymentRouter, "PaymentCompleted");

      const balance = await paymentRouter.balances(recipient.address);
      expect(balance).to.equal(amount);
    });

    it("应该成功路由钱包支付（旧接口，向后兼容）", async function () {
      const paymentId = ethers.id("test-payment-legacy");
      const amount = ethers.parseEther("1");

      await expect(
        paymentRouter.connect(payer).routePaymentLegacy(
          paymentId,
          recipient.address,
          amount,
          1, // WALLET
          { value: amount }
        )
      )
        .to.emit(paymentRouter, "PaymentRouted")
        .to.emit(paymentRouter, "PaymentCompleted");

      const balance = await paymentRouter.balances(recipient.address);
      expect(balance).to.equal(amount);
    });

    it("应该拒绝无效的支付金额", async function () {
      const paymentId = ethers.id("test-payment");
      const sessionId = ethers.id("test-session");
      const amount = ethers.parseEther("2000"); // 超过最大限额

      await expect(
        paymentRouter.connect(payer).routePayment(
          paymentId,
          recipient.address,
          amount,
          1,
          sessionId,
          amount,
          0,
          { value: amount }
        )
      ).to.be.revertedWith("Amount out of range");
    });
  });
});

