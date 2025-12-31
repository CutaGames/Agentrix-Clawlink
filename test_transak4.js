const axios = require("axios");

async function testTransakAPI() {
  const PROD_API_KEY = "9262fe4c-3fe6-42a9-8aad-22b360f01f16";
  const STAGING_API_KEY = "7f03deb8-ee24-49b3-a919-31e7d9244030";

  // 方案1：直接使用 Widget URL（不需要 Create Session API）
  // 这是最简单的集成方式
  console.log("=== Option 1: Direct Widget URL ===");
  const widgetUrl = `https://global.transak.com/?apiKey=${PROD_API_KEY}&cryptoCurrencyCode=USDC&network=bsc&walletAddress=0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C&defaultCryptoAmount=100`;
  console.log("Widget URL:", widgetUrl);
  console.log("This URL can be used directly without Create Session API\n");

  // 方案2：测试 GET 报价 API（这个应该能工作）
  console.log("=== Option 2: Test Quote API (STAGING) ===");
  try {
    const quoteResp = await axios.get("https://api-stg.transak.com/api/v2/currencies/price", {
      params: {
        fiatCurrency: "USD",
        cryptoCurrency: "USDC",
        partnerApiKey: STAGING_API_KEY,
        isBuyOrSell: "BUY",
        isSourceAmount: false,
        cryptoAmount: 100,
        network: "bsc"
      },
      timeout: 10000
    });
    console.log("Quote Success:", JSON.stringify(quoteResp.data, null, 2));
  } catch (e) {
    console.log("Quote Error:", JSON.stringify(e.response?.data || e.message));
  }

  // 方案3：测试 GET 报价 API（生产环境）
  console.log("\n=== Option 3: Test Quote API (PRODUCTION) ===");
  try {
    const quoteResp = await axios.get("https://api.transak.com/api/v2/currencies/price", {
      params: {
        fiatCurrency: "USD",
        cryptoCurrency: "USDC",
        partnerApiKey: PROD_API_KEY,
        isBuyOrSell: "BUY",
        isSourceAmount: false,
        cryptoAmount: 100,
        network: "bsc"
      },
      timeout: 10000
    });
    console.log("Quote Success:", JSON.stringify(quoteResp.data, null, 2));
  } catch (e) {
    console.log("Quote Error:", JSON.stringify(e.response?.data || e.message));
  }

  // 方案4：测试不同的 session endpoint 路径
  console.log("\n=== Option 4: Test different session endpoints ===");
  
  const endpoints = [
    "https://api.transak.com/partners/api/v2/session",
    "https://api.transak.com/api/v2/session",
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTrying: ${endpoint}`);
    try {
      const resp = await axios.post(endpoint, {
        widgetParams: {
          referrerDomain: "agentrix.top",
          defaultCryptoAmount: 100,
          fiatCurrency: "USD",
          defaultCryptoCurrency: "USDC",
          network: "bsc",
          walletAddress: "0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C"
        }
      }, {
        headers: {
          "Content-Type": "application/json",
          "api-key": PROD_API_KEY
        },
        timeout: 10000
      });
      console.log("Success:", JSON.stringify(resp.data, null, 2));
    } catch (e) {
      console.log("Error:", JSON.stringify(e.response?.data || e.message), "Status:", e.response?.status);
    }
  }
}

testTransakAPI();
