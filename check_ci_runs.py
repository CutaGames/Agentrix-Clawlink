import json, urllib.request

PAT = "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"
url = "https://api.github.com/repos/CutaGames/Agentrix-Clawlink/actions/runs?per_page=5"
req = urllib.request.Request(url, headers={"Authorization": f"token {PAT}", "Accept": "application/vnd.github+json"})
with urllib.request.urlopen(req) as r:
    d = json.loads(r.read())
for run in d.get("workflow_runs", []):
    print(f"ID={run['id']} | {run['name']} | {run['status']} | {run['conclusion']} | {run['created_at']} | SHA={run['head_sha'][:8]}")
