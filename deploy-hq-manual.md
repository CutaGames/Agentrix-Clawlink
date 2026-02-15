# HQ 分步部署脚本 - 手动执行

## 步骤 1: 测试SSH连接
wsl ssh -T -i ~/agentrix.pem ubuntu@57.182.89.146 "echo 'SSH连接成功'; pwd"

## 步骤 2: 同步 Backend (需要约2-3分钟)
wsl rsync -avz --delete --exclude 'node_modules' --exclude 'dist' --exclude '.env' --exclude '.git' -e "ssh -i $HOME/agentrix.pem -o StrictHostKeyChecking=no -o ServerAliveInterval=60" /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-backend/ ubuntu@57.182.89.146:/home/ubuntu/Agentrix-independent-HQ/hq-backend/

## 步骤 3: 同步 Console (需要约2-3分钟)
wsl rsync -avz --delete --exclude 'node_modules' --exclude '.next' --exclude '.env' --exclude '.git' -e "ssh -i $HOME/agentrix.pem -o StrictHostKeyChecking=no -o ServerAliveInterval=60" /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-console/ ubuntu@57.182.89.146:/home/ubuntu/Agentrix-independent-HQ/hq-console/

## 步骤 4: Backend - 安装依赖
wsl ssh -T -i ~/agentrix.pem ubuntu@57.182.89.146 "cd /home/ubuntu/Agentrix-independent-HQ/hq-backend && npm install 2>&1"

## 步骤 5: Backend - 运行迁移
wsl ssh -T -i ~/agentrix.pem ubuntu@57.182.89.146 "cd /home/ubuntu/Agentrix-independent-HQ/hq-backend && npm run migration:run 2>&1"

## 步骤 6: Backend - 构建
wsl ssh -T -i ~/agentrix.pem ubuntu@57.182.89.146 "cd /home/ubuntu/Agentrix-independent-HQ/hq-backend && npm run build 2>&1"

## 步骤 7: Console - 安装依赖
wsl ssh -T -i ~/agentrix.pem ubuntu@57.182.89.146 "cd /home/ubuntu/Agentrix-independent-HQ/hq-console && npm install 2>&1"

## 步骤 8: Console - 构建  
wsl ssh -T -i ~/agentrix.pem ubuntu@57.182.89.146 "cd /home/ubuntu/Agentrix-independent-HQ/hq-console && npm run build 2>&1"

## 步骤 9: 重启PM2服务
wsl ssh -T -i ~/agentrix.pem ubuntu@57.182.89.146 "pm2 restart hq-backend --update-env && pm2 restart hq-console && pm2 save"

## 步骤 10: 验证部署
wsl ssh -T -i ~/agentrix.pem ubuntu@57.182.89.146 "pm2 status && sleep 3 && curl -s http://localhost:3005/api/health"
