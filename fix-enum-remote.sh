#!/bin/bash
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TYPE pay_intents_status_enum ADD VALUE IF NOT EXISTS 'succeeded';"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TYPE pay_intents_status_enum ADD VALUE IF NOT EXISTS 'requires_payment_method';"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TYPE pay_intents_status_enum ADD VALUE IF NOT EXISTS 'processing';"
echo "--- Current enum values ---"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_intents_status_enum') ORDER BY enumsortorder;"
