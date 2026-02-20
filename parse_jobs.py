import json, subprocess

# Parse jobs
d = json.load(open('/tmp/jobs.json'))
for j in d.get('jobs', []):
    print("JOB:", j['name'], "|", j['conclusion'], "| id=" + str(j['id']))
    for s in j.get('steps', []):
        if s.get('conclusion') in ('failure', 'cancelled', 'skipped'):
            print("  STEP:", s['name'], "->", s['conclusion'])
