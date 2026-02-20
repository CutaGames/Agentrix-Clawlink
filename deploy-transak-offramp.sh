#!/bin/bash
set -e

BACKEND_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "backend|agentrix-backend" | head -1)
echo "Backend container: $BACKEND_CONTAINER"

docker cp /tmp/transak-provider.service.ts ${BACKEND_CONTAINER}:/app/src/modules/payment/transak-provider.service.ts
docker cp /tmp/payment.controller.ts ${BACKEND_CONTAINER}:/app/src/modules/payment/payment.controller.ts
docker cp /tmp/migration2.ts ${BACKEND_CONTAINER}:/app/src/migrations/1776700000002-AddMetadataToRiskAssessments.ts
echo "Source files copied to container"

# Rebuild inside container
docker exec ${BACKEND_CONTAINER} sh -c "cd /app && npm run build 2>&1 | tail -5"
echo "Backend rebuilt"

# Also rebuild the container image if a rebuild script exists
if [ -f /home/ubuntu/rebuild-backend.sh ]; then
  bash /home/ubuntu/rebuild-backend.sh
fi

echo "Deploy complete"
