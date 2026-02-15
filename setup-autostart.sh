#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Setup PM2 startup ==="
$SSH "sudo env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>&1"

echo ""
echo "=== 2. Save current PM2 process list ==="
$SSH "pm2 save 2>&1"

echo ""
echo "=== 3. Ensure docker containers restart on boot ==="
$SSH "docker update --restart unless-stopped agentrix-postgres agentrix-redis 2>&1"

echo ""
echo "=== 4. Verify ==="
$SSH "systemctl is-enabled pm2-ubuntu 2>&1"
$SSH "docker inspect agentrix-postgres --format '{{.HostConfig.RestartPolicy.Name}}' 2>&1"
