#!/bin/bash
sudo -u postgres psql -d paymind -c "ALTER TYPE pay_intents_status_enum ADD VALUE IF NOT EXISTS 'succeeded';"
sudo -u postgres psql -d paymind -c "ALTER TYPE pay_intents_status_enum ADD VALUE IF NOT EXISTS 'requires_payment_method';"
sudo -u postgres psql -d paymind -c "ALTER TYPE pay_intents_status_enum ADD VALUE IF NOT EXISTS 'processing';"
echo "=== Updated enum values ==="
PGPASSWORD='agentrix_secure_2024' psql -h 127.0.0.1 -U agentrix -d paymind -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pay_intents_status_enum') ORDER BY enumsortorder;"
