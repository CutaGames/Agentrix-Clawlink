import re, glob
base = '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend/components/home/'
for f in ['CTASection.tsx','ClawSection.tsx','MarketplaceShowcaseSection.tsx','DownloadSection.tsx']:
    txt = open(base+f).read()
    matches = re.findall(r'export function \w+', txt)
    print(f, '->', matches)
