#!/bin/bash
# ============================================
# Deploy Agentrix Backend to Tokyo Server
# Server: 57.182.89.146
# ============================================

set -e

SERVER="57.182.89.146"
SSH_USER="ubuntu"
PEM_FILE="/mnt/c/Users/15279/Desktop/agentrix.pem"
REMOTE_DIR="/home/ubuntu/Agentrix-website"
SSH_CMD="ssh -i $PEM_FILE -o StrictHostKeyChecking=no -o ConnectTimeout=15 $SSH_USER@$SERVER"
SCP_CMD="scp -i $PEM_FILE -o StrictHostKeyChecking=no"

echo "=========================================="
echo "  Agentrix Backend Deploy to Tokyo"
echo "=========================================="

# 1. Test SSH connection
echo "[1/6] Testing SSH connection..."
$SSH_CMD "echo 'SSH connection OK'" || { echo "ERROR: Cannot connect to $SERVER"; exit 1; }

# 2. Check if Docker is installed
echo "[2/6] Checking Docker..."
$SSH_CMD "docker --version && docker compose version" || {
    echo "Installing Docker..."
    $SSH_CMD "curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker ubuntu"
    echo "Docker installed. Please re-run this script."
    exit 1
}

# 3. Create remote directory structure
echo "[3/6] Setting up remote directory..."
$SSH_CMD "mkdir -p $REMOTE_DIR/nginx"

# 4. Sync files to server (backend, docker-compose, nginx, .env)
echo "[4/6] Syncing files to server..."

# Sync backend source
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    -e "ssh -i $PEM_FILE -o StrictHostKeyChecking=no" \
    /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend/ \
    $SSH_USER@$SERVER:$REMOTE_DIR/backend/

# Sync frontend source
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    -e "ssh -i $PEM_FILE -o StrictHostKeyChecking=no" \
    /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend/ \
    $SSH_USER@$SERVER:$REMOTE_DIR/frontend/

# Sync nginx config
rsync -avz \
    -e "ssh -i $PEM_FILE -o StrictHostKeyChecking=no" \
    /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/nginx/ \
    $SSH_USER@$SERVER:$REMOTE_DIR/nginx/

# Sync docker-compose
$SCP_CMD /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/docker-compose.prod.yml \
    $SSH_USER@$SERVER:$REMOTE_DIR/docker-compose.prod.yml

# Sync .env (backend config with OAuth credentials)
$SCP_CMD /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend/.env \
    $SSH_USER@$SERVER:$REMOTE_DIR/.env

# Also copy .env to backend dir for local reference
$SCP_CMD /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend/.env \
    $SSH_USER@$SERVER:$REMOTE_DIR/backend/.env

# 5. Build and start services
echo "[5/6] Building and starting services..."
$SSH_CMD << 'REMOTE_SCRIPT'
cd /home/ubuntu/Agentrix-website

# Stop existing containers if any
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start
docker compose -f docker-compose.prod.yml up -d --build backend postgres redis nginx

# Wait for backend to be healthy
echo "Waiting for backend to start..."
for i in {1..30}; do
    if docker exec agentrix-backend wget -q --spider http://localhost:3001/api/health 2>/dev/null; then
        echo "Backend is healthy!"
        break
    fi
    echo "  Waiting... ($i/30)"
    sleep 5
done

# Show status
docker compose -f docker-compose.prod.yml ps
REMOTE_SCRIPT

# 6. Verify deployment
echo "[6/6] Verifying deployment..."
echo ""
echo "Testing backend health..."
curl -s --connect-timeout 10 http://$SERVER:3001/api/health 2>/dev/null && echo "" || echo "Direct port test failed (may be behind nginx)"
echo ""
echo "Testing via nginx..."
curl -s --connect-timeout 10 http://$SERVER/api/health 2>/dev/null && echo "" || echo "Nginx test pending"

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Backend URL: http://$SERVER/api"
echo ""
echo "IMPORTANT: You need to update DNS for api.agentrix.top"
echo "  to point to $SERVER (currently points to another server)"
echo ""
echo "Or update mobile app API URL to: http://$SERVER/api"
echo ""
echo "OAuth Redirect URIs to configure:"
echo "  Google:  https://api.agentrix.top/api/auth/mobile/google/callback"
echo "  Twitter: https://api.agentrix.top/api/auth/mobile/twitter/callback"
echo "  Discord: https://api.agentrix.top/api/auth/mobile/discord/callback"
echo ""
