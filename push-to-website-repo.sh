#!/bin/bash
set -e
REPO=/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website
cd "$REPO"

echo "=== Current state ==="
echo "Branch: $(git branch --show-current)"
echo "HEAD: $(git log --oneline -1)"

# Ensure agentrix-web remote exists
if ! git remote | grep -q agentrix-web; then
  git remote add agentrix-web "https://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@github.com/CutaGames/Agentrix.git"
  echo "Remote agentrix-web added"
else
  echo "Remote agentrix-web already exists"
fi

# Fetch latest from website repo
echo "=== Fetching agentrix-web ==="
git fetch agentrix-web

# Create/reset a branch from agentrix-web/main
echo "=== Setting up website-update branch ==="
git checkout -B website-update-20260221 agentrix-web/main

# Apply the changed frontend files from our main branch
echo "=== Applying frontend changes ==="
git checkout main -- \
  frontend/components/home/CTASection.tsx \
  frontend/components/home/ClawSection.tsx \
  frontend/components/home/DownloadSection.tsx \
  frontend/components/home/FeaturesSection.tsx \
  frontend/components/home/HeroSection.tsx \
  frontend/components/home/MarketplaceShowcaseSection.tsx \
  frontend/components/layout/Footer.tsx \
  frontend/components/ui/Navigation.tsx \
  frontend/pages/claw.tsx \
  frontend/pages/index.tsx \
  frontend/components/agent/StructuredResponseCard.tsx

echo "=== Staged changes ==="
git diff --cached --stat

# Commit
echo "=== Committing ==="
git commit -m "feat: website optimization - AI Agent OS positioning + Claw product page

- HeroSection: 10GB promo banner, 3 deploy modes (Cloud/Local/BYOC), phone mockup
- ClawSection: deploy mode cards + storage tier strip (10/40/100 GB)
- MarketplaceShowcaseSection: 5200+ skills grid, X402 badge
- DownloadSection: 3 platform cards with 10GB promo
- CTASection: violet/cyan gradient redesign
- Footer: Download Claw column, AI Agent OS tagline
- Navigation: Agentrix Claw nav item (NEW badge), Download Claw CTA
- FeaturesSection: Claw Agent Deploy + Skills Marketplace cards
- /claw product page: full feature showcase + storage plans
- Fix: StructuredResponseCard duplicate state + getOrders param error"

# Push to CutaGames/Agentrix main
echo "=== Pushing to CutaGames/Agentrix ==="
git push agentrix-web website-update-20260221:main

echo "=== DONE - Switching back to main ==="
git checkout main
