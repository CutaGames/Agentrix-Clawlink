cp backend/agentrix.pem /tmp/agentrix-tmp.pem
chmod 600 /tmp/agentrix-tmp.pem
ssh -o StrictHostKeyChecking=no -i /tmp/agentrix-tmp.pem ubuntu@57.182.89.146 <<'EOF'
docker exec -t agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payee_type VARCHAR;"
docker exec -t agentrix-postgres psql -U agentrix -d paymind -c "ALTER TABLE pay_intents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;"
EOF
rm /tmp/agentrix-tmp.pem
