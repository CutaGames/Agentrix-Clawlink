import { ethers } from "hardhat";

/**
 * 完整端到端测试脚本
 * 验证所有 V5.0 合约在 BSC 测试网上的部署和配置
 */

// 合约地址
const CONTRACTS = {
  Commission: "0x5E8023659620DFD296f48f92Da0AE48c9CB443f0",
  AutoPay: "0xEb9bEa57Fc2924BBdbCD2a8eE81388F4d5B23058",
  PaymentRouter: "0xA72ecad894Ce0659E0be83B5423E765B831E156a",
  X402Adapter: "0x3Fd34DEB93B144e9de3d854b1aBb792dCe9D27e2",
  ERC8004SessionManager: "0xf94E5C7adc5bDA0bD95Cb880c5a5489562f694B7",
  USDC: "0xc23453b4842FDc4360A0a3518E2C0f51a2069386",
};

const RELAYER_ADDRESS = "0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3";

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

async function main() {
  console.log("🧪 Complete E2E Test for All V5.0 Contracts");
  console.log("=============================================");
  console.log("");

  const [signer] = await ethers.getSigners();
  console.log("Tester address:", signer.address);
  console.log("");

  const results: TestResult[] = [];

  // ============ Commission V5.0 Tests ============
  console.log("📋 Testing Commission V5.0...");
  
  const commissionAbi = [
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function settlementToken() view returns (address)",
    "function treasury() view returns (address)",
    "function rebatePool() view returns (address)",
    "function relayers(address) view returns (bool)",
    "function x402ChannelFeeRate() view returns (uint16)",
  ];

  try {
    const commission = new ethers.Contract(CONTRACTS.Commission, commissionAbi, signer);

    // Test 1: Owner
    const owner = await commission.owner();
    results.push({
      name: "Commission: Owner configured",
      passed: owner !== ethers.ZeroAddress,
      details: `Owner: ${owner}`,
    });

    // Test 2: Settlement token
    const settlementToken = await commission.settlementToken();
    results.push({
      name: "Commission: Settlement token configured",
      passed: settlementToken.toLowerCase() === CONTRACTS.USDC.toLowerCase(),
      details: `Token: ${settlementToken}`,
    });

    // Test 3: X402 channel fee rate (default 0, can be configured)
    const x402Rate = await commission.x402ChannelFeeRate();
    results.push({
      name: "Commission: X402 channel fee rate",
      passed: true, // 0 is valid default
      details: `Rate: ${x402Rate} basis points (${Number(x402Rate) / 100}%)`,
    });

    // Test 4: Relayer configured
    const isRelayer = await commission.relayers(RELAYER_ADDRESS);
    results.push({
      name: "Commission: Relayer configured",
      passed: isRelayer === true,
      details: `Relayer ${RELAYER_ADDRESS}: ${isRelayer}`,
    });

    console.log("✅ Commission V5.0 tests completed");
  } catch (error: any) {
    console.error("❌ Commission tests failed:", error.message);
    results.push({
      name: "Commission: Connection",
      passed: false,
      details: error.message,
    });
  }
  console.log("");

  // ============ AutoPay V5.0 Tests ============
  console.log("📋 Testing AutoPay V5.0...");

  const autoPayAbi = [
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function paymentToken() view returns (address)",
    "function commissionContract() view returns (address)",
    "function splitModeEnabled() view returns (bool)",
  ];

  try {
    const autoPay = new ethers.Contract(CONTRACTS.AutoPay, autoPayAbi, signer);

    // Test 1: Owner
    const owner = await autoPay.owner();
    results.push({
      name: "AutoPay: Owner configured",
      passed: owner !== ethers.ZeroAddress,
      details: `Owner: ${owner}`,
    });

    // Test 2: Payment token
    const paymentToken = await autoPay.paymentToken();
    results.push({
      name: "AutoPay: Payment token configured",
      passed: paymentToken.toLowerCase() === CONTRACTS.USDC.toLowerCase(),
      details: `Token: ${paymentToken}`,
    });

    // Test 3: Commission contract
    const commissionContract = await autoPay.commissionContract();
    results.push({
      name: "AutoPay: Commission contract configured",
      passed: commissionContract.toLowerCase() === CONTRACTS.Commission.toLowerCase(),
      details: `Commission: ${commissionContract}`,
    });

    // Test 4: Split mode enabled
    const splitModeEnabled = await autoPay.splitModeEnabled();
    results.push({
      name: "AutoPay: Split mode enabled",
      passed: splitModeEnabled === true,
      details: `Enabled: ${splitModeEnabled}`,
    });

    console.log("✅ AutoPay V5.0 tests completed");
  } catch (error: any) {
    console.error("❌ AutoPay tests failed:", error.message);
    results.push({
      name: "AutoPay: Connection",
      passed: false,
      details: error.message,
    });
  }
  console.log("");

  // ============ PaymentRouter Tests ============
  console.log("📋 Testing PaymentRouter...");

  const paymentRouterAbi = [
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
  ];

  try {
    const paymentRouter = new ethers.Contract(CONTRACTS.PaymentRouter, paymentRouterAbi, signer);

    const owner = await paymentRouter.owner();
    results.push({
      name: "PaymentRouter: Owner configured",
      passed: owner !== ethers.ZeroAddress,
      details: `Owner: ${owner}`,
    });

    console.log("✅ PaymentRouter tests completed");
  } catch (error: any) {
    console.error("❌ PaymentRouter tests failed:", error.message);
    results.push({
      name: "PaymentRouter: Connection",
      passed: false,
      details: error.message,
    });
  }
  console.log("");

  // ============ X402Adapter Tests ============
  console.log("📋 Testing X402Adapter...");

  const x402AdapterAbi = [
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function relayer() view returns (address)",
    "function paymentRouter() view returns (address)",
  ];

  try {
    const x402Adapter = new ethers.Contract(CONTRACTS.X402Adapter, x402AdapterAbi, signer);

    const owner = await x402Adapter.owner();
    results.push({
      name: "X402Adapter: Owner configured",
      passed: owner !== ethers.ZeroAddress,
      details: `Owner: ${owner}`,
    });

    const paymentRouter = await x402Adapter.paymentRouter();
    results.push({
      name: "X402Adapter: PaymentRouter configured",
      passed: paymentRouter.toLowerCase() === CONTRACTS.PaymentRouter.toLowerCase(),
      details: `PaymentRouter: ${paymentRouter}`,
    });

    // 验证 Relayer
    const relayer = await x402Adapter.relayer();
    results.push({
      name: "X402Adapter: Relayer configured",
      passed: relayer.toLowerCase() === RELAYER_ADDRESS.toLowerCase(),
      details: `Relayer: ${relayer}`,
    });

    console.log("✅ X402Adapter tests completed");
  } catch (error: any) {
    console.error("❌ X402Adapter tests failed:", error.message);
    results.push({
      name: "X402Adapter: Connection",
      passed: false,
      details: error.message,
    });
  }
  console.log("");

  // ============ ERC8004SessionManager Tests ============
  console.log("📋 Testing ERC8004SessionManager...");

  const sessionManagerAbi = [
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function relayer() view returns (address)",
  ];

  try {
    const sessionManager = new ethers.Contract(CONTRACTS.ERC8004SessionManager, sessionManagerAbi, signer);

    const owner = await sessionManager.owner();
    results.push({
      name: "ERC8004SessionManager: Owner configured",
      passed: owner !== ethers.ZeroAddress,
      details: `Owner: ${owner}`,
    });

    const relayer = await sessionManager.relayer();
    results.push({
      name: "ERC8004SessionManager: Relayer configured",
      passed: relayer.toLowerCase() === RELAYER_ADDRESS.toLowerCase(),
      details: `Relayer: ${relayer}`,
    });

    console.log("✅ ERC8004SessionManager tests completed");
  } catch (error: any) {
    console.error("❌ ERC8004SessionManager tests failed:", error.message);
    results.push({
      name: "ERC8004SessionManager: Connection",
      passed: false,
      details: error.message,
    });
  }
  console.log("");

  // ============ USDC Token Tests ============
  console.log("📋 Testing USDC Token...");

  const usdcAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
  ];

  try {
    const usdc = new ethers.Contract(CONTRACTS.USDC, usdcAbi, signer);

    const name = await usdc.name();
    const symbol = await usdc.symbol();
    const decimals = await usdc.decimals();
    results.push({
      name: "USDC: Token info",
      passed: decimals === 18n || decimals === 6n,
      details: `${name} (${symbol}), decimals: ${decimals}`,
    });

    const balance = await usdc.balanceOf(signer.address);
    results.push({
      name: "USDC: Tester balance",
      passed: true,
      details: `Balance: ${ethers.formatUnits(balance, Number(decimals))} ${symbol}`,
    });

    console.log("✅ USDC tests completed");
  } catch (error: any) {
    console.error("❌ USDC tests failed:", error.message);
    results.push({
      name: "USDC: Connection",
      passed: false,
      details: error.message,
    });
  }
  console.log("");

  // ============ Summary ============
  console.log("=============================================");
  console.log("📊 Test Results Summary");
  console.log("=============================================");

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? "✅" : "❌";
    console.log(`${status} ${result.name}`);
    console.log(`   ${result.details}`);
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log("");
  console.log("=============================================");
  console.log(`📈 Total: ${passed + failed} tests, ${passed} passed, ${failed} failed`);
  console.log("=============================================");

  if (failed > 0) {
    console.log("");
    console.log("⚠️  Some tests failed. Please check the configuration.");
    process.exit(1);
  } else {
    console.log("");
    console.log("🎉 All tests passed! Contracts are ready for use.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
