#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Check postgres container env ==="
$SSH "docker exec agentrix-postgres env | grep POSTGRES"

echo ""
echo "=== 2. Check backend .env DB config ==="
$SSH "grep -E 'DB_|DATABASE' /home/ubuntu/Agentrix/backend/.env 2>/dev/null | head -10"

echo ""
echo "=== 3. Try with correct user ==="
$SSH "docker exec agentrix-postgres psql -U postgres -d paymind -c \"SELECT id, email, nickname, role FROM users WHERE role IN ('admin','superadmin') OR email LIKE '%admin%' LIMIT 5;\" 2>&1"

echo ""
echo "=== 4. Check existing skills ==="
$SSH "docker exec agentrix-postgres psql -U postgres -d paymind -c \"SELECT status, COUNT(*) FROM skills GROUP BY status;\" 2>&1"

echo ""
echo "=== 5. Check published skills ==="
$SSH "docker exec agentrix-postgres psql -U postgres -d paymind -c \"SELECT name, display_name, category, layer, status FROM skills WHERE status IN ('published','active') ORDER BY created_at DESC LIMIT 10;\" 2>&1"

echo ""
echo "=== 6. Check backend API ==="
$SSH "curl -s http://localhost:3000/api/health 2>&1 | head -3"
