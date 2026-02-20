#!/bin/bash
ssh -i ~/.ssh/hq.pem -o StrictHostKeyChecking=no ubuntu@18.139.157.116 << 'REMOTE'
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save --force
echo "STARTUP_CONFIGURED"
REMOTE
