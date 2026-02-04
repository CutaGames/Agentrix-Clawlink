#!/bin/bash
cd /home/ubuntu/Agentrix
# Remove existing ports if any to avoid duplicates
sudo sed -i '/ports:/d' docker-compose.prod.yml
sudo sed -i '/- "5432:5432"/d' docker-compose.prod.yml
# Add ports section after container_name
sudo sed -i '/container_name: agentrix-postgres/a \    ports:\n      - "5432:5432"' docker-compose.prod.yml
# Restart service
sudo docker compose -f docker-compose.prod.yml up -d postgres
echo "Postgres exposed to host."
