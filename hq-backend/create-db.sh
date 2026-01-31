#!/bin/bash
# 创建 HQ 数据库

echo "Creating HQ database..."
PGPASSWORD=agentrix_secure_2024 psql -h localhost -U postgres -c "CREATE DATABASE hq_database;" 2>/dev/null || echo "Database may already exist"
echo "Done"
