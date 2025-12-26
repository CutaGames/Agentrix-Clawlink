const axios = require('axios');

async function test() {
  const apiKey = '7f03deb8-ee24-49b3-a919-31e7d9244030';
  const baseUrl = 'https://api.transak.com/api/v2/currencies/price';
  
  const params = {
    fiatCurrency: 'USD',
    cryptoCurrency: 'ETH',
    fiatAmount: 100,
    isSourceAmount: true,
    paymentMethod: 'credit_debit_card',
    network: 'ethereum',
    partnerAPIKey: apiKey
  };

  console.log(`Testing with params: ${JSON.stringify(params)}`);
  try {
    const response = await axios.get(baseUrl, { params });
    console.log('Success!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`Error: ${error.response?.status}`);
    console.log(JSON.stringify(error.response?.data, null, 2));
  }
}

test();
