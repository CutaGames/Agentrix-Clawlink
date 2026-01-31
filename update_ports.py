import sys
p = 'Agentrix/docker-compose.prod.yml'
with open(p, 'r') as f:
    c = f.read()
if '8080:8080' not in c:
    c = c.replace('- "443:443"', '- "443:443"\n      - "8080:8080"')
    with open(p, 'w') as f:
        f.write(c)
