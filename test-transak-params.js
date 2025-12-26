const axios = require('axios');

const apiKey = '7f03deb8-ee24-49b3-a919-31e7d9244030';
const baseUrl = 'https://api.transak.com';

async function testParams(params, label) {
    console.log(`\n--- Testing: ${label} ---`);
    console.log(`Params: ${JSON.stringify(params)}`);
    try {
        const response = await axios.get(`${baseUrl}/api/v2/currencies/price`, {
            params,
            timeout: 10000
        });
        console.log(`Success! Status: ${response.status}`);
        console.log(`Data: ${JSON.stringify(response.data).substring(0, 200)}...`);
    } catch (error) {
        if (error.response) {
            console.log(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        } else {
            console.log(`Error: ${error.message}`);
        }
    }
}

async function runTests() {
    // Test 1: Current implementation
    await testParams({
        fiatCurrency: 'USD',
        cryptoCurrency: 'ETH',
        fiatAmount: 100,
        isSourceAmount: true,
        partnerAPIKey: apiKey,
        network: 'ethereum'
    }, 'Current Implementation');

    // Test 2: Try isBuyOrSell
    await testParams({
        fiatCurrency: 'USD',
        cryptoCurrency: 'ETH',
        fiatAmount: 100,
        isSourceAmount: true,
        partnerAPIKey: apiKey,
        network: 'ethereum',
        isBuyOrSell: 'BUY'
    }, 'With isBuyOrSell=BUY');

    // Test 3: Try paymentMethod
    await testParams({
        fiatCurrency: 'USD',
        cryptoCurrency: 'ETH',
        fiatAmount: 100,
        isSourceAmount: true,
        partnerAPIKey: apiKey,
        network: 'ethereum',
        paymentMethod: 'credit_debit_card'
    }, 'With paymentMethod');

    // Test 4: Try different parameter names
    await testParams({
        fiatCurrencyCode: 'USD',
        cryptoCurrencyCode: 'ETH',
        fiatAmount: 100,
        isSourceAmount: true,
        partnerAPIKey: apiKey,
        network: 'ethereum'
    }, 'With CurrencyCode suffix');
}

runTests();
