#!/bin/bash
cd /root/Agentrix/backend

echo "Setting DB_SYNC=true..."
sed -i 's/DB_SYNC=false/DB_SYNC=true/' .env

echo "Installing dependencies..."
npm install

echo "Building backend..."
npm run build

echo "Restarting backend to sync schema..."
# Assuming PM2 is used, if not, we might need to find the process
pm2 restart all || npm run start:dev &
sleep 20 # Wait for schema sync

echo "Running seed scripts..."
npm run seed:marketplace
npm run seed:products

echo "Setting DB_SYNC=false..."
sed -i 's/DB_SYNC=true/DB_SYNC=false/' .env

echo "Final restart..."
pm2 restart all || npm run start:dev &

echo "Done!"
