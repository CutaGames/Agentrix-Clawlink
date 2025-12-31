const axios = require("axios");

async function testTransakAPI() {
  // 使用生产环境的 API Key 测试
  const PROD_API_KEY = "9262fe4c-3fe6-42a9-8aad-22b360f01f16";
  
  console.log("=== Test PRODUCTION API with PROD Key ===");
  const data1 = {
    widgetParams: {
      referrerDomain: "agentrix.top"
    }
  };
  
  try {
    const r1 = await axios.post("https://api.transak.com/auth/public/v2/session", data1, {
      headers: {
        "Content-Type": "application/json",
        "api-key": PROD_API_KEY
      }
    });
    console.log("Success:", JSON.stringify(r1.data, null, 2));
  } catch (e) {
    console.log("Error:", JSON.stringify(e.response?.data || e.message));
    console.log("Status:", e.response?.status);
  }

  // 测试 staging 使用 api-key header（不带 access-token）
  console.log("\n=== Test STAGING with api-key (staging key) ===");
  const STAGING_API_KEY = "7f03deb8-ee24-49b3-a919-31e7d9244030";
  try {
    const r2 = await axios.post("https://api-stg.transak.com/auth/public/v2/session", data1, {
      headers: {
        "Content-Type": "application/json",
        "api-key": STAGING_API_KEY
      },
      timeout: 10000
    });
    console.log("Success:", JSON.stringify(r2.data, null, 2));
  } catch (e) {
    console.log("Error:", JSON.stringify(e.response?.data || e.message));
    console.log("Status:", e.response?.status);
  }

  // 测试获取 access token 的 endpoint
  console.log("\n=== Test Token Endpoint ===");
  try {
    const tokenResp = await axios.post("https://api.transak.com/auth/v2/token", {}, {
      headers: {
        "Content-Type": "application/json",
        "api-key": PROD_API_KEY
      },
      timeout: 10000
    });
    console.log("Token Success:", JSON.stringify(tokenResp.data, null, 2));
  } catch (e) {
    console.log("Token Error:", JSON.stringify(e.response?.data || e.message));
    console.log("Status:", e.response?.status);
  }
}

testTransakAPI();
