#!/usr/bin/env python3
import json

# Create the test JSON file
data = {"messages": [{"role": "user", "content": "hello, say hi back"}]}
with open("/tmp/test.json", "w") as f:
    json.dump(data, f)
print("Created /tmp/test.json:")
print(json.dumps(data))

# Now test the API
import subprocess
result = subprocess.run([
    "curl", "-s", "-X", "POST",
    "http://localhost:3005/api/hq/chat/completion",
    "-H", "Content-Type: application/json",
    "-d", "@/tmp/test.json",
    "--max-time", "90"
], capture_output=True, text=True)
print("\nAPI Response:")
print(result.stdout)
if result.stderr:
    print("Stderr:", result.stderr)
