#!/bin/bash
# ===========================================
# Agentrix Data Migration: Tencent -> AWS RDS
# ===========================================

# 1. Configuration
TENCENT_IP="129.226.152.88"
TENCENT_USER="root"
DB_NAME="agentrix" # 请确认腾讯云上的数据库名

AWS_RDS_HOST="your-rds-endpoint.aws.com"
AWS_RDS_USER="agentrix"
AWS_RDS_DB="agentrix"

echo "开始从腾讯云导出数据..."
ssh $TENCENT_USER@$TENCENT_IP "pg_dump -U postgres -C $DB_NAME" > backup.sql

echo "数据导出完成，准备导入到 AWS RDS..."
# 注意：导入前请确保已经在 AWS RDS 创建了同名数据库或修改脚本
# psql -h $AWS_RDS_HOST -U $AWS_RDS_USER -d $AWS_RDS_DB < backup.sql

echo "迁移完成！"
