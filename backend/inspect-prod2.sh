#!/bin/bash
echo "=== Docker compose yml ==="
cat /home/ubuntu/Agentrix/docker-compose.prod.yml | head -80
echo "=== Backend dir ==="
ls /home/ubuntu/Agentrix/backend/ | head -20
