#!/bin/bash
REPO="/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"
cd "$REPO"
echo "Current branch: $(git branch --show-current)"
# Remove the problematic pem file that blocks checkout  
rm -f agentrix-ssh.pem
git checkout main
echo "Switched to: $(git branch --show-current)"
echo "HEAD: $(git log --oneline -1)"
