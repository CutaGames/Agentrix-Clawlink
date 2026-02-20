#!/bin/bash
docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT table_name FROM information_schema.tables WHERE table_name='escrows'"
