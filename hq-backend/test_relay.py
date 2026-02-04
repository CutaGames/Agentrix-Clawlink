import requests
import sys

url = "http://57.182.89.146:8080/api/hq/chat/completion"
payload = {
    "messages": [{"role": "user", "content": "Hello, are you there?"}],
    "options": {"provider": "bedrock-haiku"}
}

print(f"Testing relay: {url}")
try:
    response = requests.post(url, json=payload, timeout=30)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
