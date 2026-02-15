#!/bin/bash
psql -U agentrix -d paymind -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE '%referral%' OR tablename LIKE '%split%' OR tablename LIKE '%task%' OR tablename LIKE '%budget%') ORDER BY tablename;"
