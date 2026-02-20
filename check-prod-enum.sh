#!/bin/bash
echo "=== Checking pay_intents.status column type ==="
docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'pay_intents' AND column_name IN ('status', 'type') ORDER BY column_name;"

echo "=== pg_type enum check ==="
docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT typname FROM pg_type WHERE typname LIKE 'pay_intent%';"
