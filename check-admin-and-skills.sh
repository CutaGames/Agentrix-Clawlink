#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Check admin users ==="
$SSH "docker exec agentrix-postgres psql -U paymind -d paymind -c \"SELECT id, email, nickname, role FROM users WHERE role IN ('admin','superadmin') OR email LIKE '%admin%' LIMIT 5;\" 2>&1"

echo ""
echo "=== 2. Check existing skills count ==="
$SSH "docker exec agentrix-postgres psql -U paymind -d paymind -c \"SELECT status, COUNT(*) FROM skills GROUP BY status;\" 2>&1"

echo ""
echo "=== 3. Check existing published skills ==="
$SSH "docker exec agentrix-postgres psql -U paymind -d paymind -c \"SELECT name, display_name, category, layer, status, pricing->>'type' as pricing_type FROM skills WHERE status IN ('published','active') ORDER BY created_at DESC LIMIT 15;\" 2>&1"

echo ""
echo "=== 4. Check skill table columns ==="
$SSH "docker exec agentrix-postgres psql -U paymind -d paymind -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='skills' ORDER BY ordinal_position;\" 2>&1" | head -40

echo ""
echo "=== 5. Check API base URL ==="
$SSH "grep -E 'API_URL|PORT|HOST' /home/ubuntu/Agentrix/backend/.env 2>/dev/null | head -5"
$SSH "curl -s http://localhost:3000/api/health 2>&1 | head -3"
