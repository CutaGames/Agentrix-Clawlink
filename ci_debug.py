import json, subprocess, sys, urllib.request

TOKEN = "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"
REPO = "CutaGames/Agentrix-Clawlink"

def api(path):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/{path}",
        headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github.v3+json"}
    )
    return json.load(urllib.request.urlopen(req))

# Get latest run
runs = api("actions/runs?per_page=1")["workflow_runs"]
run = runs[0]
print(f"Run #{run['run_number']} | {run['conclusion']} | id={run['id']}")

# Get jobs
jobs = api(f"actions/runs/{run['id']}/jobs")["jobs"]
for j in jobs:
    print(f"\nJOB: {j['name']} | {j['conclusion']} | id={j['id']}")
    for s in j.get("steps", []):
        status = s.get("conclusion", "?")
        if status in ("failure", "cancelled"):
            print(f"  ❌ FAILED STEP: {s['name']}")
        elif status == "skipped":
            print(f"  ⏭  SKIPPED: {s['name']}")

# Download log of first failed job
failed_jobs = [j for j in jobs if j.get("conclusion") == "failure"]
if failed_jobs:
    jid = failed_jobs[0]["id"]
    print(f"\n=== LOG for job {jid} ===")
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/actions/jobs/{jid}/logs",
        headers={"Authorization": f"Bearer {TOKEN}"}
    )
    try:
        import subprocess
        result = subprocess.run(
            ["curl", "-sL", "-H", f"Authorization: Bearer {TOKEN}",
             f"https://api.github.com/repos/{REPO}/actions/jobs/{jid}/logs"],
            capture_output=True, text=True
        )
        log = result.stdout
        lines = log.splitlines()
        # Find the error region
        error_start = 0
        for i, line in enumerate(lines):
            if "FAILED" in line or "error" in line.lower() or "Error" in line or "exception" in line.lower():
                error_start = max(0, i - 5)
                break
        print(f"Total log lines: {len(lines)}")
        print("--- LAST 120 LINES ---")
        for line in lines[-120:]:
            print(line)
    except Exception as e:
        print(f"Could not fetch log: {e}")
