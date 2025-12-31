const axios = require("axios");

async function testTransakAPI() {
  // Test 1: Current implementation format
  console.log("=== Test 1: Current implementation format ===");
  const data1 = {
    widgetParams: {
      cryptoAmount: "100",
      fiatCurrency: "USD",
      cryptoCurrencyCode: "USDC",
      network: "bsc",
      walletAddress: "0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C",
      referrerDomain: "agentrix.top"
    }
  };
  
  try {
    const r1 = await axios.post("https://api-stg.transak.com/auth/public/v2/session", data1, {
      headers: {
        "Content-Type": "application/json",
        "api-key": "7f03deb8-ee24-49b3-a919-31e7d9244030"
      }
    });
    console.log("Success:", JSON.stringify(r1.data, null, 2));
  } catch (e) {
    console.log("Error:", JSON.stringify(e.response?.data || e.message));
  }

  // Test 2: Different parameter names
  console.log("\n=== Test 2: defaultCryptoAmount format ===");
  const data2 = {
    widgetParams: {
      defaultCryptoAmount: 100,
      fiatCurrency: "USD",
      defaultCryptoCurrency: "USDC",
      network: "bsc",
      walletAddress: "0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C",
      referrerDomain: "agentrix.top"
    }
  };
  
  try {
    const r2 = await axios.post("https://api-stg.transak.com/auth/public/v2/session", data2, {
      headers: {
        "Content-Type": "application/json",
        "api-key": "7f03deb8-ee24-49b3-a919-31e7d9244030"
      }
    });
    console.log("Success:", JSON.stringify(r2.data, null, 2));
  } catch (e) {
    console.log("Error:", JSON.stringify(e.response?.data || e.message));
  }

  // Test 3: Minimal params
  console.log("\n=== Test 3: Minimal params ===");
  const data3 = {
    widgetParams: {
      referrerDomain: "agentrix.top"
    }
  };
  
  try {
    const r3 = await axios.post("https://api-stg.transak.com/auth/public/v2/session", data3, {
      headers: {
        "Content-Type": "application/json",
        "api-key": "7f03deb8-ee24-49b3-a919-31e7d9244030"
      }
    });
    console.log("Success:", JSON.stringify(r3.data, null, 2));
  } catch (e) {
    console.log("Error:", JSON.stringify(e.response?.data || e.message));
  }

  // Test 4: Empty widgetParams
  console.log("\n=== Test 4: Empty widgetParams ===");
  const data4 = {
    widgetParams: {}
  };
  
  try {
    const r4 = await axios.post("https://api-stg.transak.com/auth/public/v2/session", data4, {
      headers: {
        "Content-Type": "application/json",
        "api-key": "7f03deb8-ee24-49b3-a919-31e7d9244030"
      }
    });
    console.log("Success:", JSON.stringify(r4.data, null, 2));
  } catch (e) {
    console.log("Error:", JSON.stringify(e.response?.data || e.message));
  }
}

testTransakAPI();
