const axios = require("axios");

async function testTransakAPI() {
  // Test with PRODUCTION API instead of STAGING
  console.log("=== Test PRODUCTION API ===");
  const data1 = {
    widgetParams: {
      referrerDomain: "agentrix.top"
    }
  };
  
  try {
    const r1 = await axios.post("https://api.transak.com/auth/public/v2/session", data1, {
      headers: {
        "Content-Type": "application/json",
        "api-key": "7f03deb8-ee24-49b3-a919-31e7d9244030"
      }
    });
    console.log("Success:", JSON.stringify(r1.data, null, 2));
  } catch (e) {
    console.log("Error:", JSON.stringify(e.response?.data || e.message));
    console.log("Status:", e.response?.status);
  }

  // Test staging with access-token header instead of api-key
  console.log("\n=== Test STAGING with access-token header ===");
  try {
    const r2 = await axios.post("https://api-stg.transak.com/auth/public/v2/session", data1, {
      headers: {
        "Content-Type": "application/json",
        "access-token": "7f03deb8-ee24-49b3-a919-31e7d9244030"
      }
    });
    console.log("Success:", JSON.stringify(r2.data, null, 2));
  } catch (e) {
    console.log("Error:", JSON.stringify(e.response?.data || e.message));
    console.log("Status:", e.response?.status);
  }

  // Check current environment variables
  console.log("\n=== Environment Check ===");
  const env = require("fs").readFileSync("/var/www/agentrix-website/backend/.env", "utf8");
  const transakLines = env.split("\n").filter(l => l.includes("TRANSAK"));
  transakLines.forEach(l => {
    // Mask sensitive data
    if (l.includes("SECRET")) {
      console.log(l.split("=")[0] + "=***MASKED***");
    } else {
      console.log(l);
    }
  });
}

testTransakAPI();
