#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"
PSQL="docker exec agentrix-postgres psql -U agentrix -d paymind"

echo "=== 1. Admin users ==="
$SSH "$PSQL -c \"SELECT id, email, nickname, role FROM users WHERE role IN ('admin','superadmin') OR email LIKE '%admin%' LIMIT 5;\""

echo ""
echo "=== 2. Skills count by status ==="
$SSH "$PSQL -c \"SELECT status, COUNT(*) FROM skills GROUP BY status;\""

echo ""
echo "=== 3. Published/active skills ==="
$SSH "$PSQL -c \"SELECT name, display_name, category, layer, status FROM skills WHERE status IN ('published','active') ORDER BY created_at DESC LIMIT 10;\""

echo ""
echo "=== 4. Backend API health ==="
$SSH "curl -s http://localhost:3000/api/health 2>&1 | head -5"
$SSH "curl -s http://localhost:3000/api/skills?limit=2 2>&1 | head -5"
