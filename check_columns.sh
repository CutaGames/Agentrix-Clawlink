#!/bin/bash
ssh -i ~/agentrix.pem ubuntu@57.182.89.146 <<'EOF'
echo "--- Commissions Columns ---"
docker exec agentrix-postgres psql -U agentrix -d paymind -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'commissions';"
echo "--- Pay Intents Columns ---"
docker exec agentrix-postgres psql -U agentrix -d paymind -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'pay_intents';"
EOF
