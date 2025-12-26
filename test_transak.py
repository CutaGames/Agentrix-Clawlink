import requests

api_key = '7f03deb8-ee24-49b3-a919-31e7d9244030'
base_url = 'https://api.transak.com/api/v2/currencies/price'

params_list = [
    {'fiatCurrency': 'USD', 'cryptoCurrency': 'ETH', 'fiatAmount': 100, 'network': 'ethereum', 'isSourceAmount': 'true', 'partnerAPIKey': api_key},
    {'fiatCurrency': 'USD', 'cryptoCurrency': 'ETH', 'fiatAmount': 100, 'network': 'ethereum', 'isSourceAmount': 'true', 'partnerApiKey': api_key},
    {'fiatCurrency': 'USD', 'cryptoCurrency': 'ETH', 'fiatAmount': 100, 'network': 'ethereum', 'isSourceAmount': 'true'},
    {'fiatCurrency': 'USD', 'cryptoCurrency': 'ETH', 'fiatAmount': 100, 'isBuyOrSell': 'BUY', 'partnerAPIKey': api_key},
]

for params in params_list:
    print(f"Testing with: {params}")
    try:
        response = requests.get(base_url, params=params, headers={'apiKey': api_key})
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
