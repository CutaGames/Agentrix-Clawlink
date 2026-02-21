import json, urllib.request

PAT = "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"

# Get the package.json from the successful commit fa78351b
url = "https://api.github.com/repos/CutaGames/Agentrix-Clawlink/contents/package.json?ref=fa78351b9cab52788a9f02e0513c552bcfa55ba9"
req = urllib.request.Request(url, headers={"Authorization": f"token {PAT}", "Accept": "application/vnd.github+json"})
with urllib.request.urlopen(req) as r:
    d = json.loads(r.read())

import base64
content = base64.b64decode(d["content"]).decode("utf-8")
pkg = json.loads(content)
deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
expo_deps = {k: v for k, v in deps.items() if "expo" in k.lower()}
for k, v in sorted(expo_deps.items()):
    print(f"{k}: {v}")
