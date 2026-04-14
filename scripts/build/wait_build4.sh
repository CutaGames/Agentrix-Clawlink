#!/bin/bash
SERVER="ubuntu@57.182.89.146"
KEY="/home/arthur/.ssh/agentrix-tokyo.pem"

ssh -i $KEY -o StrictHostKeyChecking=no $SERVER 'while pgrep -f "docker buildx build.*frontend" > /dev/null 2>&1; do sleep 10; done; echo BUILD_DONE; tail -5 /tmp/fe_build4.log; echo ---; docker images agentrix-frontend'
