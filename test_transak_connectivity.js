const axios = require('axios');

async function test() {
  const urls = [
    'https://api.transak.com/api/v2/currencies/price',
    'https://api.transak.com/v2/currencies/price',
    'https://api.transak.com/auth/public/v2/session',
    'https://api-gateway.transak.com/api/v2/auth/token'
  ];

  for (const url of urls) {
    console.log(`Testing ${url}...`);
    try {
      const response = await axios.get(url, { timeout: 5000 });
      console.log(`  Success! Status: ${response.status}`);
    } catch (error) {
      console.log(`  Error: ${error.response?.status || error.message}`);
    }
  }
}

test();
