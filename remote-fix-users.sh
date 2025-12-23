#!/bin/bash
export PGPASSWORD=agentrix_secure_2024
psql -h localhost -U agentrix -d paymind <<EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "paymindId" character varying,
    "roles" jsonb DEFAULT '["user"]'::jsonb,
    "email" character varying,
    "passwordHash" character varying,
    "googleId" character varying,
    "kycLevel" character varying DEFAULT 'none',
    "kycStatus" character varying DEFAULT 'none',
    "avatarUrl" character varying,
    "nickname" character varying,
    "bio" text,
    "metadata" jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_users" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_users_email" UNIQUE ("email"),
    CONSTRAINT "UQ_users_paymindId" UNIQUE ("paymindId")
);

-- Insert a default merchant user for seeding
INSERT INTO "users" ("email", "paymindId", "roles", "nickname")
VALUES ('merchant@agentrix.test', 'merchant_001', '["merchant", "user"]'::jsonb, 'Default Merchant')
ON CONFLICT ("email") DO NOTHING;
EOF
