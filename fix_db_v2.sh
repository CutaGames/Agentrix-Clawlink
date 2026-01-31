#!/bin/bash
ssh -i ~/agentrix.pem ubuntu@57.182.89.146 <<'EOF'
# Fix Commissions table
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payee_type VARCHAR(255) DEFAULT 'developer';"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE commissions ADD COLUMN IF NOT EXISTS agent_type VARCHAR(255);"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE commissions ADD COLUMN IF NOT EXISTS order_id VARCHAR(255);"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);"

# Fix Pay Intents table
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE pay_intents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE pay_intents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE pay_intents ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE pay_intents ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE pay_intents ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE pay_intents ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(255);"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE pay_intents ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255);"

echo "SQL fix applied."
EOF
