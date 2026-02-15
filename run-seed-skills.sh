#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"

echo "=== 1. Upload SQL file ==="
scp -i "$PEM" -o StrictHostKeyChecking=no /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/scripts/seed-official-skills.sql ubuntu@57.182.89.146:/tmp/seed-official-skills.sql

echo ""
echo "=== 2. Copy SQL into container ==="
$SSH "docker cp /tmp/seed-official-skills.sql agentrix-postgres:/tmp/seed-official-skills.sql"

echo ""
echo "=== 3. Execute SQL ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -f /tmp/seed-official-skills.sql 2>&1"

echo ""
echo "=== 4. Verify official skills ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT name, display_name, category, layer, rating, ai_priority FROM skills WHERE metadata::text LIKE '%officialSkill%' ORDER BY rating DESC;\""

echo ""
echo "=== 5. Total skills count ==="
$SSH "docker exec agentrix-postgres psql -U agentrix -d paymind -c \"SELECT status, COUNT(*) FROM skills GROUP BY status;\""
