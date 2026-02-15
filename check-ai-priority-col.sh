#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"
PSQL="docker exec agentrix-postgres psql -U agentrix -d paymind"

echo "=== Check ai_priority column type ==="
$SSH "$PSQL -c \"SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='skills' AND column_name='ai_priority';\""

echo ""
echo "=== Check sample values ==="
$SSH "$PSQL -c \"SELECT DISTINCT ai_priority FROM skills LIMIT 5;\""

echo ""
echo "=== Check if name unique constraint exists ==="
$SSH "$PSQL -c \"SELECT name, COUNT(*) FROM skills GROUP BY name HAVING COUNT(*) > 1 LIMIT 5;\""
