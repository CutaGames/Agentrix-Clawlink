#!/bin/bash
# =================================================================
# Agentrix HQ Independent Deployment Script - Japan Server v2.0
# IP: 57.182.89.146 | Target: Independent host-based PM2 deployment
# =================================================================

set -e # Exit on error

# Configuration
IP="57.182.89.146"
USER="ubuntu"
# Copy key to local temp to fix permissions
LOCAL_KEY="/tmp/agentrix_$(date +%s).pem"
cp "/mnt/c/Users/15279/Desktop/agentrix.pem" $LOCAL_KEY
chmod 400 $LOCAL_KEY
KEY=$LOCAL_KEY
REMOTE_DIR="~/Agentrix-independent-HQ"

echo "----------------------------------------------------"
echo "🚀 Starting Deployment to Japan Server ($IP)"
echo "----------------------------------------------------"

# 1. Local Build Stage
echo "📦 Step 1: Building hq-backend..."
cd hq-backend
npm install
npm run build
cd ..

echo "📦 Step 2: Building hq-console..."
cd hq-console
npm install
npm run build
cd ..

# 2. Package Stage
echo "📦 Step 3: Packaging build artifacts..."
# We include dist, .next/standalone + .next/static
tar -czf hq_deploy_pkg.tar.gz \
    hq-backend/dist hq-backend/package.json hq-backend/.env \
    hq-console/.next/standalone hq-console/.next/static hq-console/package.json hq-console/next.config.js

# 3. Transmission Stage
echo "📤 Step 4: Uploading package to server..."
scp -i "$KEY" -o StrictHostKeyChecking=no hq_deploy_pkg.tar.gz $USER@$IP:~/

# 4. Remote Deployment Stage
echo "🛠️ Step 5: Remote initialization and execution..."
ssh -i "$KEY" -o StrictHostKeyChecking=no $USER@$IP << 'EOF'
    set -e
    REMOTE_DIR="/home/ubuntu/Agentrix-independent-HQ"
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi

    # Check for PM2
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        sudo npm install -g pm2
    fi

    # Stop and remove conflicting containers as requested
    echo "🗑️ Removing old HQ instances to free up resources..."
    sudo docker rm -f agentrix-hq agentrix-hq-pilot 2>/dev/null || true
    
    # Prepare directories
    mkdir -p $REMOTE_DIR/hq-console/.next/static
    echo "Extracting package..."
    tar -xzf ~/hq_deploy_pkg.tar.gz -C $REMOTE_DIR --strip-components=0
    
    # ----------------------------------------------------
    # Setup Backend
    # ----------------------------------------------------
    echo "⚙️ Configuring hq-backend..."
    cd $REMOTE_DIR/hq-backend
    npm install --omit=dev
    
    # Production Environment Polish
    # 1. Sync DB credentials from main .env
    if [ -f ~/Agentrix/.env ]; then
        echo "Syncing database credentials from existing environment..."
        DB_USER=$(grep "^DB_USERNAME=" ~/Agentrix/.env | head -n 1 | cut -d'=' -f2 | tr -d "\r")
        DB_PWD=$(grep "^DB_PASSWORD=" ~/Agentrix/.env | head -n 1 | cut -d'=' -f2 | tr -d "\r")
        DB_NAME=$(grep "^DB_DATABASE=" ~/Agentrix/.env | head -n 1 | cut -d'=' -f2 | tr -d "\r")
        
        echo "Updating local .env with: User=$DB_USER, DB=$DB_NAME"
        sed -i "s/HQ_DB_USERNAME=.*/HQ_DB_USERNAME=$DB_USER/" .env
        sed -i "s/HQ_DB_PASSWORD=.*/HQ_DB_PASSWORD=$DB_PWD/" .env
        sed -i "s/HQ_DB_DATABASE=.*/HQ_DB_DATABASE=$DB_NAME/" .env
    fi
    # 2. Add DB Sync for initialization
    sed -i "s/DB_SYNC=.*/DB_SYNC=true/" .env
    # 3. Ensure port matches
    sed -i 's/HQ_PORT=3005/HQ_PORT=3005/' .env
    
    # Start Backend with PM2 (Independent process)
    echo "🏁 Starting hq-backend..."
    pm2 delete hq-backend 2>/dev/null || true
    pm2 start dist/main.js --name hq-backend --env PORT=3005
    
    # ----------------------------------------------------
    # Setup Console (Frontend - Standalone Mode)
    # ----------------------------------------------------
    echo "⚙️ Configuring hq-console (Standalone Mode)..."
    cd $REMOTE_DIR/hq-console
    
    # Standalone mode doesn't need full npm install, but we need the static files in the right place
    # The package has .next/standalone and .next/static
    cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
    
    echo "🏁 Starting hq-console..."
    pm2 delete hq-console 2>/dev/null || true
    PORT=4000 pm2 start .next/standalone/server.js --name hq-console
    
    pm2 save
    
    echo "----------------------------------------------------"
    echo "✅ DEPLOYMENT COMPLETE!"
    echo "Backend: http://$IP:3005/api/health"
    echo "Console: http://$IP:4000"
    echo "----------------------------------------------------"
EOF

# Cleanup
rm hq_deploy_pkg.tar.gz
echo "🧹 Local cleanup done."
