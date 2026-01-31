@echo off
wsl bash -c "cp /mnt/c/Users/15279/Desktop/agentrix-us.pem ~/key.pem && chmod 600 ~/key.pem && ssh -i ~/key.pem -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@57.182.89.146 'docker ps'"
