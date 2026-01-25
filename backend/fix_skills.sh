export PGPASSWORD=agentrix_secure_2024
psql -h localhost -U agentrix -d paymind -c 'ALTER TABLE skills ADD COLUMN "ratingCount" integer NOT NULL DEFAULT 0'
