#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"
PSQL="docker exec agentrix-postgres psql -U agentrix -d paymind"

echo "=== 1. Admin users (roles column) ==="
$SSH "$PSQL -c \"SELECT id, email, nickname, roles FROM users WHERE roles::text LIKE '%admin%' OR email LIKE '%admin%' LIMIT 5;\""

echo ""
echo "=== 2. First user (likely admin) ==="
$SSH "$PSQL -c \"SELECT id, email, nickname, roles FROM users ORDER BY created_at ASC LIMIT 3;\""

echo ""
echo "=== 3. Published skills sample ==="
$SSH "$PSQL -c \"SELECT name, display_name, category, layer, ucp_enabled, x402_enabled FROM skills WHERE status='published' ORDER BY call_count DESC LIMIT 10;\""

echo ""
echo "=== 4. Check if commerce skills exist ==="
$SSH "$PSQL -c \"SELECT name, display_name, category FROM skills WHERE category IN ('commerce','payment') AND status='published' ORDER BY name LIMIT 10;\""

echo ""
echo "=== 5. Check featured/recommended skills ==="
$SSH "$PSQL -c \"SELECT column_name FROM information_schema.columns WHERE table_name='skills' AND column_name LIKE '%feat%' OR column_name LIKE '%recommend%' OR column_name LIKE '%prior%' OR column_name LIKE '%hot%';\" 2>&1"

echo ""
echo "=== 6. Check metadata for featured flag ==="
$SSH "$PSQL -c \"SELECT name, metadata FROM skills WHERE metadata::text LIKE '%featured%' OR metadata::text LIKE '%recommend%' LIMIT 3;\""

echo ""
echo "=== 7. Backend main API check ==="
$SSH "pm2 list 2>&1 | grep -E 'backend|frontend'"
$SSH "curl -s http://localhost:3000/api/skills?limit=1 2>&1 | head -3"
