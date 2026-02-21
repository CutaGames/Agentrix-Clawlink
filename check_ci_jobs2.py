import json, urllib.request

PAT = "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"

# Get jobs for run 22243323806 (Build → Test → Release APK failure)
url = "https://api.github.com/repos/CutaGames/Agentrix-Clawlink/actions/runs/22243323806/jobs"
req = urllib.request.Request(url, headers={"Authorization": f"token {PAT}", "Accept": "application/vnd.github+json"})
with urllib.request.urlopen(req) as r:
    d = json.loads(r.read())

for job in d.get("jobs", []):
    print(f"\nJOB: {job['name']} | {job['conclusion']}")
    for step in job.get("steps", []):
        status = step.get("conclusion", step.get("status", ""))
        print(f"  [{status}] {step['name']}")
        if status in ("failure", "cancelled"):
            break
