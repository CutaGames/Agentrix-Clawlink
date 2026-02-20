#!/bin/bash
# Get production DB creds and run migration
cd /root/Agentrix/backend 2>/dev/null || cd /home/ubuntu/Agentrix/backend 2>/dev/null || true
source .env 2>/dev/null || true
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USERNAME:-agentrix}
DB_PASS=${DB_PASSWORD:-agentrix_secure_2024}
DB_NAME=${DB_DATABASE:-paymind}
echo "Connecting to: $DB_HOST/$DB_NAME as $DB_USER"
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f /tmp/create-escrows.sql 2>&1
