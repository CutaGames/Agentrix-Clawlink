#!/bin/bash
echo "=== pay_intents status column type ==="
docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'pay_intents' AND column_name = 'status';"

echo "=== All enum types in DB ==="
docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;"

echo "=== pay_intents table exists? ==="
docker exec agentrix-postgres psql -U agentrix -d paymind -c "\dt pay_intents"

echo "=== pay_intents status check constraint ==="
docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'pay_intents'::regclass AND contype = 'c';"
