f = '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend/components/home/HeroSection.tsx'
lines = open(f).readlines()
open(f, 'w').writelines(lines[:220])
print(f'Done: kept {len(lines[:220])} lines of {len(lines)}')
