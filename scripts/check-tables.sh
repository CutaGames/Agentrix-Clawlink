#!/bin/bash
# Check referral and commerce tables
PGPASSWORD=$DB_PASSWORD psql -h postgres -U $DB_USERNAME -d $DB_DATABASE -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE '%referral%' OR tablename LIKE '%commerce%' OR tablename LIKE '%split%' OR tablename LIKE '%task%') ORDER BY tablename;"
