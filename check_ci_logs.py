import json, urllib.request

PAT = "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"

# Get jobs for run 22234912633
url = "https://api.github.com/repos/CutaGames/Agentrix-Clawlink/actions/runs/22234912633/jobs"
req = urllib.request.Request(url, headers={"Authorization": f"token {PAT}", "Accept": "application/vnd.github+json"})
with urllib.request.urlopen(req) as r:
    d = json.loads(r.read())

job_id = d["jobs"][0]["id"]
print(f"Job ID: {job_id}")

# Get logs
log_url = f"https://api.github.com/repos/CutaGames/Agentrix-Clawlink/actions/jobs/{job_id}/logs"
req2 = urllib.request.Request(log_url, headers={"Authorization": f"token {PAT}", "Accept": "application/vnd.github+json"})
try:
    with urllib.request.urlopen(req2) as r:
        logs = r.read().decode("utf-8", errors="replace")
    # Show last 100 lines
    lines = logs.splitlines()
    print(f"\nTotal log lines: {len(lines)}")
    print("--- LAST 80 LINES ---")
    for line in lines[-80:]:
        print(line)
except Exception as e:
    print(f"Log fetch error: {e}")
