const axios = require('axios');

const apiKey = '7f03deb8-ee24-49b3-a919-31e7d9244030';
const baseUrl = 'https://api.transak.com/api/v2/currencies/price';

async function test() {
  const combinations = [
    { fiatCurrency: 'USD', cryptoCurrency: 'ETH', fiatAmount: 100, network: 'ethereum', isSourceAmount: true },
    { fiatCurrencyCode: 'USD', cryptoCurrencyCode: 'ETH', fiatAmount: 100, network: 'ethereum', isSourceAmount: true },
    { fiatCurrency: 'USD', cryptoCurrency: 'ETH', fiatAmount: 100, network: 'ethereum' },
    { fiatCurrency: 'USD', cryptoCurrency: 'ETH', fiatAmount: 100, isBuyOrSell: 'BUY' },
    { fiatCurrency: 'USD', cryptoCurrency: 'ETH', fiatAmount: 100, network: 'ethereum', partnerAPIKey: apiKey },
    { fiatCurrency: 'USD', cryptoCurrency: 'ETH', fiatAmount: 100, network: 'ethereum', apiKey: apiKey },
  ];

  for (const params of combinations) {
    console.log(`Testing with params: ${JSON.stringify(params)}`);
    try {
      const response = await axios.get(baseUrl, { 
        params,
        headers: { 'apiKey': apiKey }
      });
      console.log('Success:', response.data);
      return;
    } catch (error) {
      console.log('Error:', error.response?.status, error.response?.data || error.message);
    }
  }
}

test();
