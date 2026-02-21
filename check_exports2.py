import re
files = [
    '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend/components/home/CTASection.tsx',
    '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend/components/ui/Navigation.tsx',
    '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend/pages/index.tsx',
    '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend/pages/claw.tsx',
]
for f in files:
    try:
        txt = open(f).read()
        matches = re.findall(r'export (?:default )?function \w+', txt)
        dups = [x for x in matches if matches.count(x) > 1]
        lines = len(txt.splitlines())
        print(f.split('/')[-1], f'({lines} lines) -> exports: {matches}' + (f' DUPLICATES: {dups}' if dups else ''))
    except Exception as e:
        print(f.split('/')[-1], 'ERROR:', e)
