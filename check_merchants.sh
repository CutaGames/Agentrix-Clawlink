#!/bin/bash
ssh -i ~/agentrix.pem ubuntu@57.182.89.146 <<'EOF'
echo "Tables list:"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "\dt"
echo "Merchants check (trying merchant):"
docker exec agentrix-postgres psql -U agentrix -d paymind -c "SELECT count(*) FROM merchant;"
EOF
