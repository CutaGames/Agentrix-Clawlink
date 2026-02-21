#!/bin/bash
REPO="/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"
cd "$REPO"

# Remove stale lock if it exists
rm -f .git/index.lock

echo "Current branch: $(git branch --show-current)"

# We need to get back to main - the two branches have very different trees
# Strategy: reset hard to the main branch commit directly
MAIN_SHA=$(git rev-parse origin/main)
echo "Main SHA: $MAIN_SHA"

# Detach HEAD, then switch to main
git checkout --detach HEAD
git checkout -f main

echo "Now on: $(git branch --show-current)"
echo "HEAD: $(git log --oneline -1)"
