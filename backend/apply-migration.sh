#!/bin/bash
# Apply escrows migration inside postgres container
docker cp /tmp/create-escrows.sql agentrix-postgres:/tmp/create-escrows.sql
docker exec agentrix-postgres sh -c 'psql -U agentrix -d paymind -f /tmp/create-escrows.sql 2>&1'
