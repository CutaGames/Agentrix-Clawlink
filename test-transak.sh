apiKey='7f03deb8-ee24-49b3-a919-31e7d9244030'
baseUrl='https://api.transak.com/api/v2/currencies/price'

test_params() {
  echo "Testing with: $1"
  curl -s -X GET "$baseUrl?$1" -H "apiKey: $apiKey"
  echo -e "\n"
}

test_params "fiatCurrency=USD&cryptoCurrency=ETH&fiatAmount=100&isSourceAmount=true&partnerApiKey=$apiKey"
test_params "fiatCurrency=USD&cryptoCurrency=ETH&fiatAmount=100&isSourceAmount=true&partnerAPIKey=$apiKey"
curl -s -X GET "https://api.transak.com/api/v1/pricing/public/quotes?fiatCurrency=USD&cryptoCurrency=ETH&fiatAmount=100&partnerApiKey=$apiKey" -H "apiKey: $apiKey"
