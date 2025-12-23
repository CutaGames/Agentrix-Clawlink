-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fix missing marketplace_assets table
CREATE TABLE IF NOT EXISTS "marketplace_assets" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "type" character varying NOT NULL,
    "name" character varying NOT NULL,
    "symbol" character varying,
    "chain" character varying,
    "address" character varying,
    "pair" character varying,
    "source" character varying,
    "externalId" character varying,
    "imageUrl" character varying,
    "priceUsd" numeric(24,8),
    "liquidityUsd" numeric(24,4),
    "volume24hUsd" numeric(24,4),
    "change24hPercent" numeric(10,4),
    "status" character varying NOT NULL DEFAULT 'active',
    "featured" boolean NOT NULL DEFAULT false,
    "metadata" jsonb,
    "lastIngestedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_marketplace_assets" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_marketplace_assets_type_chain_symbol" ON "marketplace_assets" ("type", "chain", "symbol");
CREATE INDEX IF NOT EXISTS "IDX_marketplace_assets_type_chain_address" ON "marketplace_assets" ("type", "chain", "address");

-- Ensure products table exists and has correct columns
CREATE TABLE IF NOT EXISTS "products" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "merchantId" uuid NOT NULL,
    "name" character varying NOT NULL,
    "description" text,
    "price" numeric(15,2) NOT NULL,
    "stock" integer NOT NULL DEFAULT 0,
    "category" character varying NOT NULL,
    "commissionRate" numeric(5,2),
    "productType" character varying(50) NOT NULL DEFAULT 'physical',
    "fixedCommissionRate" numeric(5,4),
    "allowCommissionAdjustment" boolean NOT NULL DEFAULT false,
    "minCommissionRate" numeric(5,4),
    "maxCommissionRate" numeric(5,4),
    "status" character varying NOT NULL DEFAULT 'active',
    "syncSource" character varying(50),
    "externalId" character varying(255),
    "metadata" jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_products" PRIMARY KEY ("id")
);

-- Create Enums for wallet_connections
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_connections_wallettype_enum') THEN
        CREATE TYPE "wallet_connections_wallettype_enum" AS ENUM('metamask', 'walletconnect', 'phantom', 'okx');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_connections_chain_enum') THEN
        CREATE TYPE "wallet_connections_chain_enum" AS ENUM('evm', 'solana');
    END IF;
END $$;

-- Create wallet_connections table
CREATE TABLE IF NOT EXISTS "wallet_connections" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "walletType" "wallet_connections_wallettype_enum" NOT NULL,
    "walletAddress" character varying NOT NULL,
    "chain" "wallet_connections_chain_enum" NOT NULL,
    "chainId" character varying,
    "isDefault" boolean NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "lastUsedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_wallet_connections" PRIMARY KEY ("id"),
    CONSTRAINT "FK_wallet_connections_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wallet_connections_address" ON "wallet_connections" (LOWER("walletAddress"));
